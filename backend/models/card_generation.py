from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .project import Project


class CardGenerationBase(SQLModel):
    card_json: str


class CardGeneration(CardGenerationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    project: Optional["Project"] = Relationship(back_populates="generations")


class CardGenerationRead(CardGenerationBase):
    id: int
    created_at: datetime
