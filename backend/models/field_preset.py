from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class FieldPresetBase(SQLModel):
    name: str
    # Empty string for voice presets (is_voice=True) — kept as a required
    # string rather than Optional so the existing NOT NULL column doesn't
    # need a migration; "" reads unambiguously as "no specific field" since
    # no real CHARA_FIELDS value is empty.
    target_field: str
    system_prompt_override: str
    is_default: bool = False
    # A voice preset's system_prompt_override is APPENDED to every field's
    # prompt during full-card generation (and auto-applied as the default
    # voice elsewhere), instead of replacing one field's prompt outright.
    is_voice: bool = False


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
    is_voice: Optional[bool] = None


class FieldPresetRead(FieldPresetBase):
    id: int
    created_at: datetime
