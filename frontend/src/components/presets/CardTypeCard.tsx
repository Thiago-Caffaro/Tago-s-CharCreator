import React from 'react'
import { Trash2, Lock } from 'lucide-react'
import type { CardTypeConfig } from '../../api/cardTypes'
import {
  Eye, Brain, Zap, Heart, Flame, Globe, Map, FileText, Puzzle,
} from 'lucide-react'

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

interface Props {
  cardType: CardTypeConfig
  onSelect: (ct: CardTypeConfig) => void
  onDelete: (ct: CardTypeConfig) => void
}

export function CardTypeCard({ cardType, onSelect, onDelete }: Props) {
  const Icon = SLUG_ICONS[cardType.slug] ?? Puzzle
  const color = cardType.color

  return (
    <div
      className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer
        hover:border-[#3a3a3a] transition-all group relative"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      onClick={() => onSelect(cardType)}
    >
      <div className="px-3 py-3 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: color + '22' }}
        >
          <Icon size={16} style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-gray-100 block truncate">{cardType.label}</span>
          <span className="text-[10px] font-mono text-gray-600">{cardType.slug}</span>
        </div>

        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {cardType.is_builtin ? (
            <span title="Tipo nativo — não pode ser excluído">
              <Lock size={11} className="text-gray-700" />
            </span>
          ) : (
            <button
              className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              onClick={() => onDelete(cardType)}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Color swatch */}
      <div className="px-3 pb-3 flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border border-black/20"
          style={{ background: color }}
        />
        <span className="text-[10px] font-mono text-gray-600">{color}</span>
        {cardType.is_builtin && (
          <span className="ml-auto text-[9px] text-gray-700 uppercase tracking-wider">nativo</span>
        )}
      </div>
    </div>
  )
}
