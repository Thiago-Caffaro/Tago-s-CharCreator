import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { CardTypeConfig } from '../../api/cardTypes'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface Props {
  cardType: CardTypeConfig | null
  onClose: () => void
  onSave: (id: number, data: { label: string; color: string }) => Promise<void>
}

const PRESET_COLORS = [
  '#3498db', '#2ecc71', '#e67e22', '#e91e63',
  '#9b59b6', '#1abc9c', '#f1c40f', '#95a5a6',
  '#e74c3c', '#00bcd4', '#ff9800', '#607d8b',
  '#ecf0f1', '#8e44ad', '#16a085', '#d35400',
]

export function CardTypeEditor({ cardType, onClose, onSave }: Props) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#9b59b6')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cardType) {
      setLabel(cardType.label)
      setColor(cardType.color)
    }
  }, [cardType])

  if (!cardType) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(cardType.id, { label, color })
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="w-[320px] bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-semibold text-gray-200">Editar Tipo</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-5">
        <div className="flex items-center gap-3 p-3 bg-[#1e1e1e] rounded-xl border border-[#2a2a2a]">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
            style={{ background: color + '33', color }}
          >
            {label.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-100">{label || '—'}</span>
            <span className="text-[10px] text-gray-600 block font-mono">{cardType.slug}</span>
          </div>
        </div>

        <Input
          label="Rótulo"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Nome do tipo..."
          disabled={false}
        />

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-400">Cor</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0.5"
            />
            <input
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-sm text-gray-100
                font-mono focus:outline-none focus:ring-2 focus:ring-[#9b59b6]/50"
              placeholder="#rrggbb"
            />
          </div>

          <div className="grid grid-cols-8 gap-1.5 mt-1">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                className={`w-7 h-7 rounded-lg border-2 transition-all ${
                  color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {cardType.is_builtin && (
          <p className="text-[11px] text-yellow-600/80 bg-yellow-900/10 border border-yellow-900/20 rounded-lg px-3 py-2">
            Este é um tipo nativo. Você pode editar o rótulo e a cor, mas não pode excluí-lo.
          </p>
        )}
      </div>

      <div className="p-4 border-t border-[#2a2a2a] flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">Fechar</Button>
        <Button loading={saving} onClick={handleSave} className="flex-1">Salvar</Button>
      </div>
    </aside>
  )
}
