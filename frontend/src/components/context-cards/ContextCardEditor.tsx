import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ContextCard, CardType } from '../../types'
import { CARD_TYPE_LABELS, CHARA_FIELDS } from '../../types'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'

interface Props {
  card: ContextCard | null
  onClose: () => void
  onSave: (cardId: number, data: Partial<ContextCard>) => Promise<void>
}

const CARD_TYPE_OPTIONS = Object.entries(CARD_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const FIELD_OPTIONS = [
  { value: '', label: 'Livre (sem campo-alvo)' },
  ...CHARA_FIELDS.map(f => ({ value: f, label: f })),
]

export function ContextCardEditor({ card, onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [cardType, setCardType] = useState<CardType>('custom')
  const [content, setContent] = useState('')
  const [targetField, setTargetField] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setCardType(card.card_type)
      setContent(card.content)
      setTargetField(card.target_field ?? '')
    }
  }, [card])

  if (!card) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(card.id, {
        title,
        card_type: cardType,
        content,
        target_field: targetField || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="w-[380px] bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-medium text-gray-200">Editar Card</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <Input
          label="Título"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nome do bloco..."
        />
        <Select
          label="Tipo"
          value={cardType}
          onChange={e => setCardType(e.target.value as CardType)}
          options={CARD_TYPE_OPTIONS}
        />
        <Select
          label="Campo-alvo (opcional)"
          value={targetField}
          onChange={e => setTargetField(e.target.value)}
          options={FIELD_OPTIONS}
        />
        <Textarea
          label="Conteúdo"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Descreva aqui as informações deste bloco de contexto..."
          rows={16}
          className="flex-1"
        />
      </div>

      <div className="p-4 border-t border-[#2a2a2a] flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">Fechar</Button>
        <Button loading={saving} onClick={handleSave} className="flex-1">Salvar</Button>
      </div>
    </aside>
  )
}
