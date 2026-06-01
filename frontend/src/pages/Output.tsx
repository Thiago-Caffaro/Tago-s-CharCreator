import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Download, CheckSquare, Eye, Code, Wand2, Save,
  ImagePlus, FileJson, Image as ImageIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'
import { useGenerationStore } from '../store/useGenerationStore'
import { useProjectStore } from '../store/useProjectStore'
import { Button } from '../components/ui/Button'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CardPreview } from '../components/card-output/CardPreview'
import { QualityChecklist } from '../components/card-output/QualityChecklist'
import { validate_card_client, patchCardClient } from '../utils/validators'
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
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== Number(projectId))) {
      fetchProject(Number(projectId))
    }
  }, [projectId])

  useEffect(() => {
    if (generatedCard) {
      setJsonText(JSON.stringify(generatedCard, null, 2))
      setJsonErrors([])
    } else if (currentProject?.last_generated_card) {
      const { ok, card } = validate_card_client(currentProject.last_generated_card)
      if (ok && card) {
        setGeneratedCard(card)
      } else {
        const { patched, remainingErrors, didPatch } = patchCardClient(currentProject.last_generated_card)
        if (remainingErrors.length === 0) {
          const { card: fixed } = validate_card_client(patched)
          if (fixed) {
            setGeneratedCard(fixed)
            if (didPatch) toast.success('Campos ausentes preenchidos automaticamente')
            return
          }
        }
        setJsonText(patched)
        setJsonErrors(remainingErrors)
        setTab('json')
      }
    } else if (streamingText) {
      const { ok, card } = validate_card_client(streamingText)
      if (ok && card) {
        setGeneratedCard(card)
      } else {
        const { patched, remainingErrors, didPatch } = patchCardClient(streamingText)
        if (remainingErrors.length === 0) {
          const { card: fixed } = validate_card_client(patched)
          if (fixed) {
            setGeneratedCard(fixed)
            if (didPatch) toast.success('Campos ausentes preenchidos automaticamente')
            return
          }
        }
        setJsonText(patched)
        setJsonErrors(remainingErrors)
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
      const updated = { ...generatedCard, data: { ...generatedCard.data, ...patch } }
      setGeneratedCard(updated)
      setJsonText(JSON.stringify(updated, null, 2))
      toast.success('Campo corrigido!')
    } catch {
      toast.error('Erro ao corrigir campo')
    }
  }

  const handleFixWithAI = async () => {
    if (!jsonText || fixing) return
    const { patched, remainingErrors, didPatch } = patchCardClient(jsonText)
    if (remainingErrors.length === 0) {
      const { card } = validate_card_client(patched)
      if (card) {
        setGeneratedCard(card)
        setJsonErrors([])
        setJsonText(JSON.stringify(card, null, 2))
        toast.success('Corrigido automaticamente!')
        return
      }
    }
    setFixing(true)
    let accumulated = ''
    try {
      const result = await generationApi.fixCard(patched, remainingErrors, chunk => {
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
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    const reader = new FileReader()
    reader.onload = ev => setAvatarDataUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const hasContent = !!generatedCard || !!jsonText

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'preview',   label: 'Preview',   icon: Eye },
    { id: 'json',      label: 'JSON',       icon: Code },
    { id: 'checklist', label: 'Checklist',  icon: CheckSquare },
  ]

  return (
    <div className="flex flex-col h-full">

      {/* Tab bar */}
      <div className="flex items-center border-b border-[#2a2a2a] bg-[#1a1a1a] shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium
              border-b-2 transition-colors
              ${tab === t.id
                ? 'text-[#9b59b6] border-[#9b59b6]'
                : 'text-gray-500 border-transparent'
              }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}

        {/* Actions: avatar + save + export */}
        <div className="flex items-center gap-1 px-2 pb-1 shrink-0">
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

          <button
            onClick={() => avatarInputRef.current?.click()}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#333]
              bg-[#242424] overflow-hidden"
            title="Avatar"
          >
            {avatarDataUrl
              ? <img src={avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
              : <ImagePlus size={13} className="text-gray-500" />
            }
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !hasContent}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#333]
              bg-[#242424] text-gray-400 disabled:opacity-40 active:bg-[#2a2a2a]"
            title="Salvar"
          >
            {saving
              ? <span className="w-3 h-3 border border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
              : <Save size={13} />
            }
          </button>

          <button
            onClick={() => setExportOpen(true)}
            disabled={!generatedCard}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#333]
              bg-[#242424] text-gray-400 disabled:opacity-40 active:bg-[#2a2a2a]"
            title="Exportar"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!hasContent ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
          <p className="text-gray-500 text-sm">Nenhum card gerado ainda</p>
          <p className="text-gray-700 text-xs mt-1">Use a aba Gerar no Editor</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          {tab === 'preview' && (
            generatedCard
              ? <CardPreview card={generatedCard} />
              : (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <p className="text-gray-500 text-sm">Preview indisponível</p>
                  <p className="text-gray-600 text-xs mt-1">Corrija os erros na aba JSON</p>
                </div>
              )
          )}

          {tab === 'json' && (
            <div className="flex flex-col h-full">
              {jsonErrors.length > 0 && (
                <div className="px-4 py-3 bg-yellow-900/20 border-b border-yellow-900/40 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-yellow-400 font-medium mb-1">JSON com problemas:</p>
                      {jsonErrors.map((e, i) => (
                        <p key={i} className="text-xs text-red-400 truncate">• {e}</p>
                      ))}
                    </div>
                    <button
                      onClick={handleFixWithAI}
                      disabled={fixing}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                        bg-[#9b59b6]/20 text-[#9b59b6] border border-[#9b59b6]/30
                        active:bg-[#9b59b6]/30 disabled:opacity-50 transition-colors"
                    >
                      {fixing
                        ? <span className="w-3 h-3 border border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
                        : <Wand2 size={12} />
                      }
                      {fixing ? 'Corrigindo...' : 'Corrigir'}
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
                  options={{ fontSize: 13, minimap: { enabled: false }, wordWrap: 'on' }}
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
                  <p className="text-gray-600 text-xs mt-1">Corrija os erros na aba JSON</p>
                </div>
              )
          )}
        </div>
      )}

      {/* Export bottom sheet */}
      <BottomSheet open={exportOpen} onClose={() => setExportOpen(false)} title="Exportar Card">
        <div className="px-3 py-3 space-y-2">
          <button
            onClick={() => { exportCard(generatedCard!, currentProject?.character_name || 'character'); setExportOpen(false) }}
            className="flex items-center gap-4 w-full px-4 py-4 rounded-xl bg-[#242424] active:bg-[#2a2a2a]"
          >
            <FileJson size={20} className="text-[#9b59b6]" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-200">Download .json</p>
              <p className="text-xs text-gray-500">Formato padrão SillyTavern</p>
            </div>
          </button>
          <button
            onClick={async () => {
              setExportOpen(false)
              try {
                await exportCardAsPng(generatedCard!, avatarDataUrl, currentProject?.character_name || 'character')
              } catch { toast.error('Erro ao exportar PNG') }
            }}
            className="flex items-center gap-4 w-full px-4 py-4 rounded-xl bg-[#242424] active:bg-[#2a2a2a]"
          >
            <ImageIcon size={20} className="text-[#9b59b6]" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-200">Download .png</p>
              <p className="text-xs text-gray-500">
                {avatarDataUrl ? 'Com avatar' : 'Sem avatar (placeholder)'}
              </p>
            </div>
          </button>
        </div>
        <div className="h-2" />
      </BottomSheet>
    </div>
  )
}
