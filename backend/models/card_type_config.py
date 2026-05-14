from sqlmodel import SQLModel, Field
from typing import Optional


class CardTypeConfigBase(SQLModel):
    slug: str
    label: str
    color: str
    is_builtin: bool = False
    order_index: int = 0


class CardTypeConfig(CardTypeConfigBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class CardTypeConfigCreate(SQLModel):
    slug: str
    label: str
    color: str
    order_index: int = 0


class CardTypeConfigUpdate(SQLModel):
    label: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = None


class CardTypeConfigRead(CardTypeConfigBase):
    id: int
