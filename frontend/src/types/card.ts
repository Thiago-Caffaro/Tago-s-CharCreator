export interface CharaCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: {
    name: string
    description: string
    personality: string
    first_mes: string
    mes_example: string
    scenario: string
    creator_notes: string
    system_prompt: string
    post_history_instructions: string
    alternate_greetings: string[]
    tags: string[]
    talkativeness: string
    creator: string
    character_version: string
    avatar: string
    extensions: {
      depth_prompt: {
        role: 'system'
        depth: number
        prompt: string
      }
    }
    character_book?: LorebookV2
  }
}

export interface LorebookV2 {
  name: string
  description: string
  scan_depth: number
  token_budget: number
  recursive_scanning: boolean
  extensions: Record<string, unknown>
  entries: LorebookEntryV2[]
}

export interface LorebookEntryV2 {
  id: number
  name: string
  keys: string[]
  secondary_keys: string[]
  content: string
  enabled: boolean
  insertion_order: number
  position: number
  constant: boolean
  selective: boolean
  probability: number
  comment: string
  extensions: {
    depth: number
    weight: number
    addMemo: boolean
    useProbability: boolean
    excludeRecursion: boolean
  }
  selectiveLogic: number
}
