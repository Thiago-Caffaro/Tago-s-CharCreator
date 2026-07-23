import React from 'react'
import { Eye, Brain, Zap, Heart, Flame, Globe, Map, FileText, Puzzle } from 'lucide-react'
import { useCardTypeStore } from '../../store/useCardTypeStore'

// Known icons for the seeded builtin slugs; any custom type falls back to Puzzle.
const SLUG_ICONS: Record<string, React.ElementType> = {
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

export function ContextCardTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const color = useCardTypeStore(s => s.types.find(t => t.slug === type)?.color)
  const Icon = SLUG_ICONS[type] ?? Puzzle
  return <Icon size={size} style={{ color: color ?? '#9b59b6' }} />
}
