from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
import httpx
from sqlmodel import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_session
from ..models.user import User
from ..services.security import encrypt_secret
from ..services.user_settings import get_or_create_user_settings, settings_dict
from ..services.prompt_assembler import FIELD_DESIRED_TOKENS

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsRead(BaseModel):
    api_key_masked: str
    default_model: str
    preferred_provider: str
    max_tokens: int
    temperature: float
    top_p: float
    field_max_tokens: dict
    include_reasoning: bool
    reasoning_effort: str
    # Read-only author guidance, not a user-editable setting — see
    # prompt_assembler.FIELD_DESIRED_TOKENS for why it's separate from the
    # field_max_tokens ceiling above.
    field_desired_tokens: dict


class SettingsUpdate(BaseModel):
    openrouter_api_key: Optional[str] = None
    default_model: Optional[str] = None
    preferred_provider: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    field_max_tokens: Optional[dict] = None
    include_reasoning: Optional[bool] = None
    reasoning_effort: Optional[str] = None


def _mask_key(key: str) -> str:
    if not key or len(key) < 12:
        return "não configurada"
    return key[:8] + "***" + key[-4:]


@router.get("", response_model=SettingsRead)
def get_settings(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    row = get_or_create_user_settings(session, user.id)
    values = settings_dict(row)
    return SettingsRead(
        api_key_masked=_mask_key(values["openrouter_api_key"]),
        default_model=values["default_model"],
        preferred_provider=values["preferred_provider"],
        max_tokens=values["max_tokens"],
        temperature=values["temperature"],
        top_p=values["top_p"],
        field_max_tokens=values["field_max_tokens"],
        include_reasoning=values["include_reasoning"],
        reasoning_effort=values["reasoning_effort"],
        field_desired_tokens={k: list(v) for k, v in FIELD_DESIRED_TOKENS.items()},
    )


@router.put("")
def update_settings(data: SettingsUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    import json as _json
    row = get_or_create_user_settings(session, user.id)
    if data.openrouter_api_key is not None:
        row.api_key_encrypted = encrypt_secret(data.openrouter_api_key)
    if data.default_model is not None:
        row.default_model = data.default_model
    if data.preferred_provider is not None:
        row.preferred_provider = data.preferred_provider
    if data.max_tokens is not None:
        row.max_tokens = data.max_tokens
    if data.temperature is not None:
        row.temperature = data.temperature
    if data.top_p is not None:
        row.top_p = data.top_p
    if data.field_max_tokens is not None:
        row.field_max_tokens_json = _json.dumps(data.field_max_tokens)
    if data.include_reasoning is not None:
        row.include_reasoning = data.include_reasoning
    if data.reasoning_effort is not None:
        row.reasoning_effort = data.reasoning_effort
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"ok": True}


@router.get("/providers")
def list_providers(model: str = "", user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Returns providers available for a given model on OpenRouter."""
    try:
        headers = {}
        api_key = settings_dict(get_or_create_user_settings(session, user.id))["openrouter_api_key"]
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
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
def list_models(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Busca modelos disponíveis no OpenRouter."""
    try:
        headers = {}
        api_key = settings_dict(get_or_create_user_settings(session, user.id))["openrouter_api_key"]
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        with httpx.Client(timeout=10) as client:
            r = client.get("https://openrouter.ai/api/v1/models", headers=headers)
            r.raise_for_status()
            data = r.json()
            models = [
                {
                    "id": m["id"],
                    "name": m.get("name", m["id"]),
                    "supports_reasoning": "reasoning" in (m.get("supported_parameters") or []),
                }
                for m in data.get("data", [])
            ]
            return {"models": models}
    except Exception:
        return {"models": []}
