from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional

from ..database import get_session
from ..auth import get_current_user
from ..models.user import User
from ..models.generation_rule import (
    GenerationRule,
    GenerationRuleCreate,
    GenerationRuleRead,
    GenerationRuleUpdate,
    ReorderItem,
)
from ..services.default_data import seed_default_rules

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("", response_model=List[GenerationRuleRead])
def list_rules(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(select(GenerationRule).where(GenerationRule.user_id == user.id).order_by(GenerationRule.order_index)).all()


@router.post("", response_model=GenerationRuleRead, status_code=201)
def create_rule(data: GenerationRuleCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rule = GenerationRule(**data.model_dump(), user_id=user.id)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.put("/{rule_id}", response_model=GenerationRuleRead)
def update_rule(rule_id: int, data: GenerationRuleUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rule = session.exec(select(GenerationRule).where(GenerationRule.id == rule_id, GenerationRule.user_id == user.id)).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=204)
def delete_rule(rule_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rule = session.exec(select(GenerationRule).where(GenerationRule.id == rule_id, GenerationRule.user_id == user.id)).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if rule.is_builtin:
        raise HTTPException(status_code=400, detail="Regras nativas não podem ser deletadas")
    session.delete(rule)
    session.commit()


@router.post("/reorder", status_code=204)
def reorder_rules(items: List[ReorderItem], user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    for item in items:
        rule = session.exec(select(GenerationRule).where(GenerationRule.id == item.id, GenerationRule.user_id == user.id)).first()
        if rule:
            rule.order_index = item.order_index
            session.add(rule)
    session.commit()


@router.post("/reset-defaults", response_model=List[GenerationRuleRead])
def reset_default_rules(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Re-creates any builtin rule that was deleted. Never overwrites an existing rule's content."""
    seed_default_rules(session, user.id)
    session.commit()
    return session.exec(select(GenerationRule).where(GenerationRule.user_id == user.id).order_by(GenerationRule.order_index)).all()
