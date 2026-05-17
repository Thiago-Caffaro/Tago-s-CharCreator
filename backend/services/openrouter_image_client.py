import base64
import httpx
from typing import Optional

from ..config import settings

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"


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
        "modalities": ["image"],
    }

    if seed is not None:
        body["seed"] = seed

    with httpx.Client(timeout=120.0) as client:
        response = client.post(OPENROUTER_CHAT_URL, json=body, headers=headers)
        response.raise_for_status()
        data = response.json()

    message = data["choices"][0]["message"]

    # Primary: images[] array with base64 data URLs
    images = message.get("images") or []
    if images:
        data_url: str = images[0]
        b64 = data_url.split(",", 1)[1] if "," in data_url else data_url
        return base64.b64decode(b64)

    # Fallback: content as data URL string
    content_val = message.get("content", "")
    if isinstance(content_val, str) and content_val.startswith("data:image"):
        return base64.b64decode(content_val.split(",", 1)[1])

    # Fallback: content as list of image_url blocks
    if isinstance(content_val, list):
        for block in content_val:
            if block.get("type") == "image_url":
                url: str = block["image_url"]["url"]
                if url.startswith("data:image"):
                    return base64.b64decode(url.split(",", 1)[1])
                with httpx.Client(timeout=60.0) as dl:
                    img_resp = dl.get(url)
                    img_resp.raise_for_status()
                    return img_resp.content

    raise ValueError(
        f"Could not parse image from OpenRouter response. "
        f"Message keys: {list(message.keys())}. "
        f"Snippet: {str(data)[:400]}"
    )
