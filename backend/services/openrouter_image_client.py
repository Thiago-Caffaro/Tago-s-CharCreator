import base64
import httpx
from typing import Optional

from ..config import settings

OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images/generations"


def generate_image(
    prompt: str,
    model: str,
    width: int = 1024,
    height: int = 1024,
    negative_prompt: str = "",
    seed: Optional[int] = None,
    guidance_scale: Optional[float] = None,
    steps: Optional[int] = None,
    image_url: Optional[str] = None,  # base64 data URI for reference image
    n: int = 1,
) -> bytes:
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }

    body: dict = {
        "model": model,
        "prompt": prompt,
        "n": n,
        "size": f"{width}x{height}",
    }

    if negative_prompt:
        body["negative_prompt"] = negative_prompt
    if seed is not None:
        body["seed"] = seed
    if guidance_scale is not None:
        body["guidance_scale"] = guidance_scale
    if steps is not None:
        body["steps"] = steps
    if image_url:
        body["image_url"] = image_url

    with httpx.Client(timeout=120.0) as client:
        response = client.post(OPENROUTER_IMAGES_URL, json=body, headers=headers)
        response.raise_for_status()
        data = response.json()

    image_data = data["data"][0]

    if "b64_json" in image_data and image_data["b64_json"]:
        return base64.b64decode(image_data["b64_json"])

    if "url" in image_data and image_data["url"]:
        with httpx.Client(timeout=60.0) as client:
            img_response = client.get(image_data["url"])
            img_response.raise_for_status()
            return img_response.content

    raise ValueError("OpenRouter image response contained neither b64_json nor url")
