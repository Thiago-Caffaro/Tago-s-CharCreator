from sqlmodel import Session, select

from ..models.generation_rule import GenerationRule, RuleScope

# Shared by the startup seeder (main.py) and the "restore defaults" endpoint
# (routers/rules.py) so both stay in sync with a single source of truth.
DEFAULT_RULES: list[dict] = [
    {
        "name": "Maioridade",
        "content": "All characters are 18 years old or older. Never imply or describe minors.",
        "scope": RuleScope.GLOBAL,
        "order_index": 0,
    },
    {
        "name": "Placeholder {{char}}",
        "content": "Use {{char}} for the character name — never the literal name.",
        "scope": RuleScope.GLOBAL,
        "order_index": 1,
    },
    {
        "name": "Placeholder {{user}}",
        "content": "Use {{user}} for the user — never a specific name.",
        "scope": RuleScope.GLOBAL,
        "order_index": 2,
    },
    {
        "name": "Formato JSON",
        "content": "Return valid JSON in chara_card_v2 format, spec_version 2.0. No markdown fences.",
        "scope": RuleScope.GLOBAL,
        "order_index": 3,
    },
]


def seed_default_rules(session: Session) -> int:
    """Creates any DEFAULT_RULES entries missing by name. Returns how many were created.

    Never touches an existing rule's content/scope/order — only fills in gaps
    left by a deleted builtin rule, so a user's intentional edits to a
    builtin rule's wording are never silently reverted. The one exception is
    is_builtin itself: a rule created by an older version of this app (or by
    the ALTER TABLE auto-migration defaulting the new column to false) is
    retroactively flagged as builtin so it becomes protected, since by
    definition a rule with one of these exact names is one of the defaults.
    """
    created = 0
    for rule_def in DEFAULT_RULES:
        existing = session.exec(
            select(GenerationRule).where(GenerationRule.name == rule_def["name"])
        ).first()
        if existing:
            if not existing.is_builtin:
                existing.is_builtin = True
                session.add(existing)
        else:
            session.add(GenerationRule(**rule_def, is_active=True, is_builtin=True))
            created += 1
    return created
