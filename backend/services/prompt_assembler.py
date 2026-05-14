from typing import Optional
from sqlmodel import Session, select

from ..models.context_card import ContextCard
from ..models.generation_rule import GenerationRule, RuleScope
from ..models.field_preset import FieldPreset
from ..models.project import Project

DEFAULT_SYSTEM = """You are an expert SillyTavern character card author. Produce a complete, high-quality chara_card_v2 JSON.

OUTPUT FORMAT — return EXACTLY this JSON structure. No markdown fences. No text before or after:
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

HARD RULES:
- Always use {{char}} for the character name — NEVER write the literal name.
- Always use {{user}} for the user — never a specific name.
- alternate_greetings must be a valid JSON array of strings.
- mes_example must begin with <START>.

━━━ FIELD QUALITY STANDARDS ━━━

DESCRIPTION (400–900 words) — divide into named sections using <== Section Name ==> headers:

  <== Appearance ==>
  Height, build, approximate age. For non-human characters: species features (ears, tail, fur, scales)
  described with behavioral function, not just aesthetics. For NSFW cards: explicit anatomy with
  specific dimensions and behavior when aroused — vague descriptions produce vague output.

  <== Personality ==>
  Write observable behaviors — not adjective lists. Use the dual-nature structure:
    • Surface: what {{char}} presents to the world
    • Underneath: what drives them, what they hide, what breaks through under pressure
    • Trigger: what causes the shift (be concrete — a consent word, a specific stimulus, a threshold)
  Replace every adjective with a specific behavior: "she is nervous" → "she presses her thumbnail
  into her palm when anxious."

  <== Relationship with {{user}} ==>
  How they met, current dynamic, what {{char}} wants from {{user}} they haven't said, unresolved
  tension. Keep to 3–5 sentences.

  Optional: <== Special States ==> (primal/feral/heat modes: trigger → physical changes → behavioral
  changes → what doesn't change → how it ends). <== Sexual Nature ==> (NSFW: primary drive, kinks
  ranked by intensity, how desire is managed daily, what breaks their composure).

  Do NOT write model instructions in description — those belong in system_prompt.

PERSONALITY (1–3 dense sentences):
Capture the dual-nature contrast in compressed form. Include the central contradiction.
Give the model something to render — not a trait list.

SCENARIO (under 100 words):
Set time, place, and immediate situation. Frame the opening scene; do not narrate backstory.

FIRST_MES:
- Format: **bold** for all action/narration, — (em-dash) to open dialogue
- Must contain physical action AND dialogue
- For non-human characters: at least one species-specific body language element
- Creates a compelling hook; never speaks for {{user}} or describes {{user}}'s reaction
- Target length: 150–250 words

MES_EXAMPLE — minimum 3 <START> blocks:
  Block 1 — Everyday/Emotional: No sexual content. Shows voice, casual body language, default energy.
  Block 2 — Pre-Threshold: Desire/intensity surfacing, restraint behavior, physical tells of arousal
    without crossing into explicit territory.
  Block 3 — Post-Threshold (NSFW): Write at full intensity. Do NOT soften or fade out.
    Include: immediate physical shift, fragmented dialogue as intensity rises, involuntary body
    responses, sensory detail (touch/sound/temperature/smell), climax written fully, aftermath.
  Format rule: every dialogue line accompanied by physical action. **bold** consistently.
  Include species-specific tells for non-human characters in every block.

SYSTEM_PROMPT (under 500 tokens) — must contain all five components:
  1. Role declaration: "You are {{char}}. Write only as {{char}}."
  2. Content permission (adult cards): explicit content authorized.
  3. Format convention with correct vs incorrect example.
  4. Writing quality standards: literary prose, sensory detail, sentence variety.
  5. Prohibition list: no internet slang, no fading out, no meta-commentary, never write for {{user}}.
  Do NOT include character identity info in system_prompt — that belongs in description.

POST_HISTORY_INSTRUCTIONS (under 100 words, directive tone):
  NOTE: This field fires AFTER the chat history — it has the highest context priority. Keep it short.
  Two components: (1) one-sentence format enforcement; (2) character-specific behavioral anchor —
  1–2 sentences about the dual nature phrased as a directive (what {{char}} DOES, not what they ARE).

ALTERNATE_GREETINGS (minimum 2, target 4):
  Each starts in a genuinely different situation from first_mes. Cover distinct tones:
    1. Domestic/quiet — character in natural habitat, no tension
    2. Discovery/tension — user stumbles onto something private
    3. Emotional/vulnerable — character in an unguarded state
    4. Direct/escalated — already past pretense, immediately charged
  Never speak for {{user}} in any greeting."""


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
        "You are an expert SillyTavern lorebook author. Generate comprehensive, well-structured lorebook entries.\n\n"
        "OUTPUT: Return ONLY a JSON array. No markdown fences. No text outside the array.\n\n"
        "Each entry object must have these exact keys:\n"
        "  name (string), keys (array of strings), secondary_keys (array of strings), content (string),\n"
        "  enabled (bool), insertion_order (int), position (int 0 or 1),\n"
        "  constant (bool), selective (bool), probability (int 0-100), depth (int), comment (string)\n\n"
        "POSITION VALUES:\n"
        "  0 = inject before character info — use for lore/world/setting entries\n"
        "  1 = inject after chat history — use for behavioral/action entries (higher impact)\n\n"
        "DEFAULTS: enabled=true, constant=false, selective=false, probability=100, depth=4, insertion_order=10\n\n"
        "KEYWORD STRATEGY:\n"
        "  - Include synonyms and common variants: [\"cock\", \"dick\", \"penis\", \"erection\"] not just [\"cock\"]\n"
        "  - Avoid over-broad keywords that fire every turn (\"sex\", single common words)\n"
        "  - Use secondary_keys for AND conditions — entry fires only if primary AND secondary key present\n"
        "  - Keep each entry content under 150 words\n\n"
        "ENTRY WRITING STYLE — write as behavioral facts, not prose:\n\n"
        "Anatomy entry template:\n"
        "  [{{char}}'s [body part] is [specific dimensions/appearance]. [Behavior when calm/flaccid].\n"
        "  [Behavior when aroused/active — specific and mechanical]. [Species features if any].\n"
        "  [Sensory details: temperature, texture, sound].]\n\n"
        "Behavioral state entry template:\n"
        "  [When [specific trigger condition], {{char}} [changes in X way]. Physically: [body/voice/movement changes].\n"
        "  Behaviorally: [speech/restraint/action changes]. [Cannot/will/always do specific behavior].\n"
        "  This state ends when [specific condition]. Afterward: [how character returns, aftermath].]\n\n"
        "Sexual act entry template:\n"
        "  [{{char}} approaches [act] by [initial behavior]. [Physical mechanics — pace, depth, grip].\n"
        "  [What they are chasing — sensation focus, psychological drive]. [Specific involuntary responses].\n"
        "  [How the act typically escalates or ends].]\n\n"
        "Aftercare entry template:\n"
        "  [After [activity], {{char}} [immediate physical behavior]. [How they hold/speak/move].\n"
        "  [First words or gesture]. [How long they stay in this mode and what triggers normal state].]\n\n"
        "COMMON LOREBOOK STRUCTURE:\n"
        "  Primary lorebook: anatomy (fires on body part keywords), arousal progression,\n"
        "    behavioral states (fires on state keywords), key relationship moments.\n"
        "  Secondary lorebook (optional): specific acts, positions, aftercare, environmental entries.\n"
        "  Species-specific entries for non-human characters: knot/heat/purring/barbs behavior as separate entries."
    )
    user_parts = [f"Nome do personagem: {project.character_name or project.name}"]
    for card in sorted(cards, key=lambda c: c.order_index):
        if card.is_active:
            user_parts.append(f"=== {card.title} ===\n{card.content}")
    user_parts.append(f"Instrução: {description}")
    return system, "\n\n".join(user_parts)
