from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from typing import List
import json

from ..database import get_session
from ..models.lorebook import LorebookEntry, LorebookEntryCreate, LorebookEntryRead, LorebookEntryUpdate
from ..models.project import Project

router = APIRouter(tags=["lorebook"])


@router.get("/api/projects/{project_id}/lorebook", response_model=List[LorebookEntryRead])
def list_entries(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return session.exec(
        select(LorebookEntry).where(LorebookEntry.project_id == project_id)
    ).all()


@router.post("/api/projects/{project_id}/lorebook", response_model=LorebookEntryRead, status_code=201)
def create_entry(project_id: int, data: LorebookEntryCreate, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    entry = LorebookEntry(**data.model_dump(), project_id=project_id)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.put("/api/lorebook/{entry_id}", response_model=LorebookEntryRead)
def update_entry(entry_id: int, data: LorebookEntryUpdate, session: Session = Depends(get_session)):
    entry = session.get(LorebookEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.delete("/api/lorebook/{entry_id}", status_code=204)
def delete_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(LorebookEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()


@router.get("/api/projects/{project_id}/lorebook/export")
def export_lorebook(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    entries = session.exec(
        select(LorebookEntry).where(LorebookEntry.project_id == project_id)
    ).all()
    entries_dict = {}
    for i, entry in enumerate(entries, start=1):
        entries_dict[str(i)] = {
            "uid": entry.id,
            "key": json.loads(entry.keys),
            "keysecondary": json.loads(entry.secondary_keys),
            "comment": entry.comment,
            "content": entry.content,
            "constant": entry.constant,
            "selective": entry.selective,
            "selectiveLogic": 0,
            "addMemo": True,
            "order": entry.insertion_order,
            "position": entry.position,
            "disable": not entry.enabled,
            "excludeRecursion": False,
            "probability": entry.probability,
            "useProbability": True,
            "depth": entry.depth,
            "extensions": {
                "depth": entry.depth,
                "weight": 100,
                "addMemo": True,
                "useProbability": True,
                "excludeRecursion": False,
            },
        }
    payload = {
        "name": f"{project.character_name} — Lorebook",
        "description": "",
        "scan_depth": 4,
        "token_budget": 2048,
        "recursive_scanning": False,
        "extensions": {},
        "entries": entries_dict,
    }
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="{project.character_name}_lorebook.json"'},
    )
