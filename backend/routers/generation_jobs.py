import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from ..auth import get_current_user
from ..database import get_session
from ..models.generation_job import GenerationJob, GenerationJobRead, GenerationStep
from ..models.project import Project
from ..models.user import User
from ..services.generation_jobs import FULL_CARD_FIELDS
from ..models.context_card import ContextCard
from ..models.generation_rule import GenerationRule, RuleScope
from ..models.field_preset import FieldPreset
from ..services import prompt_assembler
from ..services.anthropic_client import count_tokens

router = APIRouter(prefix="/api/generation-jobs", tags=["generation_jobs"])

class JobCreate(BaseModel):
    kind: str
    project_id: int | None = None
    payload: dict = {}

class EstimateRequest(BaseModel):
    project_id: int
    preset_ids: list[int] = []

@router.post("/estimate")
def estimate(data: EstimateRequest, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    project = session.exec(select(Project).where(Project.id == data.project_id, Project.user_id == user.id)).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    cards = list(session.exec(select(ContextCard).where(ContextCard.project_id == project.id).order_by(ContextCard.order_index)).all())
    rules = list(session.exec(select(GenerationRule).where(GenerationRule.user_id == user.id, GenerationRule.scope == RuleScope.GLOBAL, GenerationRule.is_active == True).order_by(GenerationRule.order_index)).all())  # noqa: E712
    presets = list(session.exec(select(FieldPreset).where(FieldPreset.user_id == user.id, FieldPreset.id.in_(data.preset_ids))).all()) if data.preset_ids else []
    system, prompt = prompt_assembler.build_full_card_prompt(project, cards, rules, presets)
    return {"input_tokens": count_tokens(system, prompt)}

@router.post("", response_model=GenerationJobRead, status_code=202)
def create_job(data: JobCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    allowed = {"full_card", "field", "refine", "lorebook", "fix_check", "fix_card"}
    if data.kind not in allowed: raise HTTPException(status_code=422, detail="Invalid job kind")
    if data.project_id is not None and not session.exec(select(Project).where(Project.id == data.project_id, Project.user_id == user.id)).first(): raise HTTPException(status_code=404, detail="Project not found")
    step_keys = FULL_CARD_FIELDS if data.kind == "full_card" else [data.payload.get("field_name") or data.kind]
    job = GenerationJob(user_id=user.id, project_id=data.project_id, kind=data.kind, payload_json=json.dumps(data.payload, ensure_ascii=False), total_steps=len(step_keys))
    session.add(job); session.flush()
    for key in step_keys: session.add(GenerationStep(job_id=job.id, step_key=key))
    session.commit(); session.refresh(job); return job

@router.get("", response_model=list[GenerationJobRead])
def list_jobs(project_id: int | None = None, active: bool = False, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    query = select(GenerationJob).where(GenerationJob.user_id == user.id)
    if project_id is not None: query = query.where(GenerationJob.project_id == project_id)
    if active: query = query.where(GenerationJob.status.in_(["queued", "running"]))
    return session.exec(query.order_by(GenerationJob.created_at.desc()).limit(50)).all()

@router.get("/{job_id}")
def get_job(job_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    job = session.exec(select(GenerationJob).where(GenerationJob.id == job_id, GenerationJob.user_id == user.id)).first()
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    steps = session.exec(select(GenerationStep).where(GenerationStep.job_id == job.id).order_by(GenerationStep.id)).all()
    return {**GenerationJobRead.model_validate(job).model_dump(), "steps": [{"key": s.step_key, "status": s.status, "content": s.content, "error": s.error} for s in steps]}

@router.post("/{job_id}/cancel", response_model=GenerationJobRead)
def cancel_job(job_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    job = session.exec(select(GenerationJob).where(GenerationJob.id == job_id, GenerationJob.user_id == user.id)).first()
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    if job.status in {"queued", "running"}: job.cancel_requested = True; job.status = "cancelled" if job.status == "queued" else job.status; session.add(job); session.commit(); session.refresh(job)
    return job
