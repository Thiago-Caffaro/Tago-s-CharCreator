import React, { useMemo, useState } from 'react'
import { CheckCircle, XCircle, Wand2 } from 'lucide-react'
import type { CharaCardV2 } from '../../types'

interface Check {
  id: string
  label: string
  run: (card: CharaCardV2) => { passed: boolean; message: string }
}

const CHECKS: Check[] = [
  {
    id: 'spec_correct',
    label: 'spec e spec_version corretos',
    run: c => ({ passed: c.spec === 'chara_card_v2' && c.spec_version === '2.0', message: '' }),
  },
  {
    id: 'has_name',
    label: 'Nome do personagem presente',
    run: c => ({ passed: !!c.data.name, message: '' }),
  },
  {
    id: 'desc_sections',
    label: 'Description tem seções <== ==>',
    run: c => ({ passed: c.data.description.includes('<==') && c.data.description.includes('==>'), message: '' }),
  },
  {
    id: 'desc_length',
    label: 'Description entre 400–900 palavras',
    run: c => {
      const wc = c.data.description.split(/\s+/).filter(Boolean).length
      return { passed: wc >= 400 && wc <= 900, message: `${wc} palavras` }
    },
  },
  {
    id: 'personality_short',
    label: 'Personality: 1–3 frases',
    run: c => {
      const sentences = c.data.personality.split(/[.!?]+/).filter(s => s.trim().length > 0)
      return { passed: sentences.length >= 1 && sentences.length <= 3, message: `${sentences.length} frases` }
    },
  },
  {
    id: 'scenario_short',
    label: 'Scenario: menos de 100 palavras',
    run: c => {
      const wc = c.data.scenario.split(/\s+/).filter(Boolean).length
      return { passed: wc < 100, message: `${wc} palavras` }
    },
  },
  {
    id: 'first_mes_nouser',
    label: 'first_mes não fala pelo {{user}}',
    run: c => ({ passed: !c.data.first_mes.includes('{{user}}:') && !c.data.first_mes.match(/\*?You\s/i), message: '' }),
  },
  {
    id: 'mes_three_blocks',
    label: 'mes_example tem 3+ blocos <START>',
    run: c => {
      const count = (c.data.mes_example.match(/<START>/g) || []).length
      return { passed: count >= 3, message: `${count} blocos` }
    },
  },
  {
    id: 'mes_starts',
    label: 'mes_example começa com <START>',
    run: c => ({ passed: c.data.mes_example.trim().startsWith('<START>'), message: '' }),
  },
  {
    id: 'has_system_prompt',
    label: 'system_prompt presente e não vazio',
    run: c => ({ passed: !!c.data.system_prompt?.trim(), message: '' }),
  },
  {
    id: 'has_post_history',
    label: 'post_history_instructions presente',
    run: c => ({ passed: !!c.data.post_history_instructions?.trim(), message: '' }),
  },
  {
    id: 'alt_greetings',
    label: 'alternate_greetings: 2+ entradas',
    run: c => ({ passed: Array.isArray(c.data.alternate_greetings) && c.data.alternate_greetings.length >= 2, message: `${c.data.alternate_greetings?.length ?? 0}` }),
  },
  {
    id: 'tags_array',
    label: 'tags é array válido',
    run: c => ({ passed: Array.isArray(c.data.tags), message: '' }),
  },
  {
    id: 'no_hardcoded_name',
    label: 'Sem nome literal hardcoded (usa {{char}})',
    run: c => {
      const name = c.data.name
      if (!name) return { passed: true, message: '' }
      const fields = [c.data.description, c.data.personality, c.data.first_mes, c.data.mes_example]
      const found = fields.some(f => f?.includes(name))
      return { passed: !found, message: '' }
    },
  },
]

// checks that have a backend repair handler
const FIXABLE_CHECKS = new Set([
  'desc_sections', 'desc_length', 'personality_short', 'scenario_short',
  'first_mes_nouser', 'mes_three_blocks', 'mes_starts', 'has_system_prompt',
  'has_post_history', 'alt_greetings', 'no_hardcoded_name',
])

interface Props {
  card: CharaCardV2
  onFixCheck?: (checkId: string) => Promise<void>
}

export function QualityChecklist({ card, onFixCheck }: Props) {
  const results = useMemo(() => CHECKS.map(c => ({ ...c, result: c.run(card) })), [card])
  const passed = results.filter(r => r.result.passed).length
  const [fixing, setFixing] = useState<string | null>(null)

  const handleFix = async (checkId: string) => {
    if (!onFixCheck || fixing) return
    setFixing(checkId)
    try {
      await onFixCheck(checkId)
    } finally {
      setFixing(null)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-semibold text-gray-200">Checklist de Qualidade</span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
          passed === results.length ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
        }`}>
          {passed}/{results.length}
        </span>
      </div>
      <div className="space-y-2">
        {results.map(r => (
          <div key={r.id} className="flex items-center gap-2">
            {r.result.passed
              ? <CheckCircle size={14} className="text-green-500 shrink-0" />
              : <XCircle size={14} className="text-red-500 shrink-0" />
            }
            <span className={`text-xs flex-1 ${r.result.passed ? 'text-gray-300' : 'text-gray-300'}`}>
              {r.label}
            </span>
            {r.result.message && (
              <span className="text-[10px] text-gray-600 font-mono">{r.result.message}</span>
            )}
            {!r.result.passed && FIXABLE_CHECKS.has(r.id) && onFixCheck && (
              <button
                onClick={() => handleFix(r.id)}
                disabled={!!fixing}
                title="Corrigir com IA"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                  bg-[#9b59b6]/15 text-[#9b59b6] border border-[#9b59b6]/25
                  hover:bg-[#9b59b6]/25 disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors shrink-0"
              >
                {fixing === r.id ? (
                  <span className="w-2.5 h-2.5 border border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Wand2 size={10} />
                )}
                {fixing === r.id ? 'corrigindo…' : 'IA'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
