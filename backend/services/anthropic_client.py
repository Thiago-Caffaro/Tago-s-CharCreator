from openai import OpenAI
from ..config import settings
import re

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    _client = OpenAI(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
    )
    return _client


def stream_message(
    system: str, user: str, max_tokens: int | None = None,
    model: str | None = None, temperature: float | None = None, top_p: float | None = None,
):
    """Stream a chat completion, filtering out any <think>…</think> blocks.

    max_tokens, model, temperature, top_p — per-call overrides (e.g. a
    project's own generation settings). Each falls back to the matching
    global setting when not given.

    Some reasoning-capable models (GLM-Z1, DeepSeek-R1, QwQ, etc.) emit
    their internal chain-of-thought as <think>…</think> blocks in the
    content stream even when reasoning exclusion is requested.  We strip
    those blocks here so they never appear in the character-card fields.
    The filter is streaming-safe: it buffers just enough bytes to detect a
    tag that spans two chunks without holding back real content.
    """
    client = get_client()

    # ── OpenRouter / model params ────────────────────────────────────────
    extra_body: dict = {}

    if settings.include_reasoning:
        # OpenRouter unified reasoning param — models that don't support it
        # simply ignore the field, so this is safe to send unconditionally.
        extra_body["reasoning"] = {"effort": settings.reasoning_effort}
    else:
        # OpenRouter standard — hides reasoning from the response payload.
        # Also try effort=none which some providers honour to skip reasoning
        # token generation entirely (saves output budget).
        extra_body["reasoning"] = {"exclude": True, "effort": "none"}
        # Model-specific fallback (e.g. Anthropic extended-thinking flag)
        extra_body["include_reasoning"] = False

    if settings.repetition_penalty != 1.0:
        extra_body["repetition_penalty"] = settings.repetition_penalty

    if settings.preferred_provider:
        extra_body["provider"] = {"only": [settings.preferred_provider]}

    kwargs: dict = {}
    if extra_body:
        kwargs["extra_body"] = extra_body

    stream = client.chat.completions.create(
        model=model or settings.default_model,
        max_tokens=max_tokens or settings.max_tokens,
        temperature=temperature if temperature is not None else settings.temperature,
        top_p=top_p if top_p is not None else settings.top_p,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        stream=True,
        **kwargs,
    )

    yield from _filter_think_tags(stream)


# ── <think> tag streaming filter ─────────────────────────────────────────────
_OPEN  = "<think>"
_CLOSE = "</think>"
_KEEP  = len(_OPEN) - 1  # chars to keep in buffer when scanning for open tag


def _filter_think_tags(stream):
    """Yield only non-reasoning content, stripping <think>…</think> blocks.

    Works in a streaming context where a tag may be split across chunks:
    keeps the last _KEEP bytes in a lookahead buffer so we never emit
    a partial opening tag as real content.
    """
    buf = ""
    in_think = False

    for chunk in stream:
        # Some providers also put reasoning in a separate delta field;
        # skip those chunks entirely.
        delta = chunk.choices[0].delta
        raw = delta.content or ""
        # If the provider exposes reasoning separately, ignore it
        if hasattr(delta, "reasoning_content") and delta.reasoning_content:
            continue
        if not raw:
            continue

        buf += raw

        # Process as much of buf as we can decide about
        while True:
            if in_think:
                pos = buf.find(_CLOSE)
                if pos == -1:
                    # Haven't seen close tag yet — discard everything so far
                    # but keep a tail in case </think> spans the next chunk
                    keep = len(_CLOSE) - 1
                    buf = buf[-keep:] if len(buf) > keep else buf
                    break
                else:
                    in_think = False
                    buf = buf[pos + len(_CLOSE):]
                    # continue loop to process remainder
            else:
                pos = buf.find(_OPEN)
                if pos == -1:
                    # No open tag in sight — yield all but the lookahead tail
                    if len(buf) > _KEEP:
                        yield buf[:-_KEEP]
                        buf = buf[-_KEEP:]
                    break
                else:
                    # Yield everything before the open tag
                    if pos > 0:
                        yield buf[:pos]
                    in_think = True
                    buf = buf[pos + len(_OPEN):]
                    # continue loop to process remainder after <think>

    # Flush whatever is left in the buffer (only if not inside a think block)
    if buf and not in_think:
        yield buf


def count_tokens(system: str, user: str) -> int:
    # OpenRouter has no counting endpoint — simple character-based estimate
    total_chars = len(system) + len(user)
    return total_chars // 4


def complete_message(
    system: str,
    user: str,
    runtime: dict,
    max_tokens: int | None = None,
    model: str | None = None,
    temperature: float | None = None,
    top_p: float | None = None,
    user_id: int | None = None,
) -> tuple[str, dict]:
    """Server-owned completion used by persistent jobs.

    It consumes the entire provider stream even when no browser is connected and
    captures the final usage-only chunk requested via include_usage.
    """
    client = OpenAI(api_key=runtime["openrouter_api_key"], base_url=settings.openrouter_base_url)
    extra_body: dict = {}
    if runtime.get("include_reasoning"):
        extra_body["reasoning"] = {"effort": runtime.get("reasoning_effort", "medium")}
    else:
        extra_body["reasoning"] = {"exclude": True, "effort": "none"}
        extra_body["include_reasoning"] = False
    if runtime.get("repetition_penalty", 1.0) != 1.0:
        extra_body["repetition_penalty"] = runtime["repetition_penalty"]
    if runtime.get("preferred_provider"):
        extra_body["provider"] = {"only": [runtime["preferred_provider"]]}
    selected_model = model or runtime["default_model"]
    request_args = dict(
        model=selected_model,
        max_tokens=max_tokens or runtime["max_tokens"],
        temperature=temperature if temperature is not None else runtime["temperature"],
        top_p=top_p if top_p is not None else runtime["top_p"],
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        stream=True,
        stream_options={"include_usage": True},
        extra_body=extra_body,
    )
    if user_id is not None:
        request_args["user"] = str(user_id)
    stream = client.chat.completions.create(**request_args)
    pieces: list[str] = []
    usage = None
    for chunk in stream:
        if getattr(chunk, "usage", None) is not None:
            usage = chunk.usage
        choices = getattr(chunk, "choices", None) or []
        if choices:
            delta = choices[0].delta
            content = getattr(delta, "content", None)
            if content:
                pieces.append(content)
    text = "".join(pieces)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S | re.I).strip()
    prompt = getattr(usage, "prompt_tokens", None) if usage else None
    completion = getattr(usage, "completion_tokens", None) if usage else None
    actual = prompt is not None and completion is not None
    prompt = int(prompt if prompt is not None else count_tokens(system, user))
    completion = int(completion if completion is not None else max(0, len(text) // 4))
    return text, {
        "model": selected_model,
        "prompt_tokens": prompt,
        "completion_tokens": completion,
        "total_tokens": prompt + completion,
        "is_estimated": not actual,
    }
