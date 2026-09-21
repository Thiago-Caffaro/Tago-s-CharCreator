from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class ProjectAvatar(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True, unique=True)
    mime_type: str
    content: bytes
    updated_at: datetime = Field(default_factory=datetime.utcnow)
