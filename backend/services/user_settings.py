import json

from sqlmodel import Session, select

from ..config import settings as deployment_settings
from ..models.user import UserSettings
from .security import decrypt_secret


def default_field_limits() -> str:
    return deployment_settings.field_max_tokens_json


def get_or_create_user_settings(session: Session, user_id: int) -> UserSettings:
    current = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    if current:
        return current
    current = UserSettings(
        user_id=user_id,
        default_model=deployment_settings.default_model,
        preferred_provider=deployment_settings.preferred_provider,
        max_tokens=deployment_settings.max_tokens,
        temperature=deployment_settings.temperature,
        top_p=deployment_settings.top_p,
        repetition_penalty=deployment_settings.repetition_penalty,
        include_reasoning=deployment_settings.include_reasoning,
        reasoning_effort=deployment_settings.reasoning_effort,
        field_max_tokens_json=default_field_limits(),
    )
    session.add(current)
    session.flush()
    return current


def settings_dict(value: UserSettings) -> dict:
    try:
        field_limits = json.loads(value.field_max_tokens_json)
    except Exception:
        field_limits = {}
    return {
        "openrouter_api_key": decrypt_secret(value.api_key_encrypted),
        "default_model": value.default_model,
        "preferred_provider": value.preferred_provider,
        "max_tokens": value.max_tokens,
        "temperature": value.temperature,
        "top_p": value.top_p,
        "repetition_penalty": value.repetition_penalty,
        "include_reasoning": value.include_reasoning,
        "reasoning_effort": value.reasoning_effort,
        "field_max_tokens": field_limits,
    }
