import json
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from ..auth import get_current_user
from ..database import get_session
from ..models.card_type_config import CardTypeConfig
from ..models.field_preset import FieldPreset
from ..models.generation_rule import GenerationRule, RuleScope
from ..models.project_template import ProjectTemplate
from ..models.user import User
from ..services.import_merge import preset_identity, type_identity
from ..services.user_settings import get_or_create_user_settings, settings_dict

router = APIRouter(prefix="/api/config", tags=["config"])

@router.get("/export")
def export_config(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    values = settings_dict(get_or_create_user_settings(session, user.id))
    rules = session.exec(select(GenerationRule).where(GenerationRule.user_id == user.id, GenerationRule.is_builtin == False)).all()  # noqa: E712
    presets = session.exec(select(FieldPreset).where(FieldPreset.user_id == user.id)).all()
    card_types = session.exec(select(CardTypeConfig).where(CardTypeConfig.user_id == user.id)).all()
    templates = session.exec(select(ProjectTemplate).where(ProjectTemplate.user_id == user.id)).all()
    payload = {"version": "2.0", "settings": {k: values[k] for k in ("default_model", "preferred_provider", "max_tokens", "temperature", "top_p", "field_max_tokens", "include_reasoning", "reasoning_effort")}, "rules": [{"name": r.name, "content": r.content, "scope": r.scope.value, "target_field": r.target_field, "is_active": r.is_active, "order_index": r.order_index} for r in rules], "presets": [{"name": p.name, "target_field": p.target_field, "system_prompt_override": p.system_prompt_override, "is_default": p.is_default, "is_voice": p.is_voice} for p in presets], "card_types": [{"slug": c.slug, "label": c.label, "color": c.color, "order_index": c.order_index, "is_builtin": c.is_builtin} for c in card_types], "templates": [{"name": t.name, "cards_json": t.cards_json} for t in templates]}
    return JSONResponse(content=payload, headers={"Content-Disposition": 'attachment; filename="tagos_charcreator_config.json"'})

@router.post("/import")
def import_config(data: dict, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    counts = {section: {"created": 0, "updated": 0, "ignored": 0, "errors": 0} for section in ("rules", "presets", "card_types", "templates")}
    settings_row = get_or_create_user_settings(session, user.id)
    incoming = data.get("settings")
    if isinstance(incoming, dict):
        for key in ("default_model", "preferred_provider", "max_tokens", "temperature", "top_p", "include_reasoning", "reasoning_effort"):
            if key in incoming: setattr(settings_row, key, incoming[key])
        if "field_max_tokens" in incoming: settings_row.field_max_tokens_json = json.dumps(incoming["field_max_tokens"])
        session.add(settings_row)
    existing_rules = {r.name: r for r in session.exec(select(GenerationRule).where(GenerationRule.user_id == user.id)).all()}
    for item in data.get("rules", []):
        try:
            name = str(item.get("name", "Imported Rule")).strip(); target = existing_rules.get(name); key = "updated" if target else "created"
            target = target or GenerationRule(name=name, user_id=user.id); target.content = item.get("content", ""); target.scope = RuleScope(item.get("scope", "global")); target.target_field = item.get("target_field"); target.is_active = item.get("is_active", True); target.order_index = item.get("order_index", 0)
            session.add(target); existing_rules[name] = target; counts["rules"][key] += 1
        except Exception: counts["rules"]["errors"] += 1
    existing_presets = {preset_identity(p.model_dump()): p for p in session.exec(select(FieldPreset).where(FieldPreset.user_id == user.id)).all()}
    for item in data.get("presets", []):
        try:
            identity = preset_identity(item); target = existing_presets.get(identity); key = "updated" if target else "created"
            target = target or FieldPreset(name=identity[0], target_field=identity[1], is_voice=identity[2], user_id=user.id); target.system_prompt_override = item.get("system_prompt_override", ""); target.is_default = item.get("is_default", False)
            session.add(target); existing_presets[identity] = target; counts["presets"][key] += 1
        except Exception: counts["presets"]["errors"] += 1
    existing_types = {c.slug: c for c in session.exec(select(CardTypeConfig).where(CardTypeConfig.user_id == user.id)).all()}
    for item in data.get("card_types", []):
        try:
            slug = type_identity(item)
            if not slug: counts["card_types"]["ignored"] += 1; continue
            target = existing_types.get(slug); key = "updated" if target else "created"; target = target or CardTypeConfig(slug=slug, user_id=user.id, is_builtin=False)
            target.label = item.get("label", slug); target.color = item.get("color", "#888888"); target.order_index = item.get("order_index", 0)
            session.add(target); existing_types[slug] = target; counts["card_types"][key] += 1
        except Exception: counts["card_types"]["errors"] += 1
    existing_templates = {t.name: t for t in session.exec(select(ProjectTemplate).where(ProjectTemplate.user_id == user.id)).all()}
    for item in data.get("templates", []):
        try:
            name = str(item.get("name", "Imported Template")).strip(); target = existing_templates.get(name); key = "updated" if target else "created"; target = target or ProjectTemplate(name=name, user_id=user.id); target.cards_json = item.get("cards_json", "[]")
            session.add(target); existing_templates[name] = target; counts["templates"][key] += 1
        except Exception: counts["templates"]["errors"] += 1
    session.commit()
    return {"imported": counts}
