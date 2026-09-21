from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: str = "user"
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, unique=True)
    api_key_encrypted: str = ""
    default_model: str = "z-ai/glm-4.7"
    preferred_provider: str = ""
    max_tokens: int = 6144
    temperature: float = 1.0
    top_p: float = 0.999
    repetition_penalty: float = 1.05
    include_reasoning: bool = False
    reasoning_effort: str = "medium"
    field_max_tokens_json: str = "{}"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AuthSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    revoked_at: Optional[datetime] = None


class UserRead(SQLModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
