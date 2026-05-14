import React from 'react'
import { Eye, Brain, Zap, Heart, Flame, Globe, Map, FileText, Puzzle } from 'lucide-react'
import type { CardType } from '../../types'
import { CARD_TYPE_COLORS } from '../../types'

const icons: Record<CardType, React.ElementType> = {
  appearance: Eye,
  personality: Brain,
  special_state: Zap,
  relationship: Heart,
  sexual_nature: Flame,
  world_lore: Globe,
  scenario: Map,
  creator_notes: FileText,
  custom: Puzzle,
}

export function ContextCardTypeIcon({ type, size = 14 }: { type: CardType; size?: number }) {
  const Icon = icons[type]
  const color = CARD_TYPE_COLORS[type]
  return <Icon size={size} style={{ color }} />
}
