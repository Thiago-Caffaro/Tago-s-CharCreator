import time
import httpx
from typing import Optional

from ..config import settings

KIE_BASE = "https://api.kie.ai/api/v1"

# Map from common aspect ratio strings to Kie.ai accepted values
ASPECT_RATIO_MAP = {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
    "4:3": "4:3",
    "3:4": "3:4",
    "21:9": "21:9",
}

# Models that use the GPT-4o image endpoint
GPT4O_MODELS = {"gpt4o-image"}

# Models that use the FLUX Kontext endpoint
FLUX_MODELS = {
    "flux-kontext-pro",
    "flux-kontext-max",
    "flux-2-pro",
    "flux-2-flex",
    "flux-2-dev",
}


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.kie_ai_api_key}",
        "Content-Type": "application/json",
    }


def generate_image(
    prompt: str,
    model: str,
    aspect_ratio: str = "1:1",
    safety_tolerance: int = 6,
    input_image_url: Optional[str] = None,
    enable_translation: bool = True,
    poll_interval_start: float = 2.0,
    poll_max_attempts: int = 60,
) -> bytes:
    kie_aspect = ASPECT_RATIO_MAP.get(aspect_ratio, "1:1")

    with httpx.Client(timeout=30.0) as client:
        if model in GPT4O_MODELS:
            body: dict = {
                "prompt": prompt,
                "size": kie_aspect,
                "nVariants": 1,
                "isEnhance": False,
                "enableFallback": True,
            }
            if input_image_url:
                body["filesUrl"] = [input_image_url]

            resp = client.post(f"{KIE_BASE}/gpt4o-image/generate", json=body, headers=_headers())
        else:
            body = {
                "prompt": prompt,
                "model": model,
                "aspectRatio": kie_aspect,
                "outputFormat": "png",
                "safetyTolerance": safety_tolerance,
                "enableTranslation": enable_translation,
            }
            if input_image_url:
                body["inputImage"] = input_image_url

            resp = client.post(f"{KIE_BASE}/flux/kontext/generate", json=body, headers=_headers())

        resp.raise_for_status()
        task_id = resp.json()["data"]["taskId"]

    # Poll for completion
    delay = poll_interval_start
    with httpx.Client(timeout=30.0) as client:
        for _ in range(poll_max_attempts):
            time.sleep(delay)
            delay = min(delay * 1.5, 30.0)

            poll_resp = client.get(
                f"{KIE_BASE}/jobs/recordInfo",
                params={"taskId": task_id},
                headers=_headers(),
            )
            poll_resp.raise_for_status()
            poll_data = poll_resp.json()["data"]
            state = poll_data.get("state", "")

            if state == "success":
                img_url = poll_data["resultJson"]["images"][0]["url"]
                img_resp = client.get(img_url, timeout=60.0)
                img_resp.raise_for_status()
                return img_resp.content

            if state == "fail":
                fail_msg = poll_data.get("failMsg", "Kie.ai generation failed")
                raise ValueError(f"Kie.ai job failed: {fail_msg}")

    raise TimeoutError(f"Kie.ai job {task_id!r} did not complete within polling limit")


def get_credit_balance() -> int:
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(f"{KIE_BASE}/chat/credit", headers=_headers())
        resp.raise_for_status()
        return int(resp.json().get("data", 0))
