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
        'instruction': 'Reescreva "description" organizando em seções com headers <== Nome ==>. Preserve TODO o conteúdo existente.',
    },
    'desc_length': {
        'fields': ['description'],
        'instruction': 'Ajuste "description" para ter entre 400 e 900 palavras. Expanda ou condense sem mudar o personagem.',
    },
    'personality_short': {
        'fields': ['personality'],
        'instruction': 'Condense "personality" em 1 a 3 frases densas que capturem a identidade central do personagem.',
    },
    'scenario_short': {
        'fields': ['scenario'],
        'instruction': 'Condense "scenario" para menos de 100 palavras mantendo as informações essenciais.',
    },
    'first_mes_nouser': {
        'fields': ['first_mes'],
        'instruction': 'Reescreva "first_mes" removendo qualquer fala ou ação atribuída a {{user}}. Só o personagem age.',
    },
    'mes_three_blocks': {
        'fields': ['mes_example'],
        'instruction': 'Reescreva "mes_example" garantindo pelo menos 3 blocos separados por <START>, cada um em situação diferente.',
    },
    'mes_starts': {
        'fields': ['mes_example'],
        'instruction': 'Garanta que "mes_example" começa com <START>. Adicione <START>\\n no início se necessário.',
    },
    'has_system_prompt': {
        'fields': ['system_prompt'],
        'instruction': 'Gere "system_prompt" completo: declaração de papel, permissões de conteúdo, regras de formato e proibições.',
    },
    'has_post_history': {
        'fields': ['post_history_instructions'],
        'instruction': 'Gere "post_history_instructions" em até 100 palavras, diretivo, mantendo a voz do personagem.',
    },
    'alt_greetings': {
        'fields': ['alternate_greetings'],
        'instruction': 'Gere pelo menos 2 alternate_greetings. O valor deve ser um array JSON de strings, cada uma uma saudação diferente.',
    },
    'no_hardcoded_name': {
        'fields': ['description', 'personality', 'first_mes', 'mes_example'],
        'instruction': 'Substitua todas as ocorrências do nome literal do personagem por {{char}} em description, personality, first_mes e mes_example.',
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
        f"Você é um especialista em character cards SillyTavern. "
        f"Sua tarefa é corrigir APENAS os campos {fields_list} do card fornecido.\n\n"
        f"REGRA DE OUTPUT OBRIGATÓRIA:\n"
        f'Retorne APENAS um objeto JSON com exatamente as chaves {fields_list}. '
        f"Nenhum texto fora do JSON. Sem markdown. Sem explicações.\n\n"
        f"Use {{{{char}}}} para o nome do personagem. Use {{{{user}}}} para o usuário."
    )
    user = (
        f"Instrução de correção: {instruction}\n\n"
        f"Card atual:\n{req.card_json}\n\n"
        f"Retorne o objeto JSON com os campos corrigidos."
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
