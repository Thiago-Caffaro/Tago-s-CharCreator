import React, { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { projectsApi } from '../../api/projects'
import type { CardGeneration } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  projectId: number
  currentJson: string
  onRestore: (cardJson: string) => void
}

function extractLabel(cardJson: string): string {
  try {
    const parsed = JSON.parse(cardJson)
    const data = parsed?.data ?? parsed
    if (data?.name) return data.name
    if (data?.description) return data.description.slice(0, 60)
    return 'Sem prévia'
  } catch {
    return 'JSON inválido'
  }
}

export function GenerationHistory({ open, onClose, projectId, currentJson, onRestore }: Props) {
  const [generations, setGenerations] = useState<CardGeneration[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    projectsApi.getGenerations(projectId)
      .then(setGenerations)
      .finally(() => setLoading(false))
  }, [open, projectId])

  return (
    <Modal open={open} onClose={onClose} title="Histórico de Gerações" size="md">
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="w-5 h-5 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : generations.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-8">Nenhuma geração salva ainda.</p>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-auto">
          {generations.map((g, i) => {
            const isCurrent = g.card_json === currentJson
            return (
              <div
                key={g.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                  isCurrent ? 'border-[#9b59b6]/40 bg-[#9b59b6]/5' : 'border-[#2a2a2a] bg-[#1a1a1a]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-200 truncate">{extractLabel(g.card_json)}</span>
                    {isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#9b59b6]/20 text-[#9b59b6] shrink-0">atual</span>
                    )}
                    {i === 0 && !isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 shrink-0">mais recente</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {new Date(g.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => onRestore(g.card_json)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium
                      bg-[#242424] text-gray-300 hover:bg-[#2a2a2a] border border-[#333] transition-colors"
                  >
                    <RotateCcw size={11} /> Restaurar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
