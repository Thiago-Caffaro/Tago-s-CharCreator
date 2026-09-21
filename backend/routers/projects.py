from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlmodel import Session, select
from datetime import datetime
from typing import List, Any

from ..database import get_session
from ..auth import get_current_user
from ..models.user import User
from ..models.project import Project, ProjectCreate, ProjectRead, ProjectUpdate
from ..models.context_card import ContextCard
from ..models.lorebook import LorebookEntry
from ..models.card_generation import CardGeneration, CardGenerationRead
from ..models.project_avatar import ProjectAvatar
from ..models.generation_job import GenerationJob, GenerationUsage

router = APIRouter(prefix="/api/projects", tags=["projects"])

# Regenerating overwrites last_generated_card in place — this many prior
# snapshots are kept per project so a bad regeneration can be compared
# against or reverted to.
MAX_GENERATIONS_HISTORY = 20
ALLOWED_AVATAR_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024


def _owned_project(project_id: int, user: User, session: Session) -> Project:
    project = session.exec(select(Project).where(Project.id == project_id, Project.user_id == user.id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=List[ProjectRead])
def list_projects(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(select(Project).where(Project.user_id == user.id).order_by(Project.updated_at.desc())).all()


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(data: ProjectCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    project = Project(**data.model_dump(), user_id=user.id)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return _owned_project(project_id, user, session)


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, data: ProjectUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    project = _owned_project(project_id, user, session)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    project.updated_at = datetime.utcnow()
    session.add(project)

    new_card = update_data.get("last_generated_card")
    if new_card:
        session.add(CardGeneration(project_id=project_id, card_json=new_card, user_id=user.id))
        session.flush()
        history = session.exec(
            select(CardGeneration)
            .where(CardGeneration.project_id == project_id)
            .order_by(CardGeneration.created_at.desc())
        ).all()
        for old in history[MAX_GENERATIONS_HISTORY:]:
            session.delete(old)

    session.commit()
    session.refresh(project)
    return project


@router.post("/{project_id}/duplicate", response_model=ProjectRead, status_code=201)
def duplicate_project(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Clones a project plus its context cards and lorebook entries.

    Done server-side (not read-then-recreate on the client) so the copy is a
    single atomic operation instead of N+1 round trips.
    """
    project = _owned_project(project_id, user, session)

    new_project = Project(
        name=f"{project.name} (cópia)",
        description=project.description,
        character_name=project.character_name,
        last_generated_card=project.last_generated_card,
        avatar=project.avatar,
        gen_model=project.gen_model,
        gen_temperature=project.gen_temperature,
        gen_top_p=project.gen_top_p,
        user_id=user.id,
    )
    session.add(new_project)
    session.flush()  # get new_project.id without committing

    cards = session.exec(select(ContextCard).where(ContextCard.project_id == project_id)).all()
    for c in cards:
        session.add(ContextCard(
            project_id=new_project.id,
            title=c.title, card_type=c.card_type, content=c.content,
            is_active=c.is_active, order_index=c.order_index, target_field=c.target_field,
        ))

    entries = session.exec(select(LorebookEntry).where(LorebookEntry.project_id == project_id)).all()
    for e in entries:
        session.add(LorebookEntry(
            project_id=new_project.id,
            name=e.name, keys=e.keys, secondary_keys=e.secondary_keys, content=e.content,
            enabled=e.enabled, insertion_order=e.insertion_order, position=e.position,
            constant=e.constant, selective=e.selective, probability=e.probability,
            depth=e.depth, comment=e.comment,
        ))

    source_avatar = session.exec(select(ProjectAvatar).where(ProjectAvatar.project_id == project_id)).first()
    if source_avatar:
        session.add(ProjectAvatar(
            project_id=new_project.id,
            mime_type=source_avatar.mime_type,
            content=source_avatar.content,
        ))
        new_project.avatar = f"/api/projects/{new_project.id}/avatar?v={int(datetime.utcnow().timestamp())}"
        session.add(new_project)

    session.commit()
    session.refresh(new_project)
    return new_project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    project = _owned_project(project_id, user, session)
    # cascade delete context cards, lorebook entries, and generation history
    cards = session.exec(select(ContextCard).where(ContextCard.project_id == project_id)).all()
    for card in cards:
        session.delete(card)
    entries = session.exec(select(LorebookEntry).where(LorebookEntry.project_id == project_id)).all()
    for entry in entries:
        session.delete(entry)
    generations = session.exec(select(CardGeneration).where(CardGeneration.project_id == project_id)).all()
    for generation in generations:
        session.delete(generation)
    avatar = session.exec(select(ProjectAvatar).where(ProjectAvatar.project_id == project_id)).first()
    if avatar:
        session.delete(avatar)
    # Preserve the immutable usage ledger even when a project is removed.
    for job in session.exec(select(GenerationJob).where(GenerationJob.project_id == project_id)).all():
        if job.status in {"queued", "running"}:
            job.cancel_requested = True
            job.status = "cancelled"
        job.project_id = None
        session.add(job)
    for usage in session.exec(select(GenerationUsage).where(GenerationUsage.project_id == project_id)).all():
        usage.project_id = None
        session.add(usage)
    session.delete(project)
    session.commit()


@router.get("/{project_id}/generations", response_model=List[CardGenerationRead])
def list_generations(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _owned_project(project_id, user, session)
    return session.exec(
        select(CardGeneration)
        .where(CardGeneration.project_id == project_id)
        .order_by(CardGeneration.created_at.desc())
    ).all()


@router.get("/{project_id}/export")
def export_project(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Export a full project (project metadata + context cards + lorebook entries) as JSON."""
    project = _owned_project(project_id, user, session)
    cards = session.exec(
        select(ContextCard).where(ContextCard.project_id == project_id)
    ).all()
    entries = session.exec(
        select(LorebookEntry).where(LorebookEntry.project_id == project_id)
    ).all()
    avatar_row = session.exec(select(ProjectAvatar).where(ProjectAvatar.project_id == project_id)).first()
    avatar_export = project.avatar
    if avatar_row:
        import base64
        avatar_export = f"data:{avatar_row.mime_type};base64,{base64.b64encode(avatar_row.content).decode('ascii')}"
    return {
        "version": "1.0",
        "project": {
            "name": project.name,
            "description": project.description,
            "character_name": project.character_name,
            "last_generated_card": project.last_generated_card,
            "avatar": avatar_export,
            "gen_model": project.gen_model,
            "gen_temperature": project.gen_temperature,
            "gen_top_p": project.gen_top_p,
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
def import_project(data: dict, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Import a project exported via /export.  Always creates a new project."""
    p = data.get("project", {})
    project = Project(
        name=p.get("name", "Imported Project"),
        description=p.get("description"),
        character_name=p.get("character_name", ""),
        last_generated_card=p.get("last_generated_card"),
        avatar=p.get("avatar"),
        gen_model=p.get("gen_model"),
        gen_temperature=p.get("gen_temperature"),
        gen_top_p=p.get("gen_top_p"),
        user_id=user.id,
    )
    session.add(project)
    session.flush()  # get project.id without committing
    legacy_avatar = p.get("avatar")
    if isinstance(legacy_avatar, str) and legacy_avatar.startswith("data:image/"):
        import base64, re
        match = re.match(r"^data:(image/(?:png|jpeg|webp));base64,(.+)$", legacy_avatar, re.S)
        if match:
            try:
                session.add(ProjectAvatar(project_id=project.id, mime_type=match.group(1), content=base64.b64decode(match.group(2), validate=True)))
                project.avatar = f"/api/projects/{project.id}/avatar?v={int(datetime.utcnow().timestamp())}"
            except ValueError:
                project.avatar = None

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


@router.put("/{project_id}/avatar")
async def upload_avatar(
    project_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    project = _owned_project(project_id, user, session)
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=415, detail="Use PNG, JPEG ou WebP")
    content = await file.read(MAX_AVATAR_BYTES + 1)
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="A imagem deve ter no máximo 5 MB")
    signatures = {
        "image/png": b"\x89PNG\r\n\x1a\n",
        "image/jpeg": b"\xff\xd8\xff",
        "image/webp": b"RIFF",
    }
    if not content.startswith(signatures[file.content_type]):
        raise HTTPException(status_code=415, detail="Arquivo de imagem inválido")
    avatar = session.exec(select(ProjectAvatar).where(ProjectAvatar.project_id == project_id)).first()
    if avatar:
        avatar.mime_type = file.content_type
        avatar.content = content
        avatar.updated_at = datetime.utcnow()
    else:
        avatar = ProjectAvatar(project_id=project_id, mime_type=file.content_type, content=content)
    project.avatar = f"/api/projects/{project_id}/avatar?v={int(datetime.utcnow().timestamp())}"
    session.add(avatar)
    session.add(project)
    session.commit()
    return {"avatar": project.avatar}


@router.get("/{project_id}/avatar")
def get_avatar(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _owned_project(project_id, user, session)
    avatar = session.exec(select(ProjectAvatar).where(ProjectAvatar.project_id == project_id)).first()
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    return Response(content=avatar.content, media_type=avatar.mime_type, headers={"Cache-Control": "private, max-age=300"})


@router.delete("/{project_id}/avatar", status_code=204)
def delete_avatar(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    project = _owned_project(project_id, user, session)
    avatar = session.exec(select(ProjectAvatar).where(ProjectAvatar.project_id == project_id)).first()
    if avatar:
        session.delete(avatar)
    project.avatar = None
    session.add(project)
    session.commit()
