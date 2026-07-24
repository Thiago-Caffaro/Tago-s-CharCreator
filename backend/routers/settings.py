from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import httpx

from ..config import settings, persist_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsRead(BaseModel):
    api_key_masked: str
    default_model: str
    preferred_provider: str
    max_tokens: int
    temperature: float
    top_p: float
    field_max_tokens: dict


class SettingsUpdate(BaseModel):
    openrouter_api_key: Optional[str] = None
    default_model: Optional[str] = None
    preferred_provider: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    field_max_tokens: Optional[dict] = None


def _mask_key(key: str) -> str:
    if not key or len(key) < 12:
        return "não configurada"
    return key[:8] + "***" + key[-4:]


@router.get("", response_model=SettingsRead)
def get_settings():
    return SettingsRead(
        api_key_masked=_mask_key(settings.openrouter_api_key),
        default_model=settings.default_model,
        preferred_provider=settings.preferred_provider,
        max_tokens=settings.max_tokens,
        temperature=settings.temperature,
        top_p=settings.top_p,
        field_max_tokens=settings.field_max_tokens,
    )


@router.put("")
def update_settings(data: SettingsUpdate):
    import json as _json
    if data.openrouter_api_key is not None:
        settings.openrouter_api_key = data.openrouter_api_key
    if data.default_model is not None:
        settings.default_model = data.default_model
    if data.preferred_provider is not None:
        settings.preferred_provider = data.preferred_provider
    if data.max_tokens is not None:
        settings.max_tokens = data.max_tokens
    if data.temperature is not None:
        settings.temperature = data.temperature
    if data.top_p is not None:
        settings.top_p = data.top_p
    if data.field_max_tokens is not None:
        settings.field_max_tokens_json = _json.dumps(data.field_max_tokens)

    persist_settings()
    return {"ok": True}


@router.get("/providers")
def list_providers(model: str = ""):
    """Returns providers available for a given model on OpenRouter."""
    try:
        headers = {}
        if settings.openrouter_api_key:
            headers["Authorization"] = f"Bearer {settings.openrouter_api_key}"
        with httpx.Client(timeout=10) as client:
            # OpenRouter exposes per-model endpoint info at /v1/models/<author>/<slug>
            if model:
                r = client.get(
                    f"https://openrouter.ai/api/v1/models/{model}",
                    headers=headers,
                )
                if r.status_code == 200:
                    data = r.json()
                    # providers list may be nested under endpoint data
                    providers = data.get("providers", [])
                    if providers:
                        return {"providers": [{"id": p, "label": p} for p in providers]}
    except Exception:
        pass
    # Fallback: return the well-known OpenRouter provider list
    fallback = [
        "Anthropic", "OpenAI", "Azure", "Google", "Google AI Studio",
        "Amazon Bedrock", "Groq", "SambaNova", "Mistral", "Together",
        "DeepInfra", "Fireworks", "Novita", "Hyperbolic", "Featherless",
        "Lepton", "xAI", "Cohere", "Perplexity", "Recursal",
    ]
    return {"providers": [{"id": p, "label": p} for p in fallback]}


@router.get("/models")
def list_models():
    """Busca modelos disponíveis no OpenRouter."""
    try:
        headers = {}
        if settings.openrouter_api_key:
            headers["Authorization"] = f"Bearer {settings.openrouter_api_key}"
        with httpx.Client(timeout=10) as client:
            r = client.get("https://openrouter.ai/api/v1/models", headers=headers)
            r.raise_for_status()
            data = r.json()
            models = [
                {"id": m["id"], "name": m.get("name", m["id"])}
                for m in data.get("data", [])
            ]
            return {"models": models}
    except Exception:
        return {"models": []}
