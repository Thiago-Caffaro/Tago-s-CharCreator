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
