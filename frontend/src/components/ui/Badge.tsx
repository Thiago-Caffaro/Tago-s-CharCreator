import React from 'react'
import type { CardType } from '../../types'
import { CARD_TYPE_COLORS, CARD_TYPE_LABELS } from '../../types'

interface BadgeProps {
  type: CardType
  small?: boolean
}

export function Badge({ type, small = false }: BadgeProps) {
  const color = CARD_TYPE_COLORS[type]
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
    >
      {CARD_TYPE_LABELS[type]}
    </span>
  )
}
