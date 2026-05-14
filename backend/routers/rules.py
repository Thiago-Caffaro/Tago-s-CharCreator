from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional

from ..database import get_session
from ..models.generation_rule import (
    GenerationRule,
    GenerationRuleCreate,
    GenerationRuleRead,
    GenerationRuleUpdate,
    ReorderItem,
)

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("", response_model=List[GenerationRuleRead])
def list_rules(session: Session = Depends(get_session)):
    return session.exec(select(GenerationRule).order_by(GenerationRule.order_index)).all()


@router.post("", response_model=GenerationRuleRead, status_code=201)
def create_rule(data: GenerationRuleCreate, session: Session = Depends(get_session)):
    rule = GenerationRule(**data.model_dump())
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.put("/{rule_id}", response_model=GenerationRuleRead)
def update_rule(rule_id: int, data: GenerationRuleUpdate, session: Session = Depends(get_session)):
    rule = session.get(GenerationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=204)
def delete_rule(rule_id: int, session: Session = Depends(get_session)):
    rule = session.get(GenerationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    session.delete(rule)
    session.commit()


@router.post("/reorder", status_code=204)
def reorder_rules(items: List[ReorderItem], session: Session = Depends(get_session)):
    for item in items:
        rule = session.get(GenerationRule, item.id)
        if rule:
            rule.order_index = item.order_index
            session.add(rule)
    session.commit()
