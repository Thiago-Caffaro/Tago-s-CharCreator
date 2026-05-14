from typing import Optional
from sqlmodel import Session, select

from ..models.context_card import ContextCard
from ..models.generation_rule import GenerationRule, RuleScope
from ..models.field_preset import FieldPreset
from ..models.project import Project

DEFAULT_SYSTEM = """Você é um especialista em criação de character cards para SillyTavern no formato chara_card_v2.

FORMATO DE OUTPUT OBRIGATÓRIO — retorne EXATAMENTE esta estrutura JSON, sem markdown, sem texto antes ou depois:
{
  "spec": "chara_card_v2",
  "spec_version": "2.0",
  "data": {
    "name": "",
    "description": "",
    "personality": "",
    "scenario": "",
    "first_mes": "",
    "mes_example": "",
    "creator_notes": "",
    "system_prompt": "",
    "post_history_instructions": "",
    "alternate_greetings": [],
    "tags": [],
    "creator": "",
    "character_version": "1.0",
    "avatar": "none",
    "talkativeness": "0.5"
  }
}

REGRAS:
- Use {{char}} para o nome do personagem, nunca o nome literal
- Use {{user}} para o usuário
- alternate_greetings deve ser array JSON válido
- mes_example deve começar com <START>

QUALIDADE:
- description: dividida em seções com headers <== Nome ==>
- personality: 1-3 frases densas capturando a identidade central
- first_mes: demonstra voz, formato correto, não fala pelo {{user}}
- mes_example: mínimo 3 blocos <START> cobrindo cotidiano, pré-threshold e pós-threshold
- system_prompt: declaração de papel + permissão de conteúdo + regras de formato + lista de proibições
- post_history_instructions: máximo 100 palavras, diretivo"""


def build_full_card_prompt(
    project: Project,
    cards: list[ContextCard],
    global_rules: list[GenerationRule],
    preset: Optional[FieldPreset] = None,
) -> tuple[str, str]:
    system = preset.system_prompt_override if preset else DEFAULT_SYSTEM
    if global_rules:
        rules_text = "\n".join(f"- {r.content}" for r in global_rules if r.is_active)
        system += f"\n\nREGRAS ADICIONAIS:\n{rules_text}"

    user_parts = [f"Nome do personagem: {project.character_name or project.name}"]
    for card in sorted(cards, key=lambda c: c.order_index):
        if card.is_active:
            user_parts.append(f"=== {card.title} ===\n{card.content}")
    user_parts.append(
        'Com base nesses blocos de contexto, gere um character card completo no formato chara_card_v2 JSON. '
        'Retorne APENAS o JSON válido, sem markdown, sem explicações.'
    )
    return system, "\n\n".join(user_parts)


def build_field_prompt(
    project: Project,
    cards: list[ContextCard],
    field_name: str,
    global_rules: list[GenerationRule],
    field_rules: list[GenerationRule],
    preset: Optional[FieldPreset] = None,
) -> tuple[str, str]:
    system = preset.system_prompt_override if preset else DEFAULT_SYSTEM
    all_rules = [r for r in global_rules if r.is_active] + [r for r in field_rules if r.is_active]
    if all_rules:
        rules_text = "\n".join(f"- {r.content}" for r in all_rules)
        system += f"\n\nREGRAS ADICIONAIS:\n{rules_text}"

    user_parts = [f"Nome do personagem: {project.character_name or project.name}"]
    for card in sorted(cards, key=lambda c: c.order_index):
        if card.is_active:
            user_parts.append(f"=== {card.title} ===\n{card.content}")
    user_parts.append(f"Gere APENAS o campo '{field_name}' do character card. Retorne apenas o texto do campo, sem JSON.")
    return system, "\n\n".join(user_parts)


def build_refine_prompt(
    field_name: str,
    current_content: str,
    instruction: str,
    global_rules: list[GenerationRule],
) -> tuple[str, str]:
    system = DEFAULT_SYSTEM
    if global_rules:
        rules_text = "\n".join(f"- {r.content}" for r in global_rules if r.is_active)
        system += f"\n\nREGRAS ADICIONAIS:\n{rules_text}"

    user = (
        f"Campo a refinar: {field_name}\n\n"
        f"Conteúdo atual:\n{current_content}\n\n"
        f"Instrução de refinamento: {instruction}\n\n"
        f"Retorne apenas o texto refinado do campo, sem JSON, sem explicações."
    )
    return system, user


def build_lorebook_prompt(
    project: Project,
    cards: list[ContextCard],
    description: str,
    global_rules: list[GenerationRule],
) -> tuple[str, str]:
    system = (
        "Você é um especialista em criação de lorebook entries para SillyTavern.\n"
        "Gere entries de lorebook completas em JSON. Formato de saída: array JSON com objetos "
        "contendo: name, keys (array), secondary_keys (array), content, enabled, insertion_order, "
        "position, constant, selective, probability, depth, comment.\n"
        "Retorne APENAS o array JSON, sem markdown."
    )
    user_parts = [f"Nome do personagem: {project.character_name or project.name}"]
    for card in sorted(cards, key=lambda c: c.order_index):
        if card.is_active:
            user_parts.append(f"=== {card.title} ===\n{card.content}")
    user_parts.append(f"Instrução: {description}")
    return system, "\n\n".join(user_parts)
