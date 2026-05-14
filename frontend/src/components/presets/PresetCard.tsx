import React from 'react'
import { Trash2, Star, Tag } from 'lucide-react'
import type { FieldPreset } from '../../types'
import { CHARA_FIELDS } from '../../types'

const FIELD_COLORS: Record<string, string> = {
  description: '#9b59b6',
  personality: '#2ecc71',
  first_mes: '#f39c12',
  mes_example: '#e91e63',
  scenario: '#1abc9c',
  creator_notes: '#95a5a6',
  system_prompt: '#e74c3c',
  post_history_instructions: '#e67e22',
  alternate_greetings: '#f1c40f',
  name: '#3498db',
  tags: '#00bcd4',
}

function fieldColor(field: string) {
  return FIELD_COLORS[field] ?? '#6c757d'
}

interface Props {
  preset: FieldPreset
  onSelect: (preset: FieldPreset) => void
  onDelete: (preset: FieldPreset) => void
  onToggleDefault: (preset: FieldPreset) => void
}

export function PresetCard({ preset, onSelect, onDelete, onToggleDefault }: Props) {
  const color = fieldColor(preset.target_field)

  return (
    <div
      className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer
        hover:border-[#3a3a3a] transition-all group relative"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      onClick={() => onSelect(preset)}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-gray-100 block truncate">{preset.name}</span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-mono mt-1 px-1.5 py-0.5 rounded-md"
            style={{ background: color + '22', color }}
          >
            <Tag size={9} />
            {preset.target_field}
          </span>
        </div>
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            className={`p-1 rounded transition-colors ${
              preset.is_default
                ? 'text-[#f39c12]'
                : 'text-gray-600 hover:text-[#f39c12]'
            }`}
            title={preset.is_default ? 'Padrão' : 'Tornar padrão'}
            onClick={() => onToggleDefault(preset)}
          >
            <Star size={13} fill={preset.is_default ? '#f39c12' : 'none'} />
          </button>
          <button
            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            onClick={() => onDelete(preset)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="px-3 pb-3">
        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3 font-mono">
          {preset.system_prompt_override || <span className="italic">Sem prompt definido</span>}
        </p>
      </div>

      {preset.is_default && (
        <div
          className="absolute top-0 right-0 text-[9px] font-semibold px-2 py-0.5 rounded-bl-lg"
          style={{ background: '#f39c12', color: '#000' }}
        >
          PADRÃO
        </div>
      )}
    </div>
  )
}
