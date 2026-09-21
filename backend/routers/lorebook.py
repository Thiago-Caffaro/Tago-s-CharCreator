from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from typing import List
import json

from ..database import get_session
from ..auth import get_current_user
from ..models.user import User
from ..models.lorebook import LorebookEntry, LorebookEntryCreate, LorebookEntryRead, LorebookEntryUpdate
from ..models.project import Project

router = APIRouter(tags=["lorebook"])

def _project(project_id: int, user: User, session: Session):
    value = session.exec(select(Project).where(Project.id == project_id, Project.user_id == user.id)).first()
    if not value: raise HTTPException(status_code=404, detail="Project not found")
    return value

def _entry(entry_id: int, user: User, session: Session):
    value = session.exec(select(LorebookEntry).join(Project).where(LorebookEntry.id == entry_id, Project.user_id == user.id)).first()
    if not value: raise HTTPException(status_code=404, detail="Entry not found")
    return value


@router.get("/api/projects/{project_id}/lorebook", response_model=List[LorebookEntryRead])
def list_entries(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _project(project_id, user, session)
    return session.exec(
        select(LorebookEntry).where(LorebookEntry.project_id == project_id)
    ).all()


@router.post("/api/projects/{project_id}/lorebook", response_model=LorebookEntryRead, status_code=201)
def create_entry(project_id: int, data: LorebookEntryCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _project(project_id, user, session)
    entry = LorebookEntry(**data.model_dump(), project_id=project_id)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.put("/api/lorebook/{entry_id}", response_model=LorebookEntryRead)
def update_entry(entry_id: int, data: LorebookEntryUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    entry = _entry(entry_id, user, session)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.delete("/api/lorebook/{entry_id}", status_code=204)
def delete_entry(entry_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    entry = _entry(entry_id, user, session)
    session.delete(entry)
    session.commit()


@router.get("/api/projects/{project_id}/lorebook/export")
def export_lorebook(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    project = _project(project_id, user, session)
    entries = session.exec(
        select(LorebookEntry).where(LorebookEntry.project_id == project_id)
    ).all()
    entries_dict = {}
    for i, entry in enumerate(entries, start=1):
        entries_dict[str(i)] = {
            "uid": entry.id,
            "name": entry.name,
            "key": json.loads(entry.keys),
            "keysecondary": json.loads(entry.secondary_keys),
            # SillyTavern uses "comment" as the entry's displayed title/memo —
            # this app's own UI treats "name" as the primary field and leaves
            # "comment" (a separate, secondary field) empty far more often, so
            # fall back to name to avoid entries showing up titleless in ST.
            "comment": entry.comment or entry.name,
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


@router.post("/api/projects/{project_id}/lorebook/import")
def import_lorebook(project_id: int, data: dict, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Import a SillyTavern World Info / lorebook JSON — the same shape /export produces.

    Real SillyTavern exports have no distinct display name field, only
    `comment` (which SillyTavern's own UI shows as the entry's title) — our
    own export additionally stuffs `entry.name` in for a clean round-trip,
    so prefer that when present and fall back to `comment` otherwise.
    """
    _project(project_id, user, session)

    entries_data = data.get("entries", {})
    raw_entries = entries_data.values() if isinstance(entries_data, dict) else entries_data

    created = 0
    for e in raw_entries:
        session.add(LorebookEntry(
            project_id=project_id,
            name=e.get("name") or e.get("comment") or "",
            keys=json.dumps(e.get("key", [])),
            secondary_keys=json.dumps(e.get("keysecondary", [])),
            content=e.get("content", ""),
            enabled=not e.get("disable", False),
            insertion_order=e.get("order", 10),
            position=e.get("position", 1),
            constant=e.get("constant", False),
            selective=e.get("selective", False),
            probability=e.get("probability", 100),
            depth=e.get("depth", 4),
            comment=e.get("comment", ""),
        ))
        created += 1

    session.commit()
    return {"imported": created}
