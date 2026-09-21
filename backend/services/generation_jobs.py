import json
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from sqlmodel import Session, select

from ..database import engine
from ..models.card_generation import CardGeneration
from ..models.context_card import ContextCard
from ..models.field_preset import FieldPreset
from ..models.generation_job import GenerationJob, GenerationStep, GenerationUsage
from ..models.generation_rule import GenerationRule, RuleScope
from ..models.project import Project
from ..models.user import UserSettings
from . import prompt_assembler
from .anthropic_client import complete_message, count_tokens
from .user_settings import get_or_create_user_settings, settings_dict

FULL_CARD_FIELDS = ["description", "personality", "scenario", "first_mes", "mes_example", "system_prompt", "post_history_instructions", "alternate_greetings"]
MAX_GENERATIONS_HISTORY = 20


def _context(session: Session, job: GenerationJob):
    project = session.exec(select(Project).where(Project.id == job.project_id, Project.user_id == job.user_id)).first()
    if not project:
        raise ValueError("Project not found")
    cards = list(session.exec(select(ContextCard).where(ContextCard.project_id == project.id).order_by(ContextCard.order_index)).all())
    rules = list(session.exec(select(GenerationRule).where(GenerationRule.user_id == job.user_id, GenerationRule.is_active == True).order_by(GenerationRule.order_index)).all())  # noqa: E712
    return project, cards, rules


def _record_usage(session: Session, job: GenerationJob, step_key: str, usage: dict):
    session.add(GenerationUsage(user_id=job.user_id, job_id=job.id, project_id=job.project_id, step_key=step_key, **usage))


def _call(session: Session, job: GenerationJob, step: GenerationStep, system: str, prompt: str, runtime: dict, project: Project | None, max_tokens: int | None = None):
    step.status = "running"; step.started_at = datetime.utcnow(); step.error = None
    job.current_step = step.step_key; job.status = "running"; job.started_at = job.started_at or datetime.utcnow()
    session.add(step); session.add(job); session.commit()
    selected_model = (project.gen_model if project else None) or runtime["default_model"]
    try:
        content, usage = complete_message(system, prompt, runtime, max_tokens=max_tokens, model=project.gen_model if project else None, temperature=project.gen_temperature if project else None, top_p=project.gen_top_p if project else None, user_id=job.user_id)
    except Exception:
        # A provider failure is still a billable attempt in some cases. Keep a
        # conservative input-only estimate so the administrative ledger never
        # silently loses attempted calls when no final usage chunk is returned.
        _record_usage(session, job, step.step_key, {
            "model": selected_model,
            "prompt_tokens": count_tokens(system, prompt),
            "completion_tokens": 0,
            "total_tokens": count_tokens(system, prompt),
            "is_estimated": True,
        })
        session.commit()
        raise
    step.content = content; step.status = "completed"; step.completed_at = datetime.utcnow()
    job.completed_steps += 1
    _record_usage(session, job, step.step_key, usage)
    session.add(step); session.add(job); session.commit()
    return content


def _parse_array(raw: str) -> list:
    text = raw.strip()
    if text.startswith("```"): text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        value = json.loads(text)
        if isinstance(value, list):
            if len(value) == 1 and isinstance(value[0], str) and value[0].strip().startswith("["):
                try:
                    inner = json.loads(value[0]); return inner if isinstance(inner, list) else value
                except Exception: pass
            return value
    except Exception: pass
    return [text] if text else []


def _full_card(session: Session, job: GenerationJob, runtime: dict):
    payload = json.loads(job.payload_json); project, cards, rules = _context(session, job)
    presets = list(session.exec(select(FieldPreset).where(FieldPreset.user_id == job.user_id, FieldPreset.id.in_(payload.get("preset_ids", [])))).all()) if payload.get("preset_ids") else []
    field_presets = [p for p in presets if not p.is_voice]; voices = [p for p in presets if p.is_voice]
    global_rules = [r for r in rules if r.scope == RuleScope.GLOBAL]
    field_map: dict[str, list] = {}
    for rule in rules:
        if rule.scope == RuleScope.PER_FIELD: field_map.setdefault(rule.target_field, []).append(rule)
    steps = list(session.exec(select(GenerationStep).where(GenerationStep.job_id == job.id).order_by(GenerationStep.id)).all())
    card_data = {"name": project.character_name or project.name, "creator": "SillyTavern Author", "creator_notes": "", "character_version": "1.0", "avatar": "none", "talkativeness": "0.5", "tags": []}
    for step in steps:
        session.refresh(job)
        if job.cancel_requested: raise InterruptedError("cancelled")
        field = step.step_key
        content = step.content if step.status == "completed" else ""
        if not content:
            preset = next((p for p in field_presets if p.target_field == field), None)
            system, prompt = prompt_assembler.build_field_prompt(project, cards, field, global_rules, field_map.get(field, []), preset, voices)
            max_tokens = runtime["field_max_tokens"].get(field, prompt_assembler.FIELD_MAX_TOKENS.get(field, 2048))
            content = _call(session, job, step, system, prompt, runtime, project, max_tokens)
        if field == "alternate_greetings": card_data[field] = _parse_array(content)
        else: card_data[field] = content.strip()
    card = {"spec": "chara_card_v2", "spec_version": "2.0", "data": card_data}
    result = json.dumps(card, ensure_ascii=False)
    project.last_generated_card = result; project.updated_at = datetime.utcnow(); session.add(project)
    session.add(CardGeneration(project_id=project.id, user_id=job.user_id, card_json=result)); session.flush()
    history = list(session.exec(select(CardGeneration).where(CardGeneration.project_id == project.id).order_by(CardGeneration.created_at.desc())).all())
    for old in history[MAX_GENERATIONS_HISTORY:]: session.delete(old)
    return result


def _single(session: Session, job: GenerationJob, runtime: dict):
    payload = json.loads(job.payload_json); project = None
    if job.project_id: project, cards, rules = _context(session, job)
    else: cards, rules = [], []
    global_rules = [r for r in rules if r.scope == RuleScope.GLOBAL]
    kind = job.kind
    if kind == "field":
        name = payload["field_name"]; field_rules = [r for r in rules if r.scope == RuleScope.PER_FIELD and r.target_field == name]
        preset = session.exec(select(FieldPreset).where(FieldPreset.id == payload.get("preset_id"), FieldPreset.user_id == job.user_id)).first() if payload.get("preset_id") else None
        voices = list(session.exec(select(FieldPreset).where(FieldPreset.user_id == job.user_id, FieldPreset.is_voice == True, FieldPreset.is_default == True)).all())  # noqa: E712
        system, prompt = prompt_assembler.build_field_prompt(project, cards, name, global_rules, field_rules, preset, voices)
        max_tokens = runtime["field_max_tokens"].get(name, prompt_assembler.FIELD_MAX_TOKENS.get(name, 2048))
    elif kind == "refine":
        voices = list(session.exec(select(FieldPreset).where(FieldPreset.user_id == job.user_id, FieldPreset.is_voice == True, FieldPreset.is_default == True)).all())  # noqa: E712
        system, prompt = prompt_assembler.build_refine_prompt(payload["field_name"], payload["current_content"], payload["instruction"], global_rules, voices); max_tokens = None
    elif kind == "lorebook":
        voices = list(session.exec(select(FieldPreset).where(FieldPreset.user_id == job.user_id, FieldPreset.is_voice == True, FieldPreset.is_default == True)).all())  # noqa: E712
        system, prompt = prompt_assembler.build_lorebook_prompt(project, cards, payload["description"], global_rules, voices); max_tokens = None
    elif kind == "fix_check":
        from ..routers.generation import _CHECK_REPAIRS
        repair = _CHECK_REPAIRS.get(payload.get("check_id"))
        if not repair: raise ValueError("Unknown quality check")
        fields = repair["fields"]
        system = f"You repair SillyTavern cards. Return only a JSON object containing exactly these keys: {', '.join(fields)}. No markdown or explanations. {repair['instruction']} Preserve the character identity and all unrelated content."
        prompt = f"Apply the requested repair to this card:\n{payload.get('card_json', '')}"; max_tokens = None
    elif kind == "fix_card":
        system = "You repair SillyTavern chara_card_v2 JSON. Return only a complete valid chara_card_v2 JSON object without markdown or explanations. Preserve existing character content, add missing required string fields as empty strings, array fields as arrays, and ensure mes_example begins with <START>."
        prompt = f"Validation errors:\n{json.dumps(payload.get('errors', []), ensure_ascii=False)}\n\nBroken JSON:\n{payload.get('broken_json', '')}"; max_tokens = 16384
    else: raise ValueError(f"Unsupported job kind: {kind}")
    step = session.exec(select(GenerationStep).where(GenerationStep.job_id == job.id)).first()
    return step.content if step.status == "completed" else _call(session, job, step, system, prompt, runtime, project, max_tokens)


def process_job(job_id: int):
    with Session(engine) as session:
        job = session.get(GenerationJob, job_id)
        if not job or job.status not in {"queued", "running"}: return
        try:
            runtime = settings_dict(get_or_create_user_settings(session, job.user_id))
            if not runtime["openrouter_api_key"]: raise ValueError("Configure sua chave OpenRouter antes de gerar")
            result = _full_card(session, job, runtime) if job.kind == "full_card" else _single(session, job, runtime)
            job.result_json = result; job.status = "completed"; job.current_step = None; job.completed_at = datetime.utcnow()
        except InterruptedError:
            job.status = "cancelled"; job.completed_at = datetime.utcnow()
        except Exception as exc:
            job.status = "failed"; job.error = str(exc); job.completed_at = datetime.utcnow()
            step = session.exec(select(GenerationStep).where(GenerationStep.job_id == job.id, GenerationStep.status == "running")).first()
            if step: step.status = "failed"; step.error = str(exc); session.add(step)
        session.add(job); session.commit()


class JobManager:
    def __init__(self):
        self.stop_event = threading.Event(); self.active_users: set[int] = set(); self.lock = threading.Lock(); self.executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="generation")
        self.thread = threading.Thread(target=self._loop, name="generation-dispatcher", daemon=True)
    def start(self):
        with Session(engine) as session:
            for job in session.exec(select(GenerationJob).where(GenerationJob.status == "running")).all(): job.status = "queued"; session.add(job)
            for step in session.exec(select(GenerationStep).where(GenerationStep.status == "running")).all(): step.status = "pending"; step.content = ""; session.add(step)
            session.commit()
        self.thread.start()
    def stop(self):
        self.stop_event.set(); self.thread.join(timeout=3); self.executor.shutdown(wait=False, cancel_futures=False)
    def _done(self, user_id: int):
        with self.lock: self.active_users.discard(user_id)
    def _loop(self):
        while not self.stop_event.wait(0.75):
            with Session(engine) as session:
                queued = list(session.exec(select(GenerationJob).where(GenerationJob.status == "queued").order_by(GenerationJob.created_at)).all())
            for job in queued:
                with self.lock:
                    if job.user_id in self.active_users: continue
                    self.active_users.add(job.user_id)
                future = self.executor.submit(process_job, job.id)
                future.add_done_callback(lambda _, uid=job.user_id: self._done(uid))

manager = JobManager()
