import json

import pytest
from fastapi import HTTPException
from sqlmodel import SQLModel, Session, create_engine, select

from backend.models import (
    CardTypeConfig,
    FieldPreset,
    GenerationJob,
    GenerationStep,
    GenerationUsage,
    Project,
    User,
    UserSettings,
)
from backend.routers.presets import import_presets
from backend.routers.projects import get_project
from backend.services import generation_jobs
from backend.services.security import encrypt_secret, hash_password


@pytest.fixture
def db(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'test.db').as_posix()}", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield engine, session


def _user(session: Session, username: str) -> User:
    user = User(username=username, password_hash=hash_password("test-password"))
    session.add(user); session.commit(); session.refresh(user)
    return user


def test_preset_reimport_updates_without_duplicates(db):
    _, session = db; user = _user(session, "owner")
    payload = {"presets": [{"name": "My preset", "target_field": "description", "is_voice": False, "system_prompt_override": "v1"}]}
    first = import_presets(payload, user, session)
    payload["presets"][0]["system_prompt_override"] = "v2"
    second = import_presets(payload, user, session)
    rows = session.exec(select(FieldPreset).where(FieldPreset.user_id == user.id)).all()
    assert first["created"] == 1
    assert second["updated"] == 1
    assert len(rows) == 1 and rows[0].system_prompt_override == "v2"


def test_project_cannot_be_read_by_another_user(db):
    _, session = db; owner = _user(session, "owner"); stranger = _user(session, "stranger")
    project = Project(name="private", user_id=owner.id); session.add(project); session.commit(); session.refresh(project)
    with pytest.raises(HTTPException) as exc:
        get_project(project.id, stranger, session)
    assert exc.value.status_code == 404


def test_server_job_completes_and_records_usage_without_http_client(db, monkeypatch, tmp_path):
    engine, session = db; user = _user(session, "generator")
    from backend.config import settings
    monkeypatch.setattr(settings, "app_secret_file", str(tmp_path / "secret.key"))
    session.add(UserSettings(user_id=user.id, api_key_encrypted=encrypt_secret("test-key"), default_model="test/model", field_max_tokens_json="{}"))
    project = Project(name="P", character_name="Char", user_id=user.id); session.add(project); session.flush()
    job = GenerationJob(user_id=user.id, project_id=project.id, kind="full_card", payload_json='{"preset_ids": []}', total_steps=len(generation_jobs.FULL_CARD_FIELDS)); session.add(job); session.flush()
    for key in generation_jobs.FULL_CARD_FIELDS: session.add(GenerationStep(job_id=job.id, step_key=key))
    session.commit(); job_id = job.id

    def fake_complete(*args, **kwargs):
        field_text = '["Greeting"]' if "alternate_greetings" in args[1] else "Generated content"
        return field_text, {"model": "test/model", "prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15, "is_estimated": False}

    monkeypatch.setattr(generation_jobs, "engine", engine)
    monkeypatch.setattr(generation_jobs, "complete_message", fake_complete)
    generation_jobs.process_job(job_id)
    session.expire_all()
    completed = session.get(GenerationJob, job_id)
    refreshed_project = session.get(Project, project.id)
    usage = session.exec(select(GenerationUsage).where(GenerationUsage.job_id == job_id)).all()
    assert completed.status == "completed"
    assert json.loads(completed.result_json)["data"]["name"] == "Char"
    assert refreshed_project.last_generated_card == completed.result_json
    assert len(usage) == len(generation_jobs.FULL_CARD_FIELDS)
    assert sum(row.total_tokens for row in usage) == 15 * len(generation_jobs.FULL_CARD_FIELDS)


def test_failed_provider_call_is_still_recorded_as_estimated_usage(db, monkeypatch, tmp_path):
    engine, session = db
    user = _user(session, "failed-generator")
    from backend.config import settings
    monkeypatch.setattr(settings, "app_secret_file", str(tmp_path / "failure-secret.key"))
    session.add(UserSettings(user_id=user.id, api_key_encrypted=encrypt_secret("test-key"), default_model="test/model", field_max_tokens_json="{}"))
    project = Project(name="P", character_name="Char", user_id=user.id)
    session.add(project)
    session.flush()
    job = GenerationJob(user_id=user.id, project_id=project.id, kind="field", payload_json='{"field_name": "description"}')
    session.add(job)
    session.flush()
    session.add(GenerationStep(job_id=job.id, step_key="description"))
    session.commit()

    monkeypatch.setattr(generation_jobs, "engine", engine)
    monkeypatch.setattr(generation_jobs, "complete_message", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("provider unavailable")))
    generation_jobs.process_job(job.id)
    session.expire_all()

    failed = session.get(GenerationJob, job.id)
    usage = session.exec(select(GenerationUsage).where(GenerationUsage.job_id == job.id)).all()
    assert failed.status == "failed"
    assert len(usage) == 1
    assert usage[0].is_estimated is True
    assert usage[0].prompt_tokens > 0
