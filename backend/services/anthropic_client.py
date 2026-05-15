from openai import OpenAI
from ..config import settings

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    _client = OpenAI(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
    )
    return _client


def stream_message(system: str, user: str, max_tokens: int | None = None):
    """Stream a chat completion.

    max_tokens — per-call override. Falls back to settings.max_tokens.
    When generating long character card fields, pass a field-specific limit
    so GLM/smaller models are not starved by a large input eating the context.
    """
    client = get_client()

    # extra_body carries OpenRouter-specific + model-specific params
    extra_body: dict = {}

    # Disable reasoning tokens — they eat into the output budget on reasoning-
    # capable models (GLM-Z1, DeepSeek-R1, etc.) without helping text quality.
    if not settings.include_reasoning:
        extra_body["include_reasoning"] = False

    # Repetition penalty — prevents the model from self-truncating after
    # repetitive prose (very common in NSFW/narrative content).
    if settings.repetition_penalty != 1.0:
        extra_body["repetition_penalty"] = settings.repetition_penalty

    # Provider routing
    if settings.preferred_provider:
        extra_body["provider"] = {"only": [settings.preferred_provider]}

    kwargs: dict = {}
    if extra_body:
        kwargs["extra_body"] = extra_body

    stream = client.chat.completions.create(
        model=settings.default_model,
        max_tokens=max_tokens or settings.max_tokens,
        temperature=settings.temperature,
        top_p=settings.top_p,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        stream=True,
        **kwargs,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def count_tokens(system: str, user: str) -> int:
    # OpenRouter has no counting endpoint — simple character-based estimate
    total_chars = len(system) + len(user)
    return total_chars // 4
