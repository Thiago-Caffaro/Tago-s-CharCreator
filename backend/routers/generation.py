from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional

from ..database import get_session
from ..models.project import Project
from ..models.context_card import ContextCard
from ..models.generation_rule import GenerationRule, RuleScope
from ..models.field_preset import FieldPreset
from ..services import prompt_assembler
from ..services.anthropic_client import stream_message, count_tokens

router = APIRouter(prefix="/api/generate", tags=["generation"])


class FullCardRequest(BaseModel):
    project_id: int
    preset_id: Optional[int] = None


class FieldRequest(BaseModel):
    project_id: int
    field_name: str
    preset_id: Optional[int] = None


class RefineRequest(BaseModel):
    project_id: int
    field_name: str
    current_content: str
    instruction: str


class LorebookGenRequest(BaseModel):
    project_id: int
    description: str


class TokenEstimateRequest(BaseModel):
    project_id: int
    preset_id: Optional[int] = None


class FixCardRequest(BaseModel):
    broken_json: str
    errors: list[str]


class FixCheckRequest(BaseModel):
    card_json: str
    check_id: str


_CHECK_REPAIRS: dict[str, dict] = {
    'desc_sections': {
        'fields': ['description'],
        'instruction': (
            'Rewrite "description" organizing all content into named sections using <== Section Name ==> headers. '
            'Required sections: <== Appearance ==>, <== Personality ==>, <== Relationship with {{user}} ==>. '
            'The Personality section must use the dual-nature structure: surface state / underneath / trigger. '
            'Preserve ALL existing character content — only reorganize and add missing structure. '
            'Target: 400–900 words total.'
        ),
    },
    'desc_length': {
        'fields': ['description'],
        'instruction': (
            'Adjust "description" to be between 400 and 900 words. '
            'If too short: expand by adding specific behavioral observations, physical details, and dual-nature depth. '
            'If too long: condense by replacing adjective lists with single concrete behaviors. '
            'Do not change the character\'s core identity, name, or personality.'
        ),
    },
    'personality_short': {
        'fields': ['personality'],
        'instruction': (
            'Condense "personality" into 1–3 dense sentences capturing the character\'s core identity. '
            'Include the dual-nature contrast (surface composure vs. hidden drive) in compressed form. '
            'Write observable character texture — not a trait list. '
            'Every word should give the model something to render.'
        ),
    },
    'scenario_short': {
        'fields': ['scenario'],
        'instruction': (
            'Condense "scenario" to under 100 words while keeping all essential information. '
            'Set time, place, and immediate situation. Frame the opening scene — do not narrate backstory. '
            'Cut anything that belongs in description or creator_notes instead.'
        ),
    },
    'first_mes_nouser': {
        'fields': ['first_mes'],
        'instruction': (
            'Rewrite "first_mes" removing any speech, action, or internal state attributed to {{user}}. '
            'Only {{char}} acts, speaks, and is described. '
            'If the original had {{user}} reactions, replace them with {{char}}\'s physical action or environmental detail. '
            'Maintain format: **bold** for action, — (em-dash) before dialogue.'
        ),
    },
    'mes_three_blocks': {
        'fields': ['mes_example'],
        'instruction': (
            'Rewrite "mes_example" to have at least 3 <START> blocks covering meaningfully different situations: '
            'Block 1 — Everyday/Emotional: normal interaction, no sexual content, shows voice and body language. '
            'Block 2 — Pre-Threshold: desire or intensity surfacing, restraint behavior, physical tells without explicit content. '
            'Block 3 — Post-Threshold: the shift has happened — write at full intensity, do NOT soften or fade out. '
            'Format: **bold** for all action, — (em-dash) before all dialogue. '
            'Every dialogue line must be accompanied by physical action. '
            'For non-human characters: include species-specific body language in every block.'
        ),
    },
    'mes_starts': {
        'fields': ['mes_example'],
        'instruction': (
            'Ensure "mes_example" begins with <START>. '
            'If it does not, add <START>\\n at the very beginning without changing any other content.'
        ),
    },
    'has_system_prompt': {
        'fields': ['system_prompt'],
        'instruction': (
            'Generate a complete "system_prompt" containing all five required components: '
            '1. Role declaration: "You are {{char}}. Write only as {{char}}." '
            '2. Content permission statement (for adult cards: explicit content authorized). '
            '3. Format convention with correct vs incorrect example: '
            '   CORRECT: **She steps closer.** — Looking for something? '
            '   INCORRECT: She steps closer and says "Looking for something?" '
            '4. Writing quality standards: literary prose, sensory detail, sentence variety, min 200 words/response. '
            '5. Prohibition list: no internet slang, no fading out, no meta-commentary, never write for {{user}}. '
            'Keep under 500 tokens. Do NOT include character identity info — that belongs in description.'
        ),
    },
    'has_post_history': {
        'fields': ['post_history_instructions'],
        'instruction': (
            'Generate "post_history_instructions" under 100 words with exactly two components: '
            '1. One-sentence format enforcement: "Use **bold** for all narration. Open dialogue with —." '
            '2. A character-specific behavioral anchor: 1–2 directive sentences about the dual nature, '
            '   phrased as what {{char}} DOES, not what they ARE. '
            '   Example: "{{char}} is composed and measured on the surface; '
            '   once the threshold is crossed, respond without restraint and at full intensity." '
            'Directive tone throughout — imperative, present tense, no backstory, no plot.'
        ),
    },
    'alt_greetings': {
        'fields': ['alternate_greetings'],
        'instruction': (
            'Generate at least 2 alternate_greetings as a JSON array of strings. '
            'Each greeting must start in a genuinely different situation from first_mes. '
            'Cover distinct emotional tones across the greetings: '
            '  domestic/quiet (character in natural habitat, no tension), '
            '  discovery/tension (user stumbles onto something private), '
            '  emotional/vulnerable (character in an unguarded state), '
            '  direct/escalated (already past pretense, immediately charged). '
            'Format: **bold** for action, — (em-dash) before dialogue. '
            'Never speak for {{user}} in any greeting. '
            'Return value must be a valid JSON array: ["greeting one text", "greeting two text"]'
        ),
    },
    'no_hardcoded_name': {
        'fields': ['description', 'personality', 'first_mes', 'mes_example'],
        'instruction': (
            'Replace ALL occurrences of the character\'s literal name with {{char}} '
            'in description, personality, first_mes, and mes_example. '
            'Return only the corrected fields — do not change any other content.'
        ),
    },
    # ── New checks ──────────────────────────────────────────────────────────
    'desc_min_sections': {
        'fields': ['description'],
        'instruction': (
            'Rewrite "description" to have at least 3 named sections using <== Section Name ==> headers. '
            'Required: <== Appearance ==>, <== Personality ==>, <== Relationship with {{user}} ==>. '
            'If the content already exists as prose, reorganize it under the appropriate headers. '
            'Do not change the character\'s identity or content — only add the section structure.'
        ),
    },
    'system_prompt_has_role': {
        'fields': ['system_prompt'],
        'instruction': (
            'Add a role declaration to the beginning of "system_prompt" if it is missing. '
            'The role declaration must be: "You are {{char}}. Write only as {{char}}." '
            'Place it as the very first line. Preserve all existing system_prompt content after it.'
        ),
    },
    'first_mes_has_action': {
        'fields': ['first_mes'],
        'instruction': (
            'Rewrite "first_mes" to use **bold** formatting for all action and narration. '
            'Every physical action, movement, and environmental description must be in **bold**. '
            'Dialogue must open with — (em-dash). '
            'If the original has no physical action, add at least one detailed action sentence '
            'that shows {{char}} in motion before the dialogue. '
            'Maintain the character\'s voice and the scene\'s content.'
        ),
    },
    'post_history_under_100': {
        'fields': ['post_history_instructions'],
        'instruction': (
            'Condense "post_history_instructions" to under 100 words without losing its function. '
            'Keep: the format enforcement reminder and the behavioral anchor for the character\'s dual nature. '
            'Cut: any backstory, description, or plot information. '
            'Directive tone only — imperative, present tense.'
        ),
    },
}


def _load_context(project_id: int, session: Session):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    cards = session.exec(
        select(ContextCard)
        .where(ContextCard.project_id == project_id)
        .order_by(ContextCard.order_index)
    ).all()
    global_rules = session.exec(
        select(GenerationRule)
        .where(GenerationRule.scope == RuleScope.GLOBAL, GenerationRule.is_active == True)
        .order_by(GenerationRule.order_index)
    ).all()
    return project, list(cards), list(global_rules)


@router.post("/full-card")
def generate_full_card(req: FullCardRequest, session: Session = Depends(get_session)):
    project, cards, global_rules = _load_context(req.project_id, session)
    preset = session.get(FieldPreset, req.preset_id) if req.preset_id else None
    system, user = prompt_assembler.build_full_card_prompt(project, cards, global_rules, preset)

    def gen():
        for chunk in stream_message(system, user):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain")


@router.post("/field")
def generate_field(req: FieldRequest, session: Session = Depends(get_session)):
    project, cards, global_rules = _load_context(req.project_id, session)
    field_rules = session.exec(
        select(GenerationRule)
        .where(
            GenerationRule.scope == RuleScope.PER_FIELD,
            GenerationRule.target_field == req.field_name,
            GenerationRule.is_active == True,
        )
    ).all()
    preset = session.get(FieldPreset, req.preset_id) if req.preset_id else None
    system, user = prompt_assembler.build_field_prompt(
        project, cards, req.field_name, global_rules, list(field_rules), preset
    )

    def gen():
        for chunk in stream_message(system, user):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain")


@router.post("/refine")
def refine_field(req: RefineRequest, session: Session = Depends(get_session)):
    project, cards, global_rules = _load_context(req.project_id, session)
    system, user = prompt_assembler.build_refine_prompt(
        req.field_name, req.current_content, req.instruction, global_rules
    )

    def gen():
        for chunk in stream_message(system, user):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain")


@router.post("/lorebook")
def generate_lorebook(req: LorebookGenRequest, session: Session = Depends(get_session)):
    project, cards, global_rules = _load_context(req.project_id, session)
    system, user = prompt_assembler.build_lorebook_prompt(project, cards, req.description, global_rules)

    def gen():
        for chunk in stream_message(system, user):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain")


@router.post("/fix-check")
def fix_check(req: FixCheckRequest):
    repair = _CHECK_REPAIRS.get(req.check_id)
    if not repair:
        raise HTTPException(status_code=400, detail=f"Unknown check_id: {req.check_id}")

    fields = repair["fields"]
    instruction = repair["instruction"]
    fields_list = ", ".join(f'"{f}"' for f in fields)

    system = (
        f"You are an expert SillyTavern character card author. "
        f"Your task is to fix ONLY the fields {fields_list} of the provided card.\n\n"
        f"OUTPUT RULE (mandatory):\n"
        f"Return ONLY a JSON object with exactly the keys {fields_list}. "
        f"No text outside the JSON. No markdown fences. No explanations.\n\n"
        f"QUALITY STANDARD FOR THIS FIX:\n"
        f"{repair.get('instruction', '')}\n\n"
        f"GENERAL RULES:\n"
        f"- Use {{{{char}}}} for the character name — never the literal name\n"
        f"- Use {{{{user}}}} for the user — never a specific name\n"
        f"- Preserve the character's voice, identity, and content unless the fix specifically requires changing it\n"
        f"- Format: **bold** for action/narration, — (em-dash) before dialogue"
    )
    user = (
        f"Apply the fix to the card below.\n\n"
        f"Card:\n{req.card_json}\n\n"
        f"Return the JSON object with only the fixed fields {fields_list}."
    )

    def gen():
        for chunk in stream_message(system, user):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain")


@router.post("/fix-card")
def fix_card(req: FixCardRequest):
    system = """Você é um especialista em reparação de JSON para character cards do SillyTavern.

Sua ÚNICA tarefa é corrigir os erros de validação listados, sem alterar nenhum conteúdo do personagem.

FORMATO DE OUTPUT OBRIGATÓRIO — retorne exatamente esta estrutura:
{
  "spec": "chara_card_v2",
  "spec_version": "2.0",
  "data": {
    "name": "", "description": "", "personality": "", "scenario": "",
    "first_mes": "", "mes_example": "", "creator_notes": "",
    "system_prompt": "", "post_history_instructions": "",
    "alternate_greetings": [], "tags": [],
    "creator": "", "character_version": "1.0", "avatar": "none", "talkativeness": "0.5"
  }
}

REGRAS ESTRITAS:
- Retorne APENAS JSON válido, sem markdown, sem texto explicativo
- NÃO altere nenhum conteúdo existente do personagem (description, personality, first_mes, mes_example, etc.)
- Se o JSON for um objeto plano sem spec/data, envolva todo o conteúdo em data: {}
- Campos array ausentes (alternate_greetings, tags): adicionar como []
- Campos string ausentes: adicionar como string vazia ""
- mes_example DEVE começar com <START> — se não começar, adicione <START>\\n no início"""

    errors_text = "\n".join(f"- {e}" for e in req.errors)
    user = (
        f"Corrija o JSON abaixo resolvendo TODOS estes erros:\n\n"
        f"ERROS:\n{errors_text}\n\n"
        f"JSON:\n{req.broken_json}\n\n"
        f"Retorne o JSON corrigido e completo, sem nenhum texto fora do JSON."
    )

    def gen():
        for chunk in stream_message(system, user):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain")


@router.post("/token-estimate")
def token_estimate(req: TokenEstimateRequest, session: Session = Depends(get_session)):
    project, cards, global_rules = _load_context(req.project_id, session)
    preset = session.get(FieldPreset, req.preset_id) if req.preset_id else None
    system, user = prompt_assembler.build_full_card_prompt(project, cards, global_rules, preset)
    try:
        total = count_tokens(system, user)
    except Exception:
        total = 0
    return {"input_tokens": total}
