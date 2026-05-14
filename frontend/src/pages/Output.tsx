import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Download, CheckSquare, Eye, Code, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'
import { useGenerationStore } from '../store/useGenerationStore'
import { useProjectStore } from '../store/useProjectStore'
import { Button } from '../components/ui/Button'
import { CardPreview } from '../components/card-output/CardPreview'
import { QualityChecklist } from '../components/card-output/QualityChecklist'
import { validate_card_client } from '../utils/validators'
import { exportCard } from '../utils/cardExporter'
import { generationApi } from '../api/generation'

type Tab = 'preview' | 'json' | 'checklist'

export default function Output() {
  const { projectId } = useParams<{ projectId: string }>()
  const { generatedCard, streamingText, setGeneratedCard } = useGenerationStore()
  const { currentProject } = useProjectStore()
  const [tab, setTab] = useState<Tab>('preview')
  const [jsonText, setJsonText] = useState('')
  const [jsonErrors, setJsonErrors] = useState<string[]>([])
  const [fixing, setFixing] = useState(false)

  useEffect(() => {
    if (generatedCard) {
      setJsonText(JSON.stringify(generatedCard, null, 2))
      setJsonErrors([])
    } else if (currentProject?.last_generated_card) {
      const { ok, card, errors } = validate_card_client(currentProject.last_generated_card)
      if (ok && card) {
        setGeneratedCard(card)
      } else {
        setJsonText(currentProject.last_generated_card)
        setJsonErrors(errors)
        setTab('json')
      }
    } else if (streamingText) {
      const { ok, card, errors } = validate_card_client(streamingText)
      if (ok && card) {
        setGeneratedCard(card)
      } else {
        setJsonText(streamingText)
        setJsonErrors(errors)
        setTab('json')
      }
    }
  }, [generatedCard, currentProject, streamingText])

  const handleJsonChange = (val: string | undefined) => {
    const v = val ?? ''
    setJsonText(v)
    const { errors, card } = validate_card_client(v)
    setJsonErrors(errors)
    if (card) setGeneratedCard(card)
  }

  const handleFixCheck = async (checkId: string) => {
    if (!generatedCard) return
    try {
      const result = await generationApi.fixCheck(JSON.stringify(generatedCard), checkId)
      // strip markdown fences if any
      const clean = result.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim()
      const patch = JSON.parse(clean)
      const updated: typeof generatedCard = {
        ...generatedCard,
        data: { ...generatedCard.data, ...patch },
      }
      setGeneratedCard(updated)
      setJsonText(JSON.stringify(updated, null, 2))
      toast.success('Campo corrigido!')
    } catch {
      toast.error('Erro ao corrigir campo')
    }
  }

  const handleFixWithAI = async () => {
    if (!jsonText || fixing) return
    setFixing(true)
    let accumulated = ''
    try {
      const result = await generationApi.fixCard(jsonText, jsonErrors, chunk => {
        accumulated += chunk
        setJsonText(accumulated)
      })
      const { ok, card, errors } = validate_card_client(result)
      if (ok && card) {
        setGeneratedCard(card)
        setJsonErrors([])
        setJsonText(JSON.stringify(card, null, 2))
        toast.success('JSON corrigido pela IA!')
      } else {
        setJsonErrors(errors)
        toast.error('IA não conseguiu corrigir todos os erros')
      }
    } catch {
      toast.error('Erro ao chamar IA')
    } finally {
      setFixing(false)
    }
  }

  const handleExport = () => {
    if (!generatedCard) return
    exportCard(generatedCard, currentProject?.character_name || 'character')
    toast.success('Card exportado!')
  }

  const hasContent = !!generatedCard || !!jsonText
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'json', label: 'JSON', icon: Code },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#2a2a2a]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px
              ${tab === t.id ? 'text-[#9b59b6] border-[#9b59b6]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
        <div className="ml-auto pb-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={!generatedCard}
          >
            <Download size={13} /> Exportar .json
          </Button>
        </div>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <p className="text-gray-500 text-sm">Nenhum card gerado ainda</p>
          <p className="text-gray-700 text-xs mt-1">Use o painel de Geração no Editor</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          {tab === 'preview' && (
            generatedCard
              ? <CardPreview card={generatedCard} />
              : (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <p className="text-gray-500 text-sm">Preview indisponível</p>
                  <p className="text-gray-600 text-xs mt-1">O JSON tem erros — corrija na aba JSON</p>
                </div>
              )
          )}

          {tab === 'json' && (
            <div className="flex flex-col h-full">
              {jsonErrors.length > 0 && (
                <div className="px-4 py-2 bg-yellow-900/20 border-b border-yellow-900/40 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-yellow-400 font-medium mb-1">
                        JSON com problemas — edite manualmente ou corrija com IA:
                      </p>
                      {jsonErrors.map((e, i) => (
                        <p key={i} className="text-xs text-red-400">• {e}</p>
                      ))}
                    </div>
                    <button
                      onClick={handleFixWithAI}
                      disabled={fixing}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-[#9b59b6]/20 text-[#9b59b6] border border-[#9b59b6]/30
                        hover:bg-[#9b59b6]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {fixing ? (
                        <span className="w-3 h-3 border border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Wand2 size={12} />
                      )}
                      {fixing ? 'Corrigindo...' : 'Corrigir com IA'}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex-1">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme="vs-dark"
                  value={jsonText}
                  onChange={handleJsonChange}
                  options={{ fontSize: 12, minimap: { enabled: false }, wordWrap: 'on' }}
                />
              </div>
            </div>
          )}

          {tab === 'checklist' && (
            generatedCard
              ? <QualityChecklist card={generatedCard} onFixCheck={handleFixCheck} />
              : (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <p className="text-gray-500 text-sm">Checklist indisponível</p>
                  <p className="text-gray-600 text-xs mt-1">O JSON tem erros — corrija na aba JSON</p>
                </div>
              )
          )}
        </div>
      )}
    </div>
  )
}
