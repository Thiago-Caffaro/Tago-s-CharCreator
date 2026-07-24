from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import json

from ..database import get_session
from ..models.project_template import ProjectTemplate, ProjectTemplateCreate, ProjectTemplateRead
from ..models.project import Project
from ..models.context_card import ContextCard

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[ProjectTemplateRead])
def list_templates(session: Session = Depends(get_session)):
    return session.exec(select(ProjectTemplate).order_by(ProjectTemplate.created_at.desc())).all()


@router.post("", response_model=ProjectTemplateRead, status_code=201)
def create_template(data: ProjectTemplateCreate, session: Session = Depends(get_session)):
    """Snapshots a project's context card structure (title/type/target_field, no content) as a reusable template."""
    project = session.get(Project, data.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    cards = session.exec(
        select(ContextCard)
        .where(ContextCard.project_id == data.project_id)
        .order_by(ContextCard.order_index)
    ).all()
    cards_data = [
        {"title": c.title, "card_type": c.card_type, "target_field": c.target_field}
        for c in cards
    ]

    template = ProjectTemplate(name=data.name, cards_json=json.dumps(cards_data))
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, session: Session = Depends(get_session)):
    template = session.get(ProjectTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    session.delete(template)
    session.commit()


@router.post("/{template_id}/apply/{project_id}", response_model=List[int], status_code=201)
def apply_template(template_id: int, project_id: int, session: Session = Depends(get_session)):
    """Adds the template's cards to a project — appended after whatever cards already exist."""
    template = session.get(ProjectTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = session.exec(select(ContextCard).where(ContextCard.project_id == project_id)).all()
    next_order = len(existing)

    cards_data = json.loads(template.cards_json)
    created_ids = []
    for i, c in enumerate(cards_data):
        card = ContextCard(
            project_id=project_id,
            title=c.get("title", ""),
            card_type=c.get("card_type", "custom"),
            content="",
            is_active=True,
            order_index=next_order + i,
            target_field=c.get("target_field"),
        )
        session.add(card)
        session.flush()
        created_ids.append(card.id)

    session.commit()
    return created_ids
