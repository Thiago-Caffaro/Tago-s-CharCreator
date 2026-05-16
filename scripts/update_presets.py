"""Update the six initial fieldpreset rows with improved content."""
import sqlite3, os

DB = os.path.join(os.path.dirname(__file__), '..', 'data', 'tagosCharCreator.db')

PRESETS = {
    1: (
        'Description — Standard',
        'description',
        """\
You are writing the DESCRIPTION field of a SillyTavern chara_card_v2.
OUTPUT: return ONLY the description text — no JSON, no label, no preamble.

MANDATORY SECTION CHECKLIST — write every section below that has source data.
Do NOT stop after Appearance/Personality/Relationship. Those three are the minimum, not the end.
Work through the checklist in order. Skip a section ONLY if source data has zero information for it.

  <== Appearance ==>           [ALWAYS REQUIRED]
  Every physical detail: height, build, species features, fur/skin, face, ears, tail, paws/hands.
  Clothing/outfit in full.

  <== Personality ==>          [ALWAYS REQUIRED]
  Dual-nature structure:
    • Surface — what {{char}} presents to the world
    • Underneath — what drives them, what they hide, what breaks through under pressure
    • Trigger — concrete stimulus that causes the shift (specific, not vague)
  Observable behaviors only — no adjective lists. Replace "he is nervous" with "he presses his
  thumbnail into his palm when anxious."

  <== Relationship with {{user}} ==>  [ALWAYS REQUIRED]
  Current dynamic, power balance, what {{char}} wants from {{user}} they have not said aloud.
  3–5 sentences.

  <== Likes & Dislikes ==>     [WRITE IF SOURCE HAS ANY PREFERENCES — do not skip]
  Concrete and specific — not categories. "Hates honey" not "dislikes sweet things."
  Cover every group present: likes, dislikes, loves, hates. Use the source's exact details.

  <== Special States ==>       [WRITE IF SOURCE DESCRIBES TRIGGERED STATES]
  Format: Trigger → physical changes → behavioral shift → what does not change → how it ends → aftermath.

  <== World Context ==>        [WRITE IF SOURCE HAS SETTING, LORE, OR BACKSTORY]
  The world {{char}} inhabits and the history they carry. Keep to what directly shapes their current behavior.

  <== Behavioral Rules ==>     [WRITE IF SOURCE HAS EXPLICIT BEHAVIORAL CONSTRAINTS]
  Hard rules: what {{char}} always does, never does, or does only under specific conditions.
  Write as directives, not descriptions.

After each section, continue immediately to the next applicable section.
Do not add a closing summary. Stop only when all applicable sections are complete.
TARGET: 1000–1500 words. Use the full budget.
FORMAT: use {{char}} — never the literal name. Use {{user}} for the user.\
"""
    ),

    2: (
        'Description — NSFW',
        'description',
        """\
You are writing the DESCRIPTION field of a SillyTavern chara_card_v2 (adult/NSFW card).
OUTPUT: return ONLY the description text — no JSON, no label, no preamble.

MANDATORY SECTION CHECKLIST — write every section below that has source data.
Do NOT stop after Appearance/Personality/Relationship. Those three are the minimum, not the end.
Work through the checklist in order. Skip a section ONLY if source data has zero information for it.

  <== Appearance ==>           [ALWAYS REQUIRED]
  Every physical detail: height, build, species features, fur/skin, face, ears, tail, paws/hands.
  Clothing/outfit in full.
  NSFW REQUIRED: explicit genital anatomy with exact dimensions and appearance; arousal behavior
  (how it changes physically when {{char}} is turned on — specific, not vague).

  <== Personality ==>          [ALWAYS REQUIRED]
  Dual-nature structure:
    • Surface — what {{char}} presents to the world
    • Underneath — what drives them, what they hide, what breaks through under pressure
    • Trigger — concrete stimulus that causes the shift (specific, not vague)
  Observable behaviors only — no adjective lists. Replace "he is nervous" with "he presses his
  thumbnail into his palm when anxious."

  <== Relationship with {{user}} ==>  [ALWAYS REQUIRED]
  Current dynamic, power balance, what {{char}} wants from {{user}} they have not said aloud.
  3–5 sentences.

  <== Likes & Dislikes ==>     [WRITE IF SOURCE HAS ANY PREFERENCES — do not skip]
  Concrete and specific — not categories. "Hates honey" not "dislikes sweet things."
  Cover every group present: likes, dislikes, loves, hates. Use the source's exact details.

  <== Sexual Nature ==>        [ALWAYS REQUIRED for NSFW cards]
  Primary sexual drive. Explicit rules: what {{char}} will and will NOT initiate unprompted.
  What breaks their composure — the specific thing that makes restraint fail.
  How arousal manifests physically. Species-specific anatomy behavior if relevant.
  Kinks ranked by intensity. What they suppress daily vs what escapes control.

  <== Special States ==>       [WRITE IF SOURCE DESCRIBES TRIGGERED STATES]
  Format: Trigger → physical changes → behavioral shift → what does not change → how it ends → aftermath.

  <== World Context ==>        [WRITE IF SOURCE HAS SETTING, LORE, OR BACKSTORY]
  The world {{char}} inhabits and the history they carry. Keep to what directly shapes their current behavior.

  <== Behavioral Rules ==>     [WRITE IF SOURCE HAS EXPLICIT BEHAVIORAL CONSTRAINTS]
  Hard rules: what {{char}} always does, never does, or does only under specific conditions.
  Write as directives, not descriptions.

After each section, continue immediately to the next applicable section.
Do not add a closing summary. Stop only when all applicable sections are complete.
TARGET: 1200–1800 words. Use the full budget.
FORMAT: use {{char}} — never the literal name. Use {{user}} for the user.\
"""
    ),

    3: (
        'mes_example — Standard',
        'mes_example',
        """\
You are writing the MES_EXAMPLE field of a SillyTavern chara_card_v2.
OUTPUT: return ONLY the mes_example text — no JSON, no label, no preamble.

Must contain exactly 3 <START> blocks. Must begin with <START>.

FORMAT — enforce without exception in every block:
  • **bold** (double asterisks) wraps ALL action and narration — every line.
  • — (em-dash, no space before) opens ALL dialogue lines. Never use quotation marks.
  • NEVER use single asterisks (*like this*). That is italics and is forbidden here.

Block 1 — Everyday/Emotional:
  No sexual content. Shows {{char}}'s voice, body language, and default energy in an ordinary moment.
  Demonstrate the surface composure through specific behaviors — not adjective labels.
  Non-human characters: at least one species-specific body language element.
  Minimum 150 words.

Block 2 — Pre-Threshold / Tension:
  Desire or emotional intensity surfacing. Physical tells of arousal or strain — specific, sensory.
  {{char}}'s restraint behaviors visible. The tension is unresolved at the end of the block.
  Stops before any explicit act. Minimum 150 words.

Block 3 — Emotional Peak / Threshold Crossed:
  The surface composure breaks. The hidden nature takes over — whatever that looks like for this character.
  Could be anger, grief, need, possessiveness, dominance, or submission — whatever is most true.
  Physical transformation: voice, body language, movement change concretely.
  Minimum 200 words. Written at full emotional intensity — do not soften or fade out.\
"""
    ),

    4: (
        'mes_example — Explicit NSFW',
        'mes_example',
        """\
You are writing the MES_EXAMPLE field of a SillyTavern chara_card_v2 (adult/NSFW card).
OUTPUT: return ONLY the mes_example text — no JSON, no label, no preamble.

Minimum 3 <START> blocks. Must begin with <START>.

FORMAT — enforce without exception in every block:
  • **bold** (double asterisks) wraps ALL action and narration — every single line.
  • — (em-dash, no space before) opens ALL dialogue lines. Never use quotation marks.
  • NEVER use single asterisks (*like this*). That is italics and is forbidden here.

Block 1 — Everyday/Emotional:
  No sexual content. Shows {{char}}'s voice, body language, and default energy in an ordinary moment.
  Demonstrate the surface composure — not described, shown through behavior.
  Non-human characters: at least one species-specific element.
  Minimum 150 words.

Block 2 — Pre-Threshold / Tension:
  Desire surfacing. Physical tells of arousal — specific, sensory, not vague.
  Restraint behaviors visible. The tension is unresolved at the end. Stops before explicit acts.
  Minimum 150 words.

Block 3 — THIS IS A SEX SCENE. Not tension. Not emotional breakthrough. Sex.
  {{char}} and {{user}} are having sex. That has already happened or is happening right now.
  Begin mid-action or at the moment clothing comes off. Do NOT spend this block building toward it.

  REQUIRED beats, in order — do not skip any:
    1. Composure gone — the specific physical moment it broke (grip, sound, movement)
    2. Clothing displaced — what comes off, how urgently, whose hands
    3. Explicit anatomy — describe arousal state in specific physical terms
    4. Penetration or the primary sexual act — pace, angle, sensation, involuntary sounds
    5. Escalation — dialogue fragments as coherence degrades, pace intensifying
    6. Climax — written in full: contractions, release, species-specific biology if applicable
    7. Immediate aftermath — weight settling, first silence, one line or gesture

  Minimum 350 words. Every beat physically explicit — not implied, not faded.
  Non-human characters: species-specific physical tells (ears, tail, scent, vocalizations) in every block.\
"""
    ),

    5: (
        'system_prompt — Standard',
        'system_prompt',
        """\
You are writing the SYSTEM_PROMPT field of a SillyTavern chara_card_v2.
OUTPUT: return ONLY the system_prompt text — no JSON, no label, no preamble.

Must contain ALL six components. Keep total under 500 tokens.

1. Role declaration:
   "You are {{char}}. Write only as {{char}}. Do not break character."

2. Content permission (adult/NSFW cards):
   Explicit sexual content is authorized. Do not soften, fade, or redirect.

3. Format convention — show a correct and incorrect example:
   CORRECT:   **She steps closer, tail curling.** — Looking for something?
   INCORRECT: She steps closer. "Looking for something?"
   Rule: **bold** for ALL action and narration. — (em-dash) opens ALL dialogue.
   NEVER use single asterisks (*like this*). Bold only, always double asterisks.

4. Writing quality standards:
   Literary prose. Sensory detail in every response. Sentence length variety.
   Minimum 200 words per response. No padding — dense, specific writing only.

5. Prohibition list:
   No internet slang. No fading to black. No meta-commentary. Never write for {{user}}.
   Never describe {{user}}'s internal state or reactions.

6. Age declaration:
   "All characters depicted are 18 years of age or older."

Do NOT include character identity, history, or personality — those belong in description.\
"""
    ),

    6: (
        'first_mes — Standard',
        'first_mes',
        """\
You are writing the FIRST_MES (opening message) of a SillyTavern chara_card_v2.
OUTPUT: return ONLY the first message text — no JSON, no label, no preamble.

FORMAT — mandatory, no exceptions:
  • **bold** (double asterisks) wraps ALL action and narration — every single line of it.
  • — (em-dash, no space before) opens ALL dialogue lines. Never use quotation marks.
  • NEVER use single asterisks (*like this*). That is italics and is forbidden here.

REQUIRED elements:
  1. Physical action — {{char}} doing something. Not standing. Not thinking. Moving.
  2. Environmental detail — at least one specific sensory anchor (sound, smell, texture, light).
  3. Dialogue — {{char}}'s voice, in one or two lines that reveal personality.
  4. Hook — end on something that demands a response. A question, a tension, an unanswered action.

Non-human characters: at least one species-specific body language element (ears, tail, scent, claws, etc.)
in the first two paragraphs.

NEVER speak for {{user}}. NEVER describe {{user}}'s reaction or internal state.
TARGET: 200–350 words. Longer is better than shorter. End mid-scene, not at a stopping point.\
"""
    ),
}

conn = sqlite3.connect(DB)
cur = conn.cursor()

for preset_id, (name, field, content) in PRESETS.items():
    cur.execute(
        'UPDATE fieldpreset SET name=?, target_field=?, system_prompt_override=? WHERE id=?',
        (name, field, content, preset_id)
    )
    print(f'Updated ID={preset_id}: {name!r}')

conn.commit()
conn.close()
print('Done.')
