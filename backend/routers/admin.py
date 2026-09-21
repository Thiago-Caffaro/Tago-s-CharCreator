from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Integer, case, func
from sqlmodel import Session, select

from ..auth import require_admin
from ..database import get_session
from ..models.generation_job import GenerationJob, GenerationUsage
from ..models.user import AuthSession, User, UserRead
from ..models.generation_rule import GenerationRule
from ..models.card_type_config import CardTypeConfig
from ..models.field_preset import FieldPreset
from ..models.project import Project
from ..services.security import hash_password
from ..services.user_settings import get_or_create_user_settings

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"


class UserAdminUpdate(BaseModel):
    is_active: Optional[bool] = None
    password: Optional[str] = None
    role: Optional[str] = None


@router.get("/users", response_model=list[UserRead])
def list_users(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    return session.exec(select(User).order_by(User.username)).all()


@router.post("/users", response_model=UserRead, status_code=201)
def create_user(data: UserCreate, admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    username = data.username.strip()
    if not username:
        raise HTTPException(status_code=422, detail="Username is required")
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=409, detail="Username already exists")
    if data.role not in {"user", "admin"}:
        raise HTTPException(status_code=422, detail="Invalid role")
    user = User(username=username, password_hash=hash_password(data.password), role=data.role)
    session.add(user)
    session.flush()
    get_or_create_user_settings(session, user.id)
    for rule in session.exec(select(GenerationRule).where(GenerationRule.user_id == admin.id, GenerationRule.is_builtin == True)).all():  # noqa: E712
        session.add(GenerationRule(name=rule.name, content=rule.content, scope=rule.scope, target_field=rule.target_field, is_active=rule.is_active, order_index=rule.order_index, is_builtin=True, user_id=user.id))
    for card_type in session.exec(select(CardTypeConfig).where(CardTypeConfig.user_id == admin.id, CardTypeConfig.is_builtin == True)).all():  # noqa: E712
        session.add(CardTypeConfig(slug=card_type.slug, label=card_type.label, color=card_type.color, is_builtin=True, order_index=card_type.order_index, user_id=user.id))
    for preset in session.exec(select(FieldPreset).where(FieldPreset.user_id == admin.id)).all():
        session.add(FieldPreset(name=preset.name, target_field=preset.target_field, system_prompt_override=preset.system_prompt_override, is_default=preset.is_default, is_voice=preset.is_voice, user_id=user.id))
    session.commit()
    session.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    data: UserAdminUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.is_active is not None:
        if user.id == admin.id and not data.is_active:
            raise HTTPException(status_code=400, detail="You cannot disable your own account")
        user.is_active = data.is_active
    if data.password:
        user.password_hash = hash_password(data.password)
    if data.role is not None:
        if data.role not in {"user", "admin"}:
            raise HTTPException(status_code=422, detail="Invalid role")
        user.role = data.role
    user.updated_at = datetime.utcnow()
    session.add(user)
    if data.password or data.is_active is False:
        for auth_session in session.exec(
            select(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at == None)  # noqa: E711
        ).all():
            auth_session.revoked_at = datetime.utcnow()
            session.add(auth_session)
    session.commit()
    session.refresh(user)
    return user


@router.get("/stats")
def stats(days: Optional[int] = None, _: User = Depends(require_admin), session: Session = Depends(get_session)):
    users = session.exec(select(User).order_by(User.username)).all()
    rows = []
    for user in users:
        usage_query = select(
                func.coalesce(func.sum(GenerationUsage.prompt_tokens), 0),
                func.coalesce(func.sum(GenerationUsage.completion_tokens), 0),
                func.coalesce(func.sum(GenerationUsage.total_tokens), 0),
                func.coalesce(func.sum(func.cast(GenerationUsage.is_estimated, Integer)), 0),
                func.coalesce(func.sum(case((GenerationUsage.is_estimated == False, GenerationUsage.total_tokens), else_=0)), 0),  # noqa: E712
                func.coalesce(func.sum(case((GenerationUsage.is_estimated == True, GenerationUsage.total_tokens), else_=0)), 0),  # noqa: E712
            ).where(GenerationUsage.user_id == user.id)
        jobs_query = select(GenerationJob).where(GenerationJob.user_id == user.id)
        if days:
            cutoff = datetime.utcnow() - timedelta(days=max(1, min(days, 3650)))
            usage_query = usage_query.where(GenerationUsage.created_at >= cutoff)
            jobs_query = jobs_query.where(GenerationJob.created_at >= cutoff)
        usage = session.exec(usage_query).one()
        jobs = session.exec(jobs_query).all()
        user_settings = get_or_create_user_settings(session, user.id)
        last_usage = session.exec(
            select(GenerationUsage)
            .where(GenerationUsage.user_id == user.id)
            .order_by(GenerationUsage.created_at.desc())
        ).first()
        active_job = next((job for job in jobs if job.status in {"queued", "running"}), None)
        rows.append({
            "user": UserRead.model_validate(user).model_dump(),
            "default_model": user_settings.default_model,
            "last_model": last_usage.model if last_usage else None,
            "prompt_tokens": usage[0],
            "completion_tokens": usage[1],
            "total_tokens": usage[2],
            "estimated_calls": usage[3],
            "real_tokens": usage[4],
            "estimated_tokens": usage[5],
            "active_job": {
                "id": active_job.id,
                "project_id": active_job.project_id,
                "kind": active_job.kind,
                "status": active_job.status,
                "current_step": active_job.current_step,
            } if active_job else None,
            "jobs": {
                "queued": sum(j.status == "queued" for j in jobs),
                "running": sum(j.status == "running" for j in jobs),
                "completed": sum(j.status == "completed" for j in jobs),
                "failed": sum(j.status == "failed" for j in jobs),
                "cancelled": sum(j.status == "cancelled" for j in jobs),
            },
        })
    session.commit()
    return {"users": rows}


@router.get("/usage")
def usage_detail(
    user_id: Optional[int] = None,
    days: Optional[int] = None,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    query = select(GenerationUsage)
    if user_id is not None:
        query = query.where(GenerationUsage.user_id == user_id)
    if days:
        cutoff = datetime.utcnow() - timedelta(days=max(1, min(days, 3650)))
        query = query.where(GenerationUsage.created_at >= cutoff)
    usage_rows = session.exec(query.order_by(GenerationUsage.created_at.desc()).limit(200)).all()
    users = {row.id: row.username for row in session.exec(select(User)).all()}
    project_ids = {row.project_id for row in usage_rows if row.project_id is not None}
    projects = {
        row.id: row.name
        for row in session.exec(select(Project).where(Project.id.in_(project_ids))).all()
    } if project_ids else {}
    return {
        "usage": [
            {
                "id": row.id,
                "user_id": row.user_id,
                "username": users.get(row.user_id, "—"),
                "job_id": row.job_id,
                "project_id": row.project_id,
                "project_name": projects.get(row.project_id, "Sem projeto"),
                "step": row.step_key,
                "model": row.model,
                "prompt_tokens": row.prompt_tokens,
                "completion_tokens": row.completion_tokens,
                "total_tokens": row.total_tokens,
                "is_estimated": row.is_estimated,
                "created_at": row.created_at,
            }
            for row in usage_rows
        ]
    }
