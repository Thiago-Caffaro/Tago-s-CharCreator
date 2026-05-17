from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class ImagePresetBase(SQLModel):
    name: str
    category: str  # "anime" | "furry" | "nsfw_anime" | "nsfw_furry" | "fetish"
    prompt_prefix: str = ""
    prompt_suffix: str = ""
    negative_prompt: str = ""  # only used by OpenRouter provider
    is_default: bool = False
    order_index: int = 0


class ImagePreset(ImagePresetBase, table=True):
    __tablename__ = "imagepreset"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ImagePresetCreate(ImagePresetBase):
    pass


class ImagePresetUpdate(SQLModel):
    name: Optional[str] = None
    category: Optional[str] = None
    prompt_prefix: Optional[str] = None
    prompt_suffix: Optional[str] = None
    negative_prompt: Optional[str] = None
    is_default: Optional[bool] = None
    order_index: Optional[int] = None


class ImagePresetRead(ImagePresetBase):
    id: int
    created_at: datetime
