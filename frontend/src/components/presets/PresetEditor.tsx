import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Editor from '@monaco-editor/react'
import type { FieldPreset } from '../../types'
import { CHARA_FIELDS } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'

interface Props {
  preset: FieldPreset | null
  onClose: () => void
  onSave: (id: number, data: Partial<FieldPreset>) => Promise<void>
}

const FIELD_OPTIONS = CHARA_FIELDS.map(f => ({ value: f, label: f }))

export function PresetEditor({ preset, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [targetField, setTargetField] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (preset) {
      setName(preset.name)
      setTargetField(preset.target_field)
      setPrompt(preset.system_prompt_override)
      setIsDefault(preset.is_default)
    }
  }, [preset])

  if (!preset) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(preset.id, {
        name,
        target_field: targetField,
        system_prompt_override: prompt,
        is_default: isDefault,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="w-[420px] bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-semibold text-gray-200">Editar Preset</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4 flex flex-col">
        <Input
          label="Nome do Preset"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ex: Descrição Detalhada NSFW"
        />
        <Select
          label="Campo-alvo"
          value={targetField}
          onChange={e => setTargetField(e.target.value)}
          options={FIELD_OPTIONS}
        />
        <Toggle
          label="Preset padrão para este campo"
          checked={isDefault}
          onChange={setIsDefault}
        />

        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-400">
            System Prompt Override
          </label>
          <div className="flex-1 min-h-[320px] border border-[#333] rounded-lg overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={prompt}
              onChange={v => setPrompt(v ?? '')}
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'off',
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
          <p className="text-[10px] text-gray-600">
            Este prompt substitui completamente o system prompt padrão do assembler para o campo selecionado.
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-[#2a2a2a] flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">Fechar</Button>
        <Button loading={saving} onClick={handleSave} className="flex-1">Salvar</Button>
      </div>
    </aside>
  )
}
