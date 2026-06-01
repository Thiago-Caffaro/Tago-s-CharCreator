import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import type { CharaCardV2 } from '../../types'
import { CHARA_FIELDS } from '../../types'

interface Props {
  card: CharaCardV2
  /** Called when the user taps the regenerate button for a field */
  onRegenerateField?: (field: string) => void
}

const FIELD_LABELS: Record<string, string> = {
  name:                       'Nome',
  description:                'Descrição',
  personality:                'Personalidade',
  scenario:                   'Cenário',
  first_mes:                  'Primeira Mensagem',
  mes_example:                'Exemplos de Mensagem',
  system_prompt:              'System Prompt',
  post_history_instructions:  'Post-History Instructions',
  creator_notes:              'Notas do Criador',
  tags:                       'Tags',
  talkativeness:              'Tagarelice',
  creator:                    'Criador',
  character_version:          'Versão',
  alternate_greetings:        'Saudações Alternativas',
}

// Fields the AI can regenerate
const REGENERATABLE = new Set(CHARA_FIELDS)

export function CardPreview({ card, onRegenerateField }: Props) {
  const [altIndex, setAltIndex] = useState(0)
  const d = card.data
  const alts = d.alternate_greetings ?? []

  const renderField = (key: string, value: unknown) => {
    if (key === 'avatar' || key === 'extensions' || key === 'character_book') return null

    const label = FIELD_LABELS[key] || key
    const canRegen = REGENERATABLE.has(key) && !!onRegenerateField

    const RegenBtn = () => canRegen ? (
      <button
        onClick={() => onRegenerateField!(key)}
        className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg
          text-[10px] text-gray-500 border border-[#2a2a2a]
          active:bg-[#9b59b6]/20 active:text-[#9b59b6] active:border-[#9b59b6]/30
          transition-colors"
        title={`Refazer campo: ${label}`}
      >
        <RefreshCw size={9} />
        Refazer
      </button>
    ) : null

    if (Array.isArray(value)) {
      if (key === 'alternate_greetings') {
        return (
          <div key={key} className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold text-[#9b59b6] uppercase tracking-wider">
                {label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="p-0.5 text-gray-600 active:text-gray-400"
                  onClick={() => setAltIndex(i => Math.max(0, i - 1))}
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="text-[10px] text-gray-600">{altIndex + 1}/{alts.length}</span>
                <button
                  className="p-0.5 text-gray-600 active:text-gray-400"
                  onClick={() => setAltIndex(i => Math.min(alts.length - 1, i + 1))}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
              <RegenBtn />
            </div>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap bg-[#1a1a1a] rounded-xl p-3">
              {alts[altIndex] || '—'}
            </p>
          </div>
        )
      }
      if (key === 'tags') {
        return (
          <div key={key} className="mb-4">
            <div className="flex items-center mb-1.5">
              <span className="text-[10px] font-semibold text-[#9b59b6] uppercase tracking-wider">{label}</span>
              <RegenBtn />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(value as string[]).map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-[#242424] text-gray-400 border border-[#333]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )
      }
    }

    return (
      <div key={key} className="mb-4">
        <div className="flex items-center mb-1.5">
          <span className="text-[10px] font-semibold text-[#9b59b6] uppercase tracking-wider">{label}</span>
          <RegenBtn />
        </div>
        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap bg-[#1a1a1a] rounded-xl p-3 font-mono">
          {String(value) || '—'}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 overflow-auto h-full">
      {Object.entries(d).map(([k, v]) => renderField(k, v))}
    </div>
  )
}
