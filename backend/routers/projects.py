from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from typing import List

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
