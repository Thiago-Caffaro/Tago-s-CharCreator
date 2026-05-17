import base64
import logging
import httpx
from typing import Optional

from ..config import settings

logger = logging.getLogger(__name__)

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"

# Only these Pro/Ultra models accept (and need) modalities:["image"] in chat completions.
# Schnell, Dev, and other image-only models silently reject that field with a 400.
MODALITIES_MODELS: set[str] = {
    "black-forest-labs/flux.2-pro",
    "black-forest-labs/flux.2-pro-ultra",
    "black-forest-labs/flux-1.1-pro",
    "black-forest-labs/flux-1.1-pro-ultra",
}


def generate_image(
    prompt: str,
    model: str,
    width: int = 1024,
    height: int = 1024,
    negative_prompt: str = "",
    seed: Optional[int] = None,
    guidance_scale: Optional[float] = None,
    steps: Optional[int] = None,
    image_url: Optional[str] = None,  # reference image (base64 data URI)
    n: int = 1,
) -> bytes:
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }

    # OpenRouter FLUX has no native negative_prompt field — fold it into prompt
    full_prompt = prompt
    if negative_prompt:
        full_prompt = f"{prompt}\n\nAvoid in the image: {negative_prompt}"

    # Build message content — support reference image if provided
    if image_url:
        content: object = [
            {"type": "image_url", "image_url": {"url": image_url}},
            {"type": "text", "text": full_prompt},
        ]
    else:
        content = full_prompt

    body: dict = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
    }

    # Pro/Ultra models require modalities:["image"]; Schnell/Dev are image-only and reject it
    use_modalities = model in MODALITIES_MODELS
    if use_modalities:
        body["modalities"] = ["image"]

    if seed is not None:
        body["seed"] = seed

    logger.info("OpenRouter request: model=%r modalities=%s", model, use_modalities)

    with httpx.Client(timeout=120.0) as client:
        response = client.post(OPENROUTER_CHAT_URL, json=body, headers=headers)

        # Safety net: if we sent modalities and got 400, retry without it
        if response.status_code == 400 and use_modalities:
            logger.warning(
                "OpenRouter 400 with modalities for %r — retrying without. Body: %s",
                model, response.text[:300],
            )
            body.pop("modalities")
            response = client.post(OPENROUTER_CHAT_URL, json=body, headers=headers)

    if not response.is_success:
        logger.error(
            "OpenRouter %s error for model %r. Body: %s",
            response.status_code, model, response.text[:800],
        )
    response.raise_for_status()
    data = response.json()

    message = data["choices"][0]["message"]
    logger.info("OpenRouter response message keys: %s", list(message.keys()))
    logger.info("OpenRouter response snippet: %s", str(data)[:600])

    def _decode_data_url(url: str) -> bytes:
        """Decode a base64 data URL like 'data:image/png;base64,<b64>'."""
        return base64.b64decode(url.split(",", 1)[1])

    def _fetch_url(url: str) -> bytes:
        with httpx.Client(timeout=60.0) as dl:
            r = dl.get(url)
            r.raise_for_status()
            return r.content

    def _handle_image_value(val: object) -> bytes | None:
        """Handle a single image entry — may be a string or a dict."""
        if isinstance(val, str):
            if val.startswith("data:image"):
                return _decode_data_url(val)
            if val.startswith("http"):
                return _fetch_url(val)
        if isinstance(val, dict):
            # {"b64_json": "..."} — raw base64, no header
            if "b64_json" in val:
                return base64.b64decode(val["b64_json"])
            # {"url": "data:image/..." | "https://..."} — direct url key
            direct_url = val.get("url")
            if isinstance(direct_url, str):
                if direct_url.startswith("data:image"):
                    return _decode_data_url(direct_url)
                if direct_url.startswith("http"):
                    return _fetch_url(direct_url)
            # {"type": "image_url", "image_url": {"url": "..."}} — nested dict (OpenRouter format)
            nested = val.get("image_url")
            if isinstance(nested, dict):
                nested_url = nested.get("url", "")
                if nested_url.startswith("data:image"):
                    return _decode_data_url(nested_url)
                if nested_url.startswith("http"):
                    return _fetch_url(nested_url)
        return None

    # Primary: message.images[] — each entry may be a string or dict
    images = message.get("images") or []
    for img_entry in images:
        result = _handle_image_value(img_entry)
        if result:
            return result

    # Fallback: content as data URL string
    content_val = message.get("content", "")
    if isinstance(content_val, str):
        result = _handle_image_value(content_val)
        if result:
            return result

    # Fallback: content as list of blocks
    if isinstance(content_val, list):
        for block in content_val:
            btype = block.get("type", "")
            if btype == "image_url":
                result = _handle_image_value(block.get("image_url", {}).get("url", ""))
                if result:
                    return result
            elif btype == "image":
                # {"type": "image", "source": {"type": "base64", "data": "..."}}
                src = block.get("source", {})
                if src.get("type") == "base64":
                    return base64.b64decode(src["data"])
                if src.get("type") == "url":
                    return _fetch_url(src["url"])
                result = _handle_image_value(block.get("image_url", ""))
                if result:
                    return result

    raise ValueError(
        f"Could not parse image from OpenRouter response. "
        f"Message keys: {list(message.keys())}. "
        f"Snippet: {str(data)[:600]}"
    )
