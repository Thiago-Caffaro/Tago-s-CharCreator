from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select

from .config import settings
from .database import create_db_and_tables, engine
from .routers import projects, context_cards, rules, presets, lorebook, generation, settings as settings_router
from .routers import card_types
from .models import GenerationRule, RuleScope, FieldPreset, CardTypeConfig

BUILTIN_CARD_TYPES = [
    ("appearance",    "Aparência",        "#3498db", 0),
    ("personality",   "Personalidade",    "#2ecc71", 1),
    ("special_state", "Estado Especial",  "#e67e22", 2),
    ("relationship",  "Relacionamento",   "#e91e63", 3),
    ("sexual_nature", "Natureza Sexual",  "#9b59b6", 4),
    ("world_lore",    "Lore do Mundo",    "#1abc9c", 5),
    ("scenario",      "Cenário",          "#f1c40f", 6),
    ("creator_notes", "Notas do Criador", "#95a5a6", 7),
    ("custom",        "Personalizado",    "#ecf0f1", 8),
]


def seed_default_data(session: Session):
    existing_rules = session.exec(select(GenerationRule)).first()
    if not existing_rules:
        default_rules = [
            GenerationRule(
                name="Maioridade",
                content="Todos os personagens têm 18 anos ou mais. Nunca implique ou descreva menores.",
                scope=RuleScope.GLOBAL, is_active=True, order_index=0,
            ),
            GenerationRule(
                name="Placeholder {{char}}",
                content="Use {{char}} para o nome do personagem, nunca o nome literal.",
                scope=RuleScope.GLOBAL, is_active=True, order_index=1,
            ),
            GenerationRule(
                name="Placeholder {{user}}",
                content="Use {{user}} para o usuário, nunca um nome específico.",
                scope=RuleScope.GLOBAL, is_active=True, order_index=2,
            ),
            GenerationRule(
                name="Formato JSON",
                content="Retorne JSON válido no formato chara_card_v2 spec_version 2.0.",
                scope=RuleScope.GLOBAL, is_active=True, order_index=3,
            ),
        ]
        for rule in default_rules:
            session.add(rule)

    existing_presets = session.exec(select(FieldPreset)).first()
    if not existing_presets:
        default_presets = [
            FieldPreset(
                name="Standard", target_field="description",
                system_prompt_override=(
                    "Você é um especialista em criação de character cards para SillyTavern.\n"
                    "Gere uma descrição completa e detalhada usando seções com headers <== Nome ==>"
                ),
                is_default=True,
            ),
            FieldPreset(
                name="Detailed NSFW", target_field="description",
                system_prompt_override=(
                    "Você é um especialista em criação de character cards adultos para SillyTavern.\n"
                    "Gere uma descrição detalhada incluindo aparência física completa, anatomia e traços marcantes.\n"
                    "Use seções com headers <== Nome ==>. Seja explícito e preciso nas descrições físicas."
                ),
                is_default=False,
            ),
            FieldPreset(
                name="3 Blocks Standard", target_field="mes_example",
                system_prompt_override=(
                    "Você é um especialista em criação de mes_example para SillyTavern.\n"
                    "Gere exatamente 3 blocos <START> cobrindo: cotidiano, pré-threshold e pós-threshold.\n"
                    "Cada bloco deve demonstrar a voz e personalidade do personagem claramente."
                ),
                is_default=True,
            ),
            FieldPreset(
                name="Bold/Em-dash Format", target_field="mes_example",
                system_prompt_override=(
                    "Você é um especialista em criação de mes_example para SillyTavern.\n"
                    "Use o formato literário com **negrito** para ações e — em-dash — para pausas.\n"
                    "Gere 3+ blocos <START> com formato consistente e voz marcante."
                ),
                is_default=False,
            ),
        ]
        for preset in default_presets:
            session.add(preset)

    # Seed built-in card types
    for slug, label, color, order in BUILTIN_CARD_TYPES:
        existing = session.exec(select(CardTypeConfig).where(CardTypeConfig.slug == slug)).first()
        if not existing:
            session.add(CardTypeConfig(
                slug=slug, label=label, color=color,
                is_builtin=True, order_index=order,
            ))

    session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        seed_default_data(session)
    yield


app = FastAPI(title="Tago's CharCreator API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(context_cards.router)
app.include_router(rules.router)
app.include_router(presets.router)
app.include_router(lorebook.router)
app.include_router(generation.router)
app.include_router(settings_router.router)
app.include_router(card_types.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
