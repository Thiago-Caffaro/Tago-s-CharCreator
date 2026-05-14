from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class FieldPresetBase(SQLModel):
    name: str
    target_field: str
    system_prompt_override: str
    is_default: bool = False


class FieldPreset(FieldPresetBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FieldPresetCreate(FieldPresetBase):
    pass


class FieldPresetUpdate(SQLModel):
    name: Optional[str] = None
    target_field: Optional[str] = None
    system_prompt_override: Optional[str] = None
    is_default: Optional[bool] = None


class FieldPresetRead(FieldPresetBase):
    id: int
    created_at: datetime
