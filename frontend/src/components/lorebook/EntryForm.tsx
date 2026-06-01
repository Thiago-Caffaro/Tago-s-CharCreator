import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { LorebookEntry } from '../../types'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { KeywordInput } from './KeywordInput'

interface Props {
  entry: LorebookEntry | null
  onClose: () => void
  onSave: (id: number, data: Partial<LorebookEntry>) => Promise<void>
}

export function EntryForm({ entry, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<LorebookEntry>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entry) setForm({ ...entry })
  }, [entry])

  if (!entry) return null

  const keys = JSON.parse((form.keys as string) || '[]') as string[]
  const secKeys = JSON.parse((form.secondary_keys as string) || '[]') as string[]

  const update = (k: keyof LorebookEntry, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(entry.id, form)
    } finally {
      setSaving(false)
    }
  }

  return (
    /* Full-screen layout — parent (Lorebook.tsx) wraps this in a fixed overlay */
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-[#2a2a2a] shrink-0">
        <button onClick={onClose} className="flex items-center justify-center w-9 h-9 rounded-xl
          text-gray-400 active:bg-[#242424] transition-colors">
          <X size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-200">Editar Entry</span>
        <Button size="sm" loading={saving} onClick={handleSave}>Salvar</Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <Input
          label="Nome"
          value={form.name ?? ''}
          onChange={e => update('name', e.target.value)}
        />
        <KeywordInput
          label="Keywords"
          value={keys}
          onChange={v => update('keys', JSON.stringify(v))}
        />
        <KeywordInput
          label="Keywords Secundárias"
          value={secKeys}
          onChange={v => update('secondary_keys', JSON.stringify(v))}
        />
        <Textarea
          label="Conteúdo"
          value={form.content ?? ''}
          onChange={e => update('content', e.target.value)}
          rows={8}
        />
        <Input
          label="Comentário"
          value={form.comment ?? ''}
          onChange={e => update('comment', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ordem de inserção"
            type="number"
            value={form.insertion_order ?? 10}
            onChange={e => update('insertion_order', Number(e.target.value))}
          />
          <Input
            label="Profundidade"
            type="number"
            value={form.depth ?? 4}
            onChange={e => update('depth', Number(e.target.value))}
          />
          <Input
            label="Probabilidade %"
            type="number"
            value={form.probability ?? 100}
            onChange={e => update('probability', Number(e.target.value))}
          />
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
          <Toggle label="Ativo" checked={form.enabled ?? true} onChange={v => update('enabled', v)} />
          <Toggle label="Constante" checked={form.constant ?? false} onChange={v => update('constant', v)} />
          <Toggle label="Seletivo" checked={form.selective ?? false} onChange={v => update('selective', v)} />
        </div>
      </div>
    </div>
  )
}
