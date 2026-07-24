from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
import json

from ..database import get_session
from ..config import settings, persist_settings
from ..models.generation_rule import GenerationRule
from ..models.field_preset import FieldPreset
from ..models.card_type_config import CardTypeConfig
from ..models.project_template import ProjectTemplate

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/export")
def export_config(session: Session = Depends(get_session)):
    """Export the entire app configuration as a single portable JSON bundle:
    global settings (never the API key), generation rules, field/voice presets,
    card types and project templates.

    Built-in rules and card types are left out — they're already re-created
    automatically on every install (see seed_default_data in main.py), so
    including them here would just produce duplicate/conflicting copies on
    import instead of a clean personal backup.
    """
    rules = session.exec(
        select(GenerationRule).where(GenerationRule.is_builtin == False)  # noqa: E712
    ).all()
    presets = session.exec(select(FieldPreset)).all()
    card_types = session.exec(
        select(CardTypeConfig).where(CardTypeConfig.is_builtin == False)  # noqa: E712
    ).all()
    templates = session.exec(select(ProjectTemplate)).all()

    payload = {
        "version": "1.0",
        "settings": {
            "default_model": settings.default_model,
            "preferred_provider": settings.preferred_provider,
            "max_tokens": settings.max_tokens,
            "temperature": settings.temperature,
            "top_p": settings.top_p,
            "field_max_tokens": settings.field_max_tokens,
        },
        "rules": [
            {
                "name": r.name,
                "content": r.content,
                "scope": r.scope.value,
                "target_field": r.target_field,
                "is_active": r.is_active,
                "order_index": r.order_index,
            }
            for r in rules
        ],
        "presets": [
            {
                "name": p.name,
                "target_field": p.target_field,
                "system_prompt_override": p.system_prompt_override,
                "is_default": p.is_default,
                "is_voice": p.is_voice,
            }
            for p in presets
        ],
        "card_types": [
            {"slug": c.slug, "label": c.label, "color": c.color, "order_index": c.order_index}
            for c in card_types
        ],
        "templates": [
            {"name": t.name, "cards_json": t.cards_json}
            for t in templates
        ],
    }
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": 'attachment; filename="tagos_charcreator_config.json"'},
    )


@router.post("/import")
def import_config(data: dict, session: Session = Depends(get_session)):
    """Import a bundle exported via /export.

    Settings are applied in place (same semantics as PUT /api/settings — the
    API key is never touched, whether or not the imported file has one).
    Rules/presets/templates always create new rows, matching the existing
    presets import behavior. Card types are skipped when their slug already
    exists, since the slug column is unique.
    """
    counts = {"rules": 0, "presets": 0, "card_types": 0, "templates": 0}

    s = data.get("settings")
    if isinstance(s, dict):
        if "default_model" in s:
            settings.default_model = s["default_model"]
        if "preferred_provider" in s:
            settings.preferred_provider = s["preferred_provider"]
        if "max_tokens" in s:
            settings.max_tokens = s["max_tokens"]
        if "temperature" in s:
            settings.temperature = s["temperature"]
        if "top_p" in s:
            settings.top_p = s["top_p"]
        if "field_max_tokens" in s:
            settings.field_max_tokens_json = json.dumps(s["field_max_tokens"])
        persist_settings()

    for r in data.get("rules", []):
        session.add(GenerationRule(
            name=r.get("name", "Imported Rule"),
            content=r.get("content", ""),
            scope=r.get("scope", "global"),
            target_field=r.get("target_field"),
            is_active=r.get("is_active", True),
            order_index=r.get("order_index", 0),
        ))
        counts["rules"] += 1

    for p in data.get("presets", []):
        session.add(FieldPreset(
            name=p.get("name", "Imported Preset"),
            target_field=p.get("target_field", "description"),
            system_prompt_override=p.get("system_prompt_override", ""),
            is_default=p.get("is_default", False),
            is_voice=p.get("is_voice", False),
        ))
        counts["presets"] += 1

    existing_slugs = {c.slug for c in session.exec(select(CardTypeConfig)).all()}
    for c in data.get("card_types", []):
        slug = c.get("slug", "")
        if not slug or slug in existing_slugs:
            continue
        session.add(CardTypeConfig(
            slug=slug,
            label=c.get("label", slug),
            color=c.get("color", "#888888"),
            order_index=c.get("order_index", 0),
            is_builtin=False,
        ))
        existing_slugs.add(slug)
        counts["card_types"] += 1

    for t in data.get("templates", []):
        session.add(ProjectTemplate(
            name=t.get("name", "Imported Template"),
            cards_json=t.get("cards_json", "[]"),
        ))
        counts["templates"] += 1

    session.commit()
    return {"imported": counts}
