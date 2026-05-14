from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from ..database import get_session
from ..models.context_card import (
    ContextCard,
    ContextCardCreate,
    ContextCardRead,
    ContextCardUpdate,
    ReorderItem,
)
from ..models.project import Project

router = APIRouter(tags=["context_cards"])


@router.get("/api/projects/{project_id}/cards", response_model=List[ContextCardRead])
def list_cards(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return session.exec(
        select(ContextCard)
        .where(ContextCard.project_id == project_id)
        .order_by(ContextCard.order_index)
    ).all()


@router.post("/api/projects/{project_id}/cards", response_model=ContextCardRead, status_code=201)
def create_card(project_id: int, data: ContextCardCreate, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    card = ContextCard(**data.model_dump(), project_id=project_id)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.put("/api/cards/{card_id}", response_model=ContextCardRead)
def update_card(card_id: int, data: ContextCardUpdate, session: Session = Depends(get_session)):
    card = session.get(ContextCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(card, key, value)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.delete("/api/cards/{card_id}", status_code=204)
def delete_card(card_id: int, session: Session = Depends(get_session)):
    card = session.get(ContextCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    session.delete(card)
    session.commit()


@router.post("/api/projects/{project_id}/cards/reorder", status_code=204)
def reorder_cards(
    project_id: int,
    items: List[ReorderItem],
    session: Session = Depends(get_session),
):
    for item in items:
        card = session.get(ContextCard, item.id)
        if card and card.project_id == project_id:
            card.order_index = item.order_index
            session.add(card)
    session.commit()
