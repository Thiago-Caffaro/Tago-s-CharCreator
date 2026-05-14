import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import type { ContextCard as ContextCardType } from '../../types'
import { CARD_TYPE_COLORS } from '../../types'
import { ContextCardTypeIcon } from './ContextCardTypeIcon'
import { Badge } from '../ui/Badge'
import { Toggle } from '../ui/Toggle'

interface Props {
  card: ContextCardType
  onSelect: (card: ContextCardType) => void
  onToggle: (card: ContextCardType, active: boolean) => void
  onDelete: (card: ContextCardType) => void
}

export function ContextCard({ card, onSelect, onToggle, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const borderColor = CARD_TYPE_COLORS[card.card_type]

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: borderColor, borderLeftWidth: 3 }}
      className={`bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg overflow-hidden cursor-pointer
        hover:border-[#3a3a3a] transition-colors ${!card.is_active ? 'opacity-50' : ''}`}
      onClick={() => onSelect(card)}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#242424]">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-600 hover:text-gray-400 transition-colors cursor-grab active:cursor-grabbing"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>
        <ContextCardTypeIcon type={card.card_type} size={13} />
        <span className="flex-1 text-xs font-medium text-gray-200 truncate">{card.title}</span>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Toggle
            checked={card.is_active}
            onChange={v => onToggle(card, v)}
            size="sm"
          />
          <button
            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            onClick={() => onDelete(card)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs text-gray-500 line-clamp-3 font-mono leading-relaxed">
          {card.content || <span className="italic text-gray-700">Vazio — clique para editar</span>}
        </p>
      </div>
      {card.target_field && (
        <div className="px-3 pb-2">
          <span className="text-[10px] text-gray-600">→ {card.target_field}</span>
        </div>
      )}
    </div>
  )
}
