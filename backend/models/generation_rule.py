from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum


class RuleScope(str, Enum):
    GLOBAL = "global"
    PER_FIELD = "per_field"


class GenerationRuleBase(SQLModel):
    name: str
    content: str
    scope: RuleScope = RuleScope.GLOBAL
    target_field: Optional[str] = None
    is_active: bool = True
    order_index: int = 0


class GenerationRule(GenerationRuleBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class GenerationRuleCreate(GenerationRuleBase):
    pass


class GenerationRuleUpdate(SQLModel):
    name: Optional[str] = None
    content: Optional[str] = None
    scope: Optional[RuleScope] = None
    target_field: Optional[str] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None


class GenerationRuleRead(GenerationRuleBase):
    id: int


class ReorderItem(SQLModel):
    id: int
    order_index: int
