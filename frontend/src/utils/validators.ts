import type { CharaCardV2 } from '../types'

const REQUIRED_FIELDS = [
  'name', 'description', 'personality', 'first_mes', 'mes_example',
  'scenario', 'creator_notes', 'system_prompt', 'post_history_instructions',
  'alternate_greetings', 'tags', 'talkativeness', 'creator', 'character_version', 'avatar',
]

function extractJson(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (match) return match[1].trim()
  return raw.trim()
}

export function validate_card_client(jsonStr: string): {
  ok: boolean
  card: CharaCardV2 | null
  errors: string[]
} {
  const errors: string[] = []
  let data: any
  try {
    data = JSON.parse(extractJson(jsonStr))
  } catch (e) {
    return { ok: false, card: null, errors: ['JSON inválido'] }
  }

  // Auto-wrap flat objects that are missing the chara_card_v2 envelope
  if (!data.spec && data.name) {
    data = { spec: 'chara_card_v2', spec_version: '2.0', data }
  }

  if (data.spec !== 'chara_card_v2') errors.push("spec deve ser 'chara_card_v2'")
  if (data.spec_version !== '2.0') errors.push("spec_version deve ser '2.0'")

  const d = data.data ?? {}
  for (const f of REQUIRED_FIELDS) {
    if (!(f in d)) errors.push(`Campo obrigatório ausente: '${f}'`)
  }

  if (d.alternate_greetings && !Array.isArray(d.alternate_greetings))
    errors.push('alternate_greetings deve ser array')
  if (d.tags && !Array.isArray(d.tags))
    errors.push('tags deve ser array')
  if (d.mes_example && !d.mes_example.trim().startsWith('<START>'))
    errors.push('mes_example deve começar com <START>')

  return { ok: errors.length === 0, card: errors.length === 0 ? data : null, errors }
}

// Static defaults for every metadata field — never requires AI to fix
const PATCH_DEFAULTS: Record<string, unknown> = {
  creator: 'SillyTavern Author',
  creator_notes: '',
  character_version: '1.0',
  avatar: 'none',
  talkativeness: '0.5',
  tags: [],
  alternate_greetings: [],
}

/**
 * Attempts to fix predictable, cheap errors client-side without any API call.
 * Fixes: missing metadata fields, wrong spec values, array type mismatches,
 * mes_example missing <START>. Returns the patched JSON string and any
 * remaining errors that genuinely require AI intervention.
 */
export function patchCardClient(jsonStr: string): {
  patched: string
  remainingErrors: string[]
  didPatch: boolean
} {
  let data: any
  try {
    data = JSON.parse(extractJson(jsonStr))
  } catch {
    return { patched: jsonStr, remainingErrors: ['JSON inválido'], didPatch: false }
  }

  let changed = false

  // Auto-wrap flat objects missing the chara_card_v2 envelope
  if (!data.spec && data.name) {
    data = { spec: 'chara_card_v2', spec_version: '2.0', data }
    changed = true
  }

  if (data.spec !== 'chara_card_v2') { data.spec = 'chara_card_v2'; changed = true }
  if (data.spec_version !== '2.0') { data.spec_version = '2.0'; changed = true }
  if (!data.data) { data.data = {}; changed = true }

  const d = data.data

  // Inject any missing metadata fields with their known safe defaults
  for (const [field, defaultValue] of Object.entries(PATCH_DEFAULTS)) {
    if (!(field in d)) {
      d[field] = defaultValue
      changed = true
    }
  }

  // Fix array type issues without destroying content
  if (d.alternate_greetings != null && !Array.isArray(d.alternate_greetings)) {
    d.alternate_greetings = [String(d.alternate_greetings)]
    changed = true
  }
  // Unwrap double-encoded alternate_greetings: ["[\"g1\",\"g2\"]"] → ["g1","g2"]
  if (Array.isArray(d.alternate_greetings)
      && d.alternate_greetings.length === 1
      && typeof d.alternate_greetings[0] === 'string'
      && d.alternate_greetings[0].trim().startsWith('[')) {
    try {
      const inner = JSON.parse(d.alternate_greetings[0])
      if (Array.isArray(inner)) {
        d.alternate_greetings = inner
        changed = true
      }
    } catch { /* not double-encoded, leave as-is */ }
  }
  if (d.tags != null && !Array.isArray(d.tags)) {
    d.tags = []
    changed = true
  }

  // Fix mes_example not starting with <START>
  if (typeof d.mes_example === 'string' && d.mes_example.trim() && !d.mes_example.trim().startsWith('<START>')) {
    d.mes_example = '<START>\n' + d.mes_example
    changed = true
  }

  const patched = JSON.stringify(data, null, 2)
  const { errors } = validate_card_client(patched)
  return { patched, remainingErrors: errors, didPatch: changed }
}
