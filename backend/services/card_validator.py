import json
from typing import Optional


REQUIRED_FIELDS = [
    "name", "description", "personality", "first_mes", "mes_example",
    "scenario", "creator_notes", "system_prompt", "post_history_instructions",
    "alternate_greetings", "tags", "talkativeness", "creator",
    "character_version", "avatar",
]


def validate_card(json_str: str) -> tuple[bool, Optional[dict], list[str]]:
    errors = []
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        return False, None, [f"JSON inválido: {e}"]

    if data.get("spec") != "chara_card_v2":
        errors.append("spec deve ser 'chara_card_v2'")
    if data.get("spec_version") != "2.0":
        errors.append("spec_version deve ser '2.0'")

    card_data = data.get("data", {})
    if not isinstance(card_data, dict):
        errors.append("'data' deve ser um objeto")
        return False, data, errors

    for field in REQUIRED_FIELDS:
        if field not in card_data:
            errors.append(f"Campo obrigatório ausente: '{field}'")

    alt = card_data.get("alternate_greetings")
    if alt is not None and not isinstance(alt, list):
        errors.append("alternate_greetings deve ser um array")

    tags = card_data.get("tags")
    if tags is not None and not isinstance(tags, list):
        errors.append("tags deve ser um array")

    mes_example = card_data.get("mes_example", "")
    if mes_example and not mes_example.strip().startswith("<START>"):
        errors.append("mes_example deve começar com <START>")

    return len(errors) == 0, data, errors
