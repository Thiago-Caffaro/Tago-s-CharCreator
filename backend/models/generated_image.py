from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class GeneratedImageBase(SQLModel):
    filename: str
    prompt: str
    negative_prompt: str = ""
    model: str
    provider: str = "openrouter"  # "openrouter" | "kie_ai"
    width: int = 1024
    height: int = 1024
    seed: Optional[int] = None
    preset_id: Optional[int] = Field(default=None, foreign_key="imagepreset.id")
    is_avatar: bool = False


class GeneratedImage(GeneratedImageBase, table=True):
    __tablename__ = "generatedimage"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GeneratedImageCreate(GeneratedImageBase):
    pass


class GeneratedImageRead(GeneratedImageBase):
    id: int
    project_id: int
    created_at: datetime
