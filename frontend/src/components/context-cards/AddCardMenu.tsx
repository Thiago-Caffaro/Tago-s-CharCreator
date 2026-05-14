import React, { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { CardType } from '../../types'
import { CARD_TYPE_LABELS, CARD_TYPE_COLORS } from '../../types'
import { ContextCardTypeIcon } from './ContextCardTypeIcon'

interface Props {
  onAdd: (type: CardType) => void
}

const TYPES: CardType[] = [
  'appearance', 'personality', 'special_state', 'relationship',
  'sexual_nature', 'world_lore', 'scenario', 'creator_notes', 'custom',
]

export function AddCardMenu({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#333] text-gray-500
          hover:text-gray-300 hover:border-[#9b59b6]/50 transition-colors text-xs"
        onClick={() => setOpen(v => !v)}
      >
        <Plus size={14} /> Adicionar Card
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-52 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-xl z-10 py-1 overflow-hidden">
          {TYPES.map(type => (
            <button
              key={type}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:bg-[#242424] transition-colors"
              onClick={() => { onAdd(type); setOpen(false) }}
            >
              <ContextCardTypeIcon type={type} size={13} />
              <span style={{ color: CARD_TYPE_COLORS[type] }}>{CARD_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
