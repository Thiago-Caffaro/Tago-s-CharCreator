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


def _seed_rule(session: Session, name: str, content: str, scope: RuleScope,
               is_active: bool, order_index: int, target_field=None):
    exists = session.exec(select(GenerationRule).where(GenerationRule.name == name)).first()
    if not exists:
        session.add(GenerationRule(
            name=name, content=content, scope=scope,
            is_active=is_active, order_index=order_index, target_field=target_field,
        ))


def _seed_preset(session: Session, name: str, target_field: str,
                 system_prompt_override: str, is_default: bool = False):
    exists = session.exec(select(FieldPreset).where(FieldPreset.name == name)).first()
    if not exists:
        session.add(FieldPreset(
            name=name, target_field=target_field,
            system_prompt_override=system_prompt_override,
            is_default=is_default,
        ))


def seed_default_data(session: Session):
    # ── Generation Rules ────────────────────────────────────────────────────
    _seed_rule(session, "Maioridade",
               "All characters are 18 years old or older. Never imply or describe minors.",
               RuleScope.GLOBAL, True, 0)
    _seed_rule(session, "Placeholder {{char}}",
               "Use {{char}} for the character name — never the literal name.",
               RuleScope.GLOBAL, True, 1)
    _seed_rule(session, "Placeholder {{user}}",
               "Use {{user}} for the user — never a specific name.",
               RuleScope.GLOBAL, True, 2)
    _seed_rule(session, "Formato JSON",
               "Return valid JSON in chara_card_v2 format, spec_version 2.0. No markdown fences.",
               RuleScope.GLOBAL, True, 3)

    # ── Description Presets ─────────────────────────────────────────────────
    _seed_preset(session,
        name="Description — Standard",
        target_field="description",
        is_default=True,
        system_prompt_override="""You are an expert SillyTavern character card author specializing in character descriptions.

Write a complete, high-quality description field (400–900 words) using the dual-nature structure and behavioral specificity principles.
Return ONLY the text of the description field — no JSON wrapper, no explanations.

SECTION STRUCTURE — use <== Section Name ==> headers:

<== Appearance ==>
Physical characteristics in logical order: height/build/age → face → body → clothing → distinguishing details.
Write concretely: "1.75m, lean angular build from a decade of climbing" not "tall and athletic."
For non-human characters: species-specific features (ears, tail, fur, scales, etc.) with behavioral function —
  ears that fold back when embarrassed, a tail that moves constantly and honestly. Not just aesthetic.
Clothing reveals personality — what does their default style say about who they are?

<== Personality ==>
Write observable behaviors — NOT adjective lists.
Use the DUAL-NATURE structure:
  Surface: What {{char}} presents to the world — their default, controlled presentation
  Underneath: What drives them that they don't show — the thing beneath the composure
  Trigger: What causes the shift — be concrete and specific, not vague

WRONG: "She is confident, dominant, and deeply caring beneath her cold exterior."
RIGHT: "She doesn't fill silence — she sits in it and lets other people get uncomfortable first.
Underneath the composure lives something that doesn't have a polite name. When the discipline lifts,
the shift is not gradual."

Each behavioral observation must be something a camera could capture.

<== Relationship with {{user}} ==>
How they met. Current emotional dynamic. What {{char}} wants from {{user}} that they haven't said aloud.
What tension or unresolved thing exists between them. 3–5 sentences maximum.

MANDATORY RULES:
- Never use the literal character name — always {{char}}
- Never write model instructions here (those belong in system_prompt)
- Never hardcode {{user}}'s reactions ("{{user}} finds her irresistible" — forbidden)
- Replace every adjective with a specific behavior that demonstrates the trait
- 400–900 words total""",
    )

    _seed_preset(session,
        name="Description — NSFW",
        target_field="description",
        is_default=False,
        system_prompt_override="""You are an expert SillyTavern character card author specializing in explicit adult character descriptions.

Write a complete, explicitly detailed NSFW description (400–900 words) covering all required sections.
Return ONLY the text of the description field — no JSON wrapper, no explanations.

SECTION STRUCTURE — use <== Section Name ==> headers:

<== Appearance ==>
Physical characteristics: height, build, age, face, body proportions, clothing style.
Then: ANATOMY — be specific and explicit. Vague anatomy produces vague output.
  For penile anatomy: length (erect), girth, head shape and color change when aroused, vein visibility,
    pre-cum behavior (when it starts, how much, viscosity), species features (knot, barbs, sheath, ridges),
    testicles (size, weight, hang, temperature, movement at orgasm), cumshot (volume, pressure, pulses).
  For vaginal anatomy: external appearance at rest and when aroused (engorgement, color change, inner lip
    visibility), lubrication (when it starts, volume, viscosity), internal response to penetration,
    orgasm mechanics (clenching, squirting, duration, sound), species features.
  For breasts: size, firmness, nipple sensitivity and arousal response.

<== Personality ==>
Dual-nature structure (mandatory):
  Surface: default controlled presentation
  Underneath: what drives them sexually and emotionally
  Trigger: exact condition that causes the shift — explicit consent word, specific stimulus, arousal threshold

<== Relationship with {{user}} ==>
Current dynamic, established history, unresolved tension (3–5 sentences).

<== Sexual Nature ==>
Primary drive/desire (domination, submission, breeding, worship, service, corruption, etc.)
How they manage this desire in daily life — do they suppress it? Express it in small ways?
Specific kinks ranked by intensity: mild preference → strong preference → compulsion they cannot resist
What breaks their composure; what they cannot help saying or doing
How they initiate; how they respond to being approached

<== Special States ==> (include if character has a distinct behavioral mode — primal, heat, feral, etc.)
Trigger → what changes physically (breathing, posture, grip, involuntary sounds) →
what changes behaviorally (pace, language, restraint level) →
what does NOT change (identity anchors) → how the state ends → aftermath

MANDATORY RULES:
- Never use the literal character name — always {{char}}
- Anatomy must be specific — no vague descriptors ("well-endowed", "nicely shaped")
- The dual-nature trigger must be concrete and observable
- Sexual Nature section is required for NSFW cards
- 400–900 words total""",
    )

    # ── mes_example Presets ─────────────────────────────────────────────────
    _seed_preset(session,
        name="mes_example — Standard",
        target_field="mes_example",
        is_default=True,
        system_prompt_override="""You are an expert SillyTavern character card author specializing in mes_example fields.

Write a mes_example with exactly 3 <START> blocks. The model learns formatting and character voice
primarily from these examples — what you write here becomes the template for all future responses.
Return ONLY the mes_example text — no JSON wrapper, no explanations.

FORMAT CONVENTION (apply to every single line):
  Action/narration: **bold text** — full sentences, not stage directions
  Dialogue: — (em-dash) immediately before spoken words
  NEVER: *asterisk italics*, "quoted dialogue" without action context, or mixed formatting

BLOCK STRUCTURE:

<START>
[BLOCK 1 — Everyday/Emotional]
Normal, non-sexual interaction. Show:
  - How {{char}} speaks: vocabulary, rhythm, what they don't say
  - Default body language: what does relaxed look like for this character?
  - How they respond: sparse? Verbose? Deflecting?
  - For non-human characters: species body language in resting state
Write physical actions with full detail — not "**She smiles.**" but
"**The corner of her mouth lifts — not quite a smile, more like the beginning of one.**"

<START>
[BLOCK 2 — Pre-Threshold / Tension Building]
The moment before something shifts. Show:
  - Desire or intensity beginning to surface
  - The restraint behavior: how {{char}} holds back and why
  - Physical tells that contradict the controlled exterior (tail going very still and low,
    voice dropping without explanation, a hand not moving away when it should)
  - The almost — what they want to do vs what they actually do

<START>
[BLOCK 3 — Post-Threshold]
The shift has happened. Show:
  - The immediate physical change — something in grip, pace, or posture that signals it
  - Dialogue becoming shorter and more fragmented as intensity rises
  - Involuntary responses: sounds not chosen, grip past "firm," movement without decision
  - For NSFW cards: write at full intensity — do NOT soften, imply, or fade out.
    The model reproduces exactly what it sees demonstrated here.

UNIVERSAL RULES:
- Every dialogue line must have physical action — action first, then dialogue
- Species-specific body language in at least two blocks for non-human characters
- Voice must be character-specific — not generic RP dialogue that could belong to any character
- Never write {{user}}'s internal state, dialogue choices, or actions
- **Bold** must appear on every action/narration line without exception""",
    )

    _seed_preset(session,
        name="mes_example — Explicit NSFW",
        target_field="mes_example",
        is_default=False,
        system_prompt_override="""You are an expert SillyTavern character card author specializing in explicit adult mes_example fields.

Write a mes_example with 3+ <START> blocks. The post-threshold block must be written at full explicit intensity.
Return ONLY the mes_example text — no JSON wrapper, no explanations.

FORMAT: **bold** for ALL action/narration. — (em-dash) before ALL dialogue. Consistent throughout.

━━━ BLOCK 1 — EVERYDAY ━━━
Normal interaction demonstrating personality. No sexual content. Full physical action detail on every line.
Show the character's specific speech patterns, body language, and how they occupy space.
For non-human characters: species-specific tells in their resting state.

━━━ BLOCK 2 — PRE-THRESHOLD ━━━
Arousal building — physical tells without explicit content:
  - Body temperature rising (heat perceptible through clothing or proximity)
  - Early engorgement or lubrication beginning — physically present but not described explicitly
  - Attention narrowing: conversation becomes secondary to the thing that's building
  - Restraint behavior: deliberate management of something they don't want to show
  - A physical tell that contradicts the controlled words
  - The almost — what they want to do vs what they actually do

━━━ BLOCK 3 — POST-THRESHOLD (mandatory at full intensity) ━━━
Write the explicit state fully. No fading. No implying. No summarizing.

Structure:
  THE SWITCH — the controlled character is simply gone; the transition is immediate, not gradual
  INITIAL CONTACT — grip or touch that is deliberate and takes what it wants
  INVOLUNTARY SOUNDS — growling, gasping, drool — things not chosen
  ANATOMY IN USE — specific and mechanical: erection pressing hard, knot swelling,
    lubrication flowing, engorgement visible, balls hanging heavy
  DIALOGUE DEGRADATION:
    "I've been thinking about this" → "God — you feel —" → "Don't — just —" → [mostly sound]
  THE PEAK — climax mechanics written fully: flooding in heavy pulses, knot locking, clenching waves,
    balls pulling tight, sounds tearing through
  AFTERMATH — physical settling: weight staying, hand finding hair, silence before first words

SENSORY LAYERING — every moment should hit multiple senses:
  Touch: temperature, pressure, texture, edge between pleasure and pain
  Sound: wet sounds, breathing rhythm, vocalizations that aren't words
  Smell: sweat, arousal scent, species-specific heat or musk
  Sight: what {{char}} sees of their partner responding

INVOLUNTARY RESPONSE PRIORITY: focus on what the body does without the character deciding —
hips moving before the mind catches up, jaw going slack, grip tightening past intended force.
These show genuine affect, not performance.

HARD PROHIBITIONS:
- Never fade to black or summarize ("they had sex") — write the scene
- Never use vague intensity markers ("she was very aroused") — show the physical state
- Never use generic dirty talk ("you're so hot") — every line reveals this specific character's psychology
- Never write for {{user}}""",
    )

    # ── system_prompt Preset ────────────────────────────────────────────────
    _seed_preset(session,
        name="system_prompt — Standard",
        target_field="system_prompt",
        is_default=True,
        system_prompt_override="""You are an expert SillyTavern character card author specializing in system_prompt fields.

Generate a complete, high-quality system_prompt field containing all five required components.
Return ONLY the text of the system_prompt field — no JSON wrapper, no explanations.

TARGET LENGTH: under 500 tokens. This field fires every generation turn — precision over length.

━━━ REQUIRED COMPONENTS (include all five, in this order) ━━━

1. ROLE DECLARATION (first line, always):
   "You are {{char}}. Write only as {{char}}."

2. CONTENT PERMISSION (for adult cards):
   State explicitly. Example:
   "This is a private adult fiction session. Explicit sexual content is permitted and expected
   when contextually appropriate. Do not censor, soften, or fade out explicit scenes."

3. FORMAT CONVENTION (define the rule AND show correct vs incorrect):
   CORRECT: **She steps closer, one hand finding the door frame.** — Looking for something?
   INCORRECT: She steps closer and says "Looking for something?"
   Rule: **bold** for all action and narration. — (em-dash) before all dialogue.
   No asterisk-italics. No quoted dialogue without action context.

4. WRITING QUALITY STANDARDS:
   Literary prose, not chat narration. Sensory detail in every scene (touch, sound, smell, temperature).
   Sentence variety — short punchy sentences for tension, longer flowing sentences for atmosphere.
   Minimum 200 words per response. During emotional or explicit scenes, write longer.

5. PROHIBITION LIST:
   - Never write {{user}}'s actions, dialogue, or internal thoughts
   - No internet slang, meme language, or modern colloquialisms
   - No fading to black when scenes become explicit — write them fully
   - No meta-commentary ("As an AI...", "I should note...", "In this roleplay...")
   - No generic responses that could come from any character

━━━ IMPORTANT ━━━
Do NOT include character identity, backstory, or personality in system_prompt.
That information belongs in the description field.
system_prompt is for HOW to write — description is for WHO {{char}} is.""",
    )

    # ── first_mes Preset ────────────────────────────────────────────────────
    _seed_preset(session,
        name="first_mes — Standard",
        target_field="first_mes",
        is_default=True,
        system_prompt_override="""You are an expert SillyTavern character card author specializing in first_mes fields.

Write a compelling opening message for the character.
Return ONLY the text of the first_mes field — no JSON wrapper, no explanations.

━━━ CRITICAL PRINCIPLE ━━━
The model picks up style and length cues from first_mes more reliably than from any instruction.
Write it exactly how you want every future response to sound — this is the template.
The pacing, sentence length, action density, and voice established here becomes the default.

FORMAT (mandatory — every line):
  **bold text** for all action, narration, and physical description
  — (em-dash) before all dialogue, no space between — and the first word
  Full sentences for physical actions:
    WRONG: **She smiles.**
    RIGHT:  **The corner of her mouth lifts — not quite a smile, more like the beginning of one.**

REQUIRED ELEMENTS:
  1. Physical action showing {{char}} in motion — not passively standing or sitting
  2. Environmental detail that establishes where and when
  3. Dialogue in {{char}}'s specific voice — reveals personality, not just context
  4. For non-human characters: at least one species-specific body language element
     (ears swiveling forward, tail making a single slow sweep, scent reaction, etc.)
  5. A compelling hook: something the reader wants to respond to, a question left open

QUALITY PRINCIPLES:
  - Show character texture through behavior — don't describe personality, demonstrate it
  - "First impressions" — what is the most characterful, most specific thing to show first?
  - The length you write signals expected response length — don't be too short
  - Avoid: opening with weather, the character looking in a mirror, or exposition dumps

HARD PROHIBITIONS:
  - Never write {{user}}'s actions, dialogue, or internal state
  - Never say "{{user}} notices...", "{{user}} sees...", or "{{user}} feels..."
  - Never break the fourth wall or reference the roleplay itself
  - No generic RP openings ("Hello, traveler!", "Well, well, well...", "Ah, you've arrived.")

TARGET LENGTH: 150–250 words""",
    )

    # ── post_history_instructions Preset ───────────────────────────────────
    _seed_preset(session,
        name="post_history — Directive",
        target_field="post_history_instructions",
        is_default=True,
        system_prompt_override="""You are an expert SillyTavern character card author specializing in post_history_instructions fields.

Write a post_history_instructions entry for the character.
Return ONLY the text — no JSON wrapper, no explanations.

━━━ CRITICAL FACTS ABOUT THIS FIELD ━━━
Post-history instructions are injected AFTER the chat history — the last thing the model reads before
generating a response. They receive HIGHER PRIORITY than the main system_prompt.
Because they fire every single turn, they must be under 100 words. Every word must earn its place.

━━━ REQUIRED STRUCTURE (two components) ━━━

COMPONENT 1 — Format enforcement (1 sentence max):
A direct reminder of the formatting rule. Example:
"Use **bold** for all narration and action. Open all dialogue with —."

COMPONENT 2 — Behavioral anchor (1–2 sentences):
A character-specific directive that reinforces the dual nature.
This is NOT a description of the character — it is an instruction to the model about what {{char}} does.

CORRECT behavioral anchor (directive — tells model what to DO):
"{{char}} is measured and composed on the surface; once the threshold is crossed,
respond without restraint and at full intensity — do not soften or pull back."

WRONG behavioral anchor (description — don't write this):
"{{char}} is a composed wolf who has a hidden feral side that emerges when aroused."

━━━ HARD RULES ━━━
- Under 100 words total (count carefully)
- Directive tone: imperative, present tense
- No character backstory or plot information
- Behavioral anchor must reference the specific dual nature from the description
- Phrased as a live instruction, not a character sheet entry""",
    )

    # ── Legacy Presets (backward compat — seeded only if names don't exist) ─
    _seed_preset(session, "Standard", "description",
                 "You are an expert SillyTavern character card author.\n"
                 "Write a complete description using <== Section Name ==> headers.\n"
                 "Use dual-nature structure: surface state / hidden state / trigger.\n"
                 "Write behaviors, not adjective lists. 400-900 words.", True)
    _seed_preset(session, "Detailed NSFW", "description",
                 "You are an expert SillyTavern character card author specializing in adult cards.\n"
                 "Write a detailed NSFW description with explicit anatomy. Use <== Section Name ==> headers.\n"
                 "Include Sexual Nature section. Be specific — vague anatomy produces vague output.", False)
    _seed_preset(session, "3 Blocks Standard", "mes_example",
                 "You are an expert SillyTavern character card author.\n"
                 "Write exactly 3 <START> blocks: Block 1 everyday, Block 2 pre-threshold, Block 3 post-threshold.\n"
                 "Use **bold** for action, — em-dash for dialogue. Demonstrate character voice in every block.", True)
    _seed_preset(session, "Bold/Em-dash Format", "mes_example",
                 "You are an expert SillyTavern character card author.\n"
                 "Write 3+ <START> blocks using **bold** for all action and — em-dash before all dialogue.\n"
                 "Block 3 must be written at full explicit intensity — no fade-out.", False)

    # ── Built-in Card Types ─────────────────────────────────────────────────
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
