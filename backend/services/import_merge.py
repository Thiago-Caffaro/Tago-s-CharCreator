import re
from typing import Mapping, Any


def normalize_slug(value: str) -> str:
    return re.sub(r"[^a-z0-9_]", "_", value.lower().strip())


def preset_identity(value: Mapping[str, Any]) -> tuple[str, str, bool]:
    return (
        str(value.get("name", "Imported Preset")).strip(),
        str(value.get("target_field", "description")),
        bool(value.get("is_voice", False)),
    )


def type_identity(value: Mapping[str, Any]) -> str:
    return normalize_slug(str(value.get("slug", "")))
