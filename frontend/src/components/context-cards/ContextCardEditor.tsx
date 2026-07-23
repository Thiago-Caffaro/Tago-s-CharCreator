import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ContextCard } from '../../types'
import { CHARA_FIELDS } from '../../types'
import { useCardTypeStore } from '../../store/useCardTypeStore'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'

interface Props {
  card: ContextCard | null
  onClose: () => void
  onSave: (cardId: number, data: Partial<ContextCard>) => Promise<void>
  /** When true, renders as a 380px sidebar (desktop mode) */
  desktop?: boolean
}

const FIELD_OPTIONS = [
  { value: '', label: 'Livre (sem campo-alvo)' },
  ...CHARA_FIELDS.map(f => ({ value: f, label: f })),
]

export function ContextCardEditor({ card, onClose, onSave, desktop }: Props) {
  const [title, setTitle] = useState('')
  const [cardType, setCardType] = useState('custom')
  const [content, setContent] = useState('')
  const [targetField, setTargetField] = useState('')
  const [saving, setSaving] = useState(false)
  // Select the raw array (stable reference) and derive options outside the
  // selector — mapping inside the selector would return a new array/objects
  // on every call and trip useSyncExternalStore's infinite-loop guard.
  const types = useCardTypeStore(s => s.types)
  const cardTypeOptions = types.map(t => ({ value: t.slug, label: t.label }))

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setCardType(card.card_type)
      setContent(card.content)
      setTargetField(card.target_field ?? '')
    }
  }, [card])

  const handleSave = async () => {
    if (!card) return
    setSaving(true)
    try {
      await onSave(card.id, {
        title,
        card_type: cardType,
        content,
        target_field: targetField || undefined,
      })
      if (!desktop) onClose()
    } finally {
      setSaving(false)
    }
  }

  // Desktop sidebar mode
  if (desktop) {
    if (!card) return null
    return (
      <aside className="w-[380px] bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <span className="text-sm font-medium text-gray-200">Editar Card</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <Input label="Título" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do bloco..." />
          <Select label="Tipo" value={cardType} onChange={e => setCardType(e.target.value)} options={cardTypeOptions} />
          <Select label="Campo-alvo (opcional)" value={targetField} onChange={e => setTargetField(e.target.value)} options={FIELD_OPTIONS} />
          <Textarea label="Conteúdo" value={content} onChange={e => setContent(e.target.value)} placeholder="Descreva aqui as informações deste bloco de contexto..." rows={16} />
        </div>
        <div className="p-4 border-t border-[#2a2a2a] flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Fechar</Button>
          <Button loading={saving} onClick={handleSave} className="flex-1">Salvar</Button>
        </div>
      </aside>
    )
  }

  // Mobile: full-screen overlay
  if (!card) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f0f] overlay-up"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-[#2a2a2a] shrink-0">
        <button onClick={onClose} className="flex items-center justify-center w-9 h-9 rounded-xl
          text-gray-400 active:bg-[#242424] transition-colors">
          <X size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-200">Editar Card</span>
        <Button size="sm" loading={saving} onClick={handleSave}>Salvar</Button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <Input label="Título" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do bloco..." />
        <Select label="Tipo" value={cardType} onChange={e => setCardType(e.target.value)} options={cardTypeOptions} />
        <Select label="Campo-alvo (opcional)" value={targetField} onChange={e => setTargetField(e.target.value)} options={FIELD_OPTIONS} />
        <Textarea label="Conteúdo" value={content} onChange={e => setContent(e.target.value)} placeholder="Descreva aqui as informações deste bloco de contexto..." rows={14} />
      </div>
    </div>
  )
}
