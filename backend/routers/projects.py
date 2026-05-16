from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from typing import List, Any

from ..database import get_session
from ..models.project import Project, ProjectCreate, ProjectRead, ProjectUpdate
from ..models.context_card import ContextCard
from ..models.lorebook import LorebookEntry

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectRead])
def list_projects(session: Session = Depends(get_session)):
    return session.exec(select(Project).order_by(Project.updated_at.desc())).all()


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(data: ProjectCreate, session: Session = Depends(get_session)):
    project = Project(**data.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, data: ProjectUpdate, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    project.updated_at = datetime.utcnow()
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # cascade delete context cards and lorebook entries
    cards = session.exec(select(ContextCard).where(ContextCard.project_id == project_id)).all()
    for card in cards:
        session.delete(card)
    entries = session.exec(select(LorebookEntry).where(LorebookEntry.project_id == project_id)).all()
    for entry in entries:
        session.delete(entry)
    session.delete(project)
    session.commit()


@router.get("/{project_id}/export")
def export_project(project_id: int, session: Session = Depends(get_session)):
    """Export a full project (project metadata + context cards + lorebook entries) as JSON."""
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    cards = session.exec(
        select(ContextCard).where(ContextCard.project_id == project_id)
    ).all()
    entries = session.exec(
        select(LorebookEntry).where(LorebookEntry.project_id == project_id)
    ).all()
    return {
        "version": "1.0",
        "project": {
            "name": project.name,
            "description": project.description,
            "character_name": project.character_name,
            "last_generated_card": project.last_generated_card,
        },
        "context_cards": [
            {
                "title": c.title,
                "card_type": c.card_type,
                "content": c.content,
                "is_active": c.is_active,
                "order_index": c.order_index,
                "target_field": c.target_field,
            }
            for c in cards
        ],
        "lorebook_entries": [
            {
                "name": e.name,
                "keys": e.keys,
                "secondary_keys": e.secondary_keys,
                "content": e.content,
                "enabled": e.enabled,
                "insertion_order": e.insertion_order,
                "position": e.position,
                "constant": e.constant,
                "selective": e.selective,
                "probability": e.probability,
                "depth": e.depth,
                "comment": e.comment,
            }
            for e in entries
        ],
    }


@router.post("/import", response_model=ProjectRead, status_code=201)
def import_project(data: dict, session: Session = Depends(get_session)):
    """Import a project exported via /export.  Always creates a new project."""
    p = data.get("project", {})
    project = Project(
        name=p.get("name", "Imported Project"),
        description=p.get("description"),
        character_name=p.get("character_name", ""),
        last_generated_card=p.get("last_generated_card"),
    )
    session.add(project)
    session.flush()  # get project.id without committing

    for c in data.get("context_cards", []):
        session.add(ContextCard(
            project_id=project.id,
            title=c.get("title", ""),
            card_type=c.get("card_type", "custom"),
            content=c.get("content", ""),
            is_active=c.get("is_active", True),
            order_index=c.get("order_index", 0),
            target_field=c.get("target_field"),
        ))

    for e in data.get("lorebook_entries", []):
        session.add(LorebookEntry(
            project_id=project.id,
            name=e.get("name", ""),
            keys=e.get("keys", "[]"),
            secondary_keys=e.get("secondary_keys", "[]"),
            content=e.get("content", ""),
            enabled=e.get("enabled", True),
            insertion_order=e.get("insertion_order", 10),
            position=e.get("position", 1),
            constant=e.get("constant", False),
            selective=e.get("selective", False),
            probability=e.get("probability", 100),
            depth=e.get("depth", 4),
            comment=e.get("comment", ""),
        ))

    session.commit()
    session.refresh(project)
    return project
