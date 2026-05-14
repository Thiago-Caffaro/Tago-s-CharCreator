import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Star, X } from 'lucide-react'
import type { FieldPreset } from '../../types'

interface Props {
  presets: FieldPreset[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

// Group presets by target_field, then sort groups by a priority order
const FIELD_ORDER = [
  'description', 'mes_example', 'system_prompt', 'first_mes',
  'post_history_instructions', 'personality', 'scenario', 'alternate_greetings',
]

function groupPresets(presets: FieldPreset[]) {
  const groups: Record<string, FieldPreset[]> = {}
  for (const p of presets) {
    if (!groups[p.target_field]) groups[p.target_field] = []
    groups[p.target_field].push(p)
  }
  const keys = Object.keys(groups).sort((a, b) => {
    const ai = FIELD_ORDER.indexOf(a)
    const bi = FIELD_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  return keys.map(k => ({ field: k, items: groups[k] }))
}

const FIELD_LABEL: Record<string, string> = {
  description: 'description',
  mes_example: 'mes_example',
  system_prompt: 'system_prompt',
  first_mes: 'first_mes',
  post_history_instructions: 'post_history',
  personality: 'personality',
  scenario: 'scenario',
  alternate_greetings: 'alt_greetings',
}

export function PresetMultiSelect({ presets, selectedIds, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const toggle = (id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id])
  }

  const selectDefaults = () => {
    onChange(presets.filter(p => p.is_default).map(p => p.id))
  }

  const clearAll = () => onChange([])

  const groups = groupPresets(presets)
  const label = selectedIds.length === 0
    ? 'Nenhum preset'
    : `${selectedIds.length} preset${selectedIds.length > 1 ? 's' : ''} selecionado${selectedIds.length > 1 ? 's' : ''}`

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-400 mb-1">Presets de Prompt</label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs
          bg-[#242424] border border-[#333] text-gray-300 hover:border-[#444] transition-colors"
      >
        <span className={selectedIds.length === 0 ? 'text-gray-500' : 'text-gray-200'}>
          {label}
        </span>
        <ChevronDown size={12} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedIds.map(id => {
            const p = presets.find(x => x.id === id)
            if (!p) return null
            return (
              <span
                key={id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
                  bg-[#9b59b6]/15 text-[#9b59b6] border border-[#9b59b6]/25"
              >
                {p.name}
                <button
                  onClick={() => toggle(id)}
                  className="hover:text-white transition-colors"
                  title="Remover"
                >
                  <X size={9} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-[#333]
          bg-[#1e1e1e] shadow-xl overflow-hidden max-h-72 overflow-y-auto">

          {/* Header actions */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2a] sticky top-0 bg-[#1e1e1e]">
            <button
              onClick={selectDefaults}
              className="flex items-center gap-1 text-[10px] text-[#9b59b6] hover:text-purple-300 transition-colors"
            >
              <Star size={9} />
              Selecionar padrões
            </button>
            <span className="text-gray-700">·</span>
            <button
              onClick={clearAll}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              Limpar
            </button>
          </div>

          {/* Grouped presets */}
          {groups.map(({ field, items }) => (
            <div key={field}>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider
                bg-[#1a1a1a] border-b border-[#2a2a2a]">
                {FIELD_LABEL[field] ?? field}
              </div>
              {items.map(p => (
                <label
                  key={p.id}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer
                    hover:bg-[#242424] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="accent-[#9b59b6] w-3 h-3 shrink-0"
                  />
                  <span className="text-xs text-gray-300 flex-1">{p.name}</span>
                  {p.is_default && (
                    <span title="Padrão"><Star size={9} className="text-[#9b59b6] shrink-0" /></span>
                  )}
                </label>
              ))}
            </div>
          ))}

          {presets.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-600 text-center">
              Nenhum preset criado ainda
            </div>
          )}
        </div>
      )}
    </div>
  )
}
