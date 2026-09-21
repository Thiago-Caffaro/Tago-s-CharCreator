from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import re

from ..database import get_session
from ..auth import get_current_user
from ..models.user import User
from ..services.import_merge import normalize_slug
from ..models.card_type_config import (
    CardTypeConfig,
    CardTypeConfigCreate,
    CardTypeConfigRead,
    CardTypeConfigUpdate,
)

router = APIRouter(prefix="/api/card-types", tags=["card_types"])


@router.get("", response_model=List[CardTypeConfigRead])
def list_types(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(select(CardTypeConfig).where(CardTypeConfig.user_id == user.id).order_by(CardTypeConfig.order_index)).all()


@router.post("", response_model=CardTypeConfigRead, status_code=201)
def create_type(data: CardTypeConfigCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    slug = normalize_slug(data.slug)
    existing = session.exec(select(CardTypeConfig).where(CardTypeConfig.slug == slug, CardTypeConfig.user_id == user.id)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Slug já existe")
    ct = CardTypeConfig(**data.model_dump(exclude={"slug"}), slug=slug, is_builtin=False, user_id=user.id)
    session.add(ct)
    session.commit()
    session.refresh(ct)
    return ct


@router.put("/{type_id}", response_model=CardTypeConfigRead)
def update_type(type_id: int, data: CardTypeConfigUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    ct = session.exec(select(CardTypeConfig).where(CardTypeConfig.id == type_id, CardTypeConfig.user_id == user.id)).first()
    if not ct:
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(ct, key, value)
    session.add(ct)
    session.commit()
    session.refresh(ct)
    return ct


@router.delete("/{type_id}", status_code=204)
def delete_type(type_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    ct = session.exec(select(CardTypeConfig).where(CardTypeConfig.id == type_id, CardTypeConfig.user_id == user.id)).first()
    if not ct:
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    if ct.is_builtin:
        raise HTTPException(status_code=400, detail="Tipos nativos não podem ser deletados")
    session.delete(ct)
    session.commit()
