from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from .project import Project


class CardType(str, Enum):
    APPEARANCE = "appearance"
    PERSONALITY = "personality"
    SPECIAL_STATE = "special_state"
    RELATIONSHIP = "relationship"
    SEXUAL_NATURE = "sexual_nature"
    WORLD_LORE = "world_lore"
    SCENARIO = "scenario"
    CREATOR_NOTES = "creator_notes"
    CUSTOM = "custom"


class ContextCardBase(SQLModel):
    title: str
    card_type: CardType = CardType.CUSTOM
    content: str = ""
    is_active: bool = True
    order_index: int = 0
    target_field: Optional[str] = None


class ContextCard(ContextCardBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    project: Optional["Project"] = Relationship(back_populates="context_cards")


class ContextCardCreate(ContextCardBase):
    pass


class ContextCardUpdate(SQLModel):
    title: Optional[str] = None
    card_type: Optional[CardType] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None
    target_field: Optional[str] = None


class ContextCardRead(ContextCardBase):
    id: int
    project_id: int
    created_at: datetime


class ReorderItem(SQLModel):
    id: int
    order_index: int
