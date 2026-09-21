from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class GenerationJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id", index=True)
    kind: str
    status: str = Field(default="queued", index=True)
    payload_json: str = "{}"
    result_json: Optional[str] = None
    error: Optional[str] = None
    current_step: Optional[str] = None
    completed_steps: int = 0
    total_steps: int = 1
    cancel_requested: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class GenerationStep(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="generationjob.id", index=True)
    step_key: str
    status: str = "pending"
    content: str = ""
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class GenerationUsage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    job_id: int = Field(foreign_key="generationjob.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id", index=True)
    step_key: Optional[str] = None
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    is_estimated: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class GenerationJobRead(SQLModel):
    id: int
    user_id: int
    project_id: Optional[int]
    kind: str
    status: str
    result_json: Optional[str]
    error: Optional[str]
    current_step: Optional[str]
    completed_steps: int
    total_steps: int
    cancel_requested: bool
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
