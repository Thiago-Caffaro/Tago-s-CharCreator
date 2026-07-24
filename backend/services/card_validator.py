import json
from typing import Optional

# Structural validation only — presence and type of each field. Quality
# heuristics (word counts, section counts, format conventions) are
# intentionally not duplicated here: those are advisory, not hard failures,
# and already live in QualityChecklist.tsx as the single source of truth.
STRING_FIELDS = [
    "name", "description", "personality", "first_mes", "mes_example",
    "scenario", "creator_notes", "system_prompt", "post_history_instructions",
    "talkativeness", "creator", "character_version", "avatar",
]
ARRAY_OF_STRING_FIELDS = ["alternate_greetings", "tags"]
REQUIRED_FIELDS = STRING_FIELDS + ARRAY_OF_STRING_FIELDS


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

    # Catches a model returning e.g. a number or null for a text field —
    # "field present" alone lets that slip through and breaks the exported
    # card downstream (SillyTavern expects every one of these as a string).
    for field in STRING_FIELDS:
        value = card_data.get(field)
        if value is not None and not isinstance(value, str):
            errors.append(f"'{field}' deve ser texto (recebido {type(value).__name__})")

    for field in ARRAY_OF_STRING_FIELDS:
        value = card_data.get(field)
        if value is not None:
            if not isinstance(value, list):
                errors.append(f"'{field}' deve ser um array")
            elif not all(isinstance(item, str) for item in value):
                errors.append(f"'{field}' deve conter apenas strings")

    mes_example = card_data.get("mes_example")
    if isinstance(mes_example, str) and mes_example and not mes_example.strip().startswith("<START>"):
        errors.append("mes_example deve começar com <START>")

    return len(errors) == 0, data, errors
