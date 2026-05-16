from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional

from ..database import get_session
from ..models.field_preset import FieldPreset, FieldPresetCreate, FieldPresetRead, FieldPresetUpdate

router = APIRouter(prefix="/api/presets", tags=["presets"])


@router.get("", response_model=List[FieldPresetRead])
def list_presets(field: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(FieldPreset)
    if field:
        query = query.where(FieldPreset.target_field == field)
    return session.exec(query.order_by(FieldPreset.created_at)).all()


@router.post("", response_model=FieldPresetRead, status_code=201)
def create_preset(data: FieldPresetCreate, session: Session = Depends(get_session)):
    preset = FieldPreset(**data.model_dump())
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset


# Static routes must come before /{preset_id} to avoid the path param swallowing them.

@router.get("/export")
def export_presets(session: Session = Depends(get_session)):
    """Export all presets as a portable JSON bundle."""
    presets = session.exec(select(FieldPreset)).all()
    return {
        "version": "1.0",
        "presets": [
            {
                "name": p.name,
                "target_field": p.target_field,
                "system_prompt_override": p.system_prompt_override,
                "is_default": p.is_default,
            }
            for p in presets
        ],
    }


@router.post("/import")
def import_presets(data: dict, session: Session = Depends(get_session)):
    """Import presets exported via /export. Always creates new records."""
    created = 0
    for p in data.get("presets", []):
        session.add(FieldPreset(
            name=p.get("name", "Imported Preset"),
            target_field=p.get("target_field", "description"),
            system_prompt_override=p.get("system_prompt_override", ""),
            is_default=p.get("is_default", False),
        ))
        created += 1
    session.commit()
    return {"imported": created}


@router.put("/{preset_id}", response_model=FieldPresetRead)
def update_preset(preset_id: int, data: FieldPresetUpdate, session: Session = Depends(get_session)):
    preset = session.get(FieldPreset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(preset, key, value)
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset


@router.delete("/{preset_id}", status_code=204)
def delete_preset(preset_id: int, session: Session = Depends(get_session)):
    preset = session.get(FieldPreset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    session.delete(preset)
    session.commit()
