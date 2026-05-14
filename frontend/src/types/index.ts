export type { CharaCardV2, LorebookV2, LorebookEntryV2 } from './card'

export type CardType =
  | 'appearance'
  | 'personality'
  | 'special_state'
  | 'relationship'
  | 'sexual_nature'
  | 'world_lore'
  | 'scenario'
  | 'creator_notes'
  | 'custom'

export interface Project {
  id: number
  name: string
  description?: string
  character_name: string
  created_at: string
  updated_at: string
  last_generated_card?: string
}

export interface ContextCard {
  id: number
  project_id: number
  title: string
  card_type: CardType
  content: string
  is_active: boolean
  order_index: number
  target_field?: string
  created_at: string
}

export interface GenerationRule {
  id: number
  name: string
  content: string
  scope: 'global' | 'per_field'
  target_field?: string
  is_active: boolean
  order_index: number
}

export interface FieldPreset {
  id: number
  name: string
  target_field: string
  system_prompt_override: string
  is_default: boolean
  created_at: string
}

export interface LorebookEntry {
  id: number
  project_id: number
  name: string
  keys: string
  secondary_keys: string
  content: string
  enabled: boolean
  insertion_order: number
  position: number
  constant: boolean
  selective: boolean
  probability: number
  depth: number
  comment: string
}

export interface AppSettings {
  api_key_masked: string
  default_model: string
  preferred_provider: string
  max_tokens: number
  temperature: number
  top_p: number
}

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  appearance: 'Aparência',
  personality: 'Personalidade',
  special_state: 'Estado Especial',
  relationship: 'Relacionamento',
  sexual_nature: 'Natureza Sexual',
  world_lore: 'Lore do Mundo',
  scenario: 'Cenário',
  creator_notes: 'Notas do Criador',
  custom: 'Personalizado',
}

export const CARD_TYPE_COLORS: Record<CardType, string> = {
  appearance: '#3498db',
  personality: '#2ecc71',
  special_state: '#e67e22',
  relationship: '#e91e63',
  sexual_nature: '#9b59b6',
  world_lore: '#1abc9c',
  scenario: '#f1c40f',
  creator_notes: '#95a5a6',
  custom: '#ecf0f1',
}

export const CHARA_FIELDS = [
  'name',
  'description',
  'personality',
  'first_mes',
  'mes_example',
  'scenario',
  'creator_notes',
  'system_prompt',
  'post_history_instructions',
  'alternate_greetings',
  'tags',
  'talkativeness',
  'character_version',
]
