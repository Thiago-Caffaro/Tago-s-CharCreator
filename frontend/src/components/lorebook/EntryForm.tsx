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
    <aside className="w-[360px] bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-medium text-gray-200">Editar Entry</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={16} />
        </button>
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
        <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Toggle label="Ativo" checked={form.enabled ?? true} onChange={v => update('enabled', v)} />
          <Toggle label="Constante" checked={form.constant ?? false} onChange={v => update('constant', v)} />
          <Toggle label="Seletivo" checked={form.selective ?? false} onChange={v => update('selective', v)} />
        </div>
      </div>

      <div className="p-4 border-t border-[#2a2a2a] flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">Fechar</Button>
        <Button loading={saving} onClick={handleSave} className="flex-1">Salvar</Button>
      </div>
    </aside>
  )
}
