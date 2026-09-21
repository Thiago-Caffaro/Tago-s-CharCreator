from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional

from ..database import get_session
from ..auth import get_current_user
from ..models.user import User
from ..services.import_merge import preset_identity
from ..models.field_preset import FieldPreset, FieldPresetCreate, FieldPresetRead, FieldPresetUpdate

router = APIRouter(prefix="/api/presets", tags=["presets"])


@router.get("", response_model=List[FieldPresetRead])
def list_presets(field: Optional[str] = None, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    query = select(FieldPreset).where(FieldPreset.user_id == user.id)
    if field:
        query = query.where(FieldPreset.target_field == field)
    return session.exec(query.order_by(FieldPreset.created_at)).all()


@router.post("", response_model=FieldPresetRead, status_code=201)
def create_preset(data: FieldPresetCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    preset = FieldPreset(**data.model_dump(), user_id=user.id)
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset


# Static routes must come before /{preset_id} to avoid the path param swallowing them.

@router.get("/export")
def export_presets(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Export all presets as a portable JSON bundle."""
    presets = session.exec(select(FieldPreset).where(FieldPreset.user_id == user.id)).all()
    return {
        "version": "1.0",
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
    }


@router.post("/import")
def import_presets(data: dict, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Idempotent import: update equivalent presets and create only new identities."""
    counts = {"created": 0, "updated": 0, "ignored": 0, "errors": 0}
    existing = {
        preset_identity(p.model_dump()): p
        for p in session.exec(select(FieldPreset).where(FieldPreset.user_id == user.id)).all()
    }
    for p in data.get("presets", []):
        try:
            identity = preset_identity(p)
            target = existing.get(identity)
            if target:
                target.system_prompt_override = p.get("system_prompt_override", "")
                target.is_default = p.get("is_default", False)
                counts["updated"] += 1
            else:
                target = FieldPreset(name=identity[0], target_field=identity[1], is_voice=identity[2], user_id=user.id)
                target.system_prompt_override = p.get("system_prompt_override", "")
                target.is_default = p.get("is_default", False)
                existing[identity] = target
                counts["created"] += 1
            session.add(target)
        except Exception:
            counts["errors"] += 1
    session.commit()
    return {"imported": counts["created"] + counts["updated"], **counts}


@router.put("/{preset_id}", response_model=FieldPresetRead)
def update_preset(preset_id: int, data: FieldPresetUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    preset = session.exec(select(FieldPreset).where(FieldPreset.id == preset_id, FieldPreset.user_id == user.id)).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(preset, key, value)
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset


@router.delete("/{preset_id}", status_code=204)
def delete_preset(preset_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    preset = session.exec(select(FieldPreset).where(FieldPreset.id == preset_id, FieldPreset.user_id == user.id)).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    session.delete(preset)
    session.commit()
