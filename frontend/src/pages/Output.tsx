import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Download, CheckSquare, Eye, Code, Wand2, Save,
  ImagePlus, FileJson, ImageIcon, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'
import { useGenerationStore } from '../store/useGenerationStore'
import { useProjectStore } from '../store/useProjectStore'
import { Button } from '../components/ui/Button'
import { CardPreview } from '../components/card-output/CardPreview'
import { QualityChecklist } from '../components/card-output/QualityChecklist'
import { validate_card_client } from '../utils/validators'
import { exportCard, exportCardAsPng } from '../utils/cardExporter'
import { generationApi } from '../api/generation'

type Tab = 'preview' | 'json' | 'checklist'

export default function Output() {
  const { projectId } = useParams<{ projectId: string }>()
  const { generatedCard, streamingText, setGeneratedCard } = useGenerationStore()
  const { currentProject, updateProject, fetchProject } = useProjectStore()

  const [tab, setTab] = useState<Tab>('preview')
  const [jsonText, setJsonText] = useState('')
  const [jsonErrors, setJsonErrors] = useState<string[]>([])
  const [fixing, setFixing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Ensure the project is loaded even when navigating directly to this URL
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== Number(projectId))) {
      fetchProject(Number(projectId))
    }
  }, [projectId])

  // Close export dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  const handleSave = async () => {
    if (!projectId || !jsonText || saving) return
    setSaving(true)
    try {
      await updateProject(Number(projectId), { last_generated_card: jsonText })
      toast.success('Card salvo!')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleFixCheck = async (checkId: string) => {
    if (!generatedCard) return
    try {
      const result = await generationApi.fixCheck(JSON.stringify(generatedCard), checkId)
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => setAvatarDataUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  const handleExportJson = () => {
    if (!generatedCard) return
    exportCard(generatedCard, currentProject?.character_name || 'character')
    setExportOpen(false)
  }

  const handleExportPng = async () => {
    if (!generatedCard) return
    setExportOpen(false)
    try {
      await exportCardAsPng(generatedCard, avatarDataUrl, currentProject?.character_name || 'character')
    } catch {
      toast.error('Erro ao exportar PNG')
    }
  }

  const charName = currentProject?.character_name || 'character'
  const hasContent = !!generatedCard || !!jsonText
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'json', label: 'JSON', icon: Code },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  ]

  return (
    <div className="flex flex-col h-full">

      {/* ── Tab bar + actions ── */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#2a2a2a] shrink-0">
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

        <div className="ml-auto flex items-center gap-2 pb-1">

          {/* Avatar upload */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            title={avatarDataUrl ? 'Trocar imagem do personagem' : 'Carregar imagem do personagem'}
            className="relative flex items-center justify-center w-7 h-7 rounded-lg border border-[#333]
              bg-[#242424] hover:border-[#555] transition-colors overflow-hidden shrink-0"
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus size={13} className="text-gray-500" />
            )}
          </button>

          {/* Save button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={saving || !hasContent}
          >
            <Save size={13} />
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>

          {/* Export dropdown */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={!generatedCard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-[#242424] border border-[#333] text-gray-300
                hover:border-[#555] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={13} />
              Exportar
              <ChevronDown size={11} className={`text-gray-500 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportOpen && generatedCard && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-[#333] bg-[#1e1e1e]
                shadow-xl overflow-hidden z-50">
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-300
                    hover:bg-[#2a2a2a] transition-colors"
                >
                  <FileJson size={13} className="text-[#9b59b6]" />
                  Download .json
                </button>
                <button
                  onClick={handleExportPng}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-300
                    hover:bg-[#2a2a2a] transition-colors border-t border-[#2a2a2a]"
                >
                  <ImageIcon size={13} className="text-[#9b59b6]" />
                  <span className="flex-1 text-left">Download .png</span>
                  {!avatarDataUrl && (
                    <span className="text-[10px] text-gray-600 ml-1">placeholder</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
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
