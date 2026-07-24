from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class ProjectTemplateBase(SQLModel):
    name: str
    # JSON array of {title, card_type, target_field} — structure only, no
    # content, so applying a template gives a skeleton to fill in rather than
    # cloning a specific character (that's what project duplication is for).
    cards_json: str = "[]"


class ProjectTemplate(ProjectTemplateBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectTemplateCreate(SQLModel):
    name: str
    project_id: int


class ProjectTemplateRead(ProjectTemplateBase):
    id: int
    created_at: datetime
