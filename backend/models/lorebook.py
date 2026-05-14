from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .project import Project


class LorebookEntryBase(SQLModel):
    name: str = ""
    keys: str = "[]"
    secondary_keys: str = "[]"
    content: str = ""
    enabled: bool = True
    insertion_order: int = 10
    position: int = 1
    constant: bool = False
    selective: bool = False
    probability: int = 100
    depth: int = 4
    comment: str = ""


class LorebookEntry(LorebookEntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")

    project: Optional["Project"] = Relationship(back_populates="lorebook_entries")


class LorebookEntryCreate(LorebookEntryBase):
    pass


class LorebookEntryUpdate(SQLModel):
    name: Optional[str] = None
    keys: Optional[str] = None
    secondary_keys: Optional[str] = None
    content: Optional[str] = None
    enabled: Optional[bool] = None
    insertion_order: Optional[int] = None
    position: Optional[int] = None
    constant: Optional[bool] = None
    selective: Optional[bool] = None
    probability: Optional[int] = None
    depth: Optional[int] = None
    comment: Optional[str] = None


class LorebookEntryRead(LorebookEntryBase):
    id: int
    project_id: int
