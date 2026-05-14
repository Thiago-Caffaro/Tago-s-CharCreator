from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .context_card import ContextCard
    from .lorebook import LorebookEntry


class ProjectBase(SQLModel):
    name: str
    description: Optional[str] = None
    character_name: str = ""


class Project(ProjectBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_generated_card: Optional[str] = None

    context_cards: List["ContextCard"] = Relationship(back_populates="project")
    lorebook_entries: List["LorebookEntry"] = Relationship(back_populates="project")


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    character_name: Optional[str] = None
    last_generated_card: Optional[str] = None


class ProjectRead(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    last_generated_card: Optional[str] = None
