import json as _json
import logging
import time
import httpx
from typing import Optional

from ..config import settings

logger = logging.getLogger(__name__)

KIE_BASE = "https://api.kie.ai/api/v1"

# Aspect ratio map
ASPECT_RATIO_MAP = {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
    "4:3": "4:3",
    "3:4": "3:4",
    "21:9": "21:9",
}

# Map frontend model IDs → Kie.ai model names (text-to-image variants)
FLUX2_MODEL_MAP = {
    "flux-2-pro":  "flux-2/pro-text-to-image",
    "flux-2-flex": "flux-2/flex-text-to-image",
}

# Map frontend model IDs → Kie.ai model names (image-to-image variants)
FLUX2_IMG2IMG_MAP = {
    "flux-2-pro":  "flux-2/pro-image-to-image",
    "flux-2-flex": "flux-2/flex-image-to-image",
}

KONTEXT_MODELS = {"flux-kontext-pro", "flux-kontext-max"}
GPT4O_MODELS   = {"gpt4o-image"}


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.kie_ai_api_key}",
        "Content-Type": "application/json",
    }


def _extract_image_url(result_json: dict, poll_data: dict) -> str:
    """
    Extract the image URL from whichever key Kie.ai used in this response.

    Known shapes observed so far:
      - {"images": [{"url": "..."}]}            — FLUX Kontext
      - {"output": ["https://..."]}              — FLUX 2 /jobs/createTask
      - {"url": "..."}                           — simple flat
      - {"imageUrl": "..."}                      — alternate flat
      - poll_data["resultImageUrl"]              — top-level fallback
    """
    # Shape 1: images array (Kontext)
    if "images" in result_json:
        return result_json["images"][0]["url"]

    # Shape 2: output list of URL strings (FLUX 2 createTask)
    if "output" in result_json:
        out = result_json["output"]
        if isinstance(out, list) and out:
            item = out[0]
            return item if isinstance(item, str) else item.get("url", item.get("imageUrl", ""))
        if isinstance(out, str):
            return out

    # Shape 3: flat url / imageUrl keys
    for key in ("url", "imageUrl", "image_url", "imageURL"):
        if key in result_json:
            return result_json[key]

    # Shape 4: top-level poll_data fields
    for key in ("resultImageUrl", "imageUrl", "url"):
        if key in poll_data and isinstance(poll_data[key], str):
            return poll_data[key]

    raise ValueError(
        f"Could not find image URL in Kie.ai result. "
        f"resultJson={str(result_json)[:400]}  poll_data_keys={list(poll_data.keys())}"
    )


def _submit_job(
    client: httpx.Client,
    model: str,
    prompt: str,
    kie_aspect: str,
    safety_tolerance: int,
    input_image_url: Optional[str],
    enable_translation: bool,
) -> str:
    """Submit a generation job and return the taskId."""

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
        endpoint = f"{KIE_BASE}/gpt4o-image/generate"

    elif model in FLUX2_MODEL_MAP:
        # FLUX 2 family — unified /jobs/createTask endpoint with nested input
        kie_model = (
            FLUX2_IMG2IMG_MAP[model] if input_image_url
            else FLUX2_MODEL_MAP[model]
        )
        inp: dict = {
            "prompt": prompt,
            "aspect_ratio": kie_aspect,
            "resolution": "1K",
            "nsfw_checker": False,   # disable content filter for adult content
        }
        if input_image_url:
            inp["image_url"] = input_image_url
        body = {"model": kie_model, "input": inp}
        endpoint = f"{KIE_BASE}/jobs/createTask"

    else:
        # FLUX Kontext (flux-kontext-pro / flux-kontext-max) — /flux/kontext/generate
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
        endpoint = f"{KIE_BASE}/flux/kontext/generate"

    logger.info("Kie.ai submit → %s  body=%s", endpoint, str(body)[:300])
    resp = client.post(endpoint, json=body, headers=_headers())

    if not resp.is_success:
        logger.error("Kie.ai submit HTTP %s: %s", resp.status_code, resp.text[:800])
    resp.raise_for_status()

    submit_json = resp.json()
    logger.info("Kie.ai submit response: %s", str(submit_json)[:600])

    data_block = submit_json.get("data")
    if not data_block:
        raise ValueError(
            f"Kie.ai submit returned no data. Full response: {str(submit_json)[:600]}"
        )
    return data_block["taskId"]


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
        task_id = _submit_job(
            client, model, prompt, kie_aspect,
            safety_tolerance, input_image_url, enable_translation,
        )
        logger.info("Kie.ai taskId: %s", task_id)

    # Poll for completion with exponential back-off
    delay = poll_interval_start
    with httpx.Client(timeout=30.0) as client:
        for attempt in range(poll_max_attempts):
            time.sleep(delay)
            delay = min(delay * 1.5, 30.0)

            poll_resp = client.get(
                f"{KIE_BASE}/jobs/recordInfo",
                params={"taskId": task_id},
                headers=_headers(),
            )
            if not poll_resp.is_success:
                logger.warning(
                    "Kie.ai poll HTTP %s: %s", poll_resp.status_code, poll_resp.text[:300]
                )
            poll_resp.raise_for_status()

            poll_json = poll_resp.json()
            poll_data = poll_json.get("data")

            # data may be null while the job is still being queued
            if poll_data is None:
                logger.info("Kie.ai attempt %d: data is null, still queuing", attempt)
                continue

            state = poll_data.get("state", "")
            logger.info("Kie.ai attempt %d: state=%s", attempt, state)

            if state == "success":
                result_json = poll_data.get("resultJson") or {}
                if isinstance(result_json, str):
                    result_json = _json.loads(result_json)
                logger.info("Kie.ai resultJson keys: %s  snippet: %s",
                            list(result_json.keys()) if isinstance(result_json, dict) else type(result_json),
                            str(result_json)[:400])

                img_url = _extract_image_url(result_json, poll_data)
                logger.info("Kie.ai success — downloading: %s", img_url[:80])
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
