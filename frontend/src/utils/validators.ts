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
