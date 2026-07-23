import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Download, CheckSquare, Eye, Code, Wand2, Save,
  ImagePlus, FileJson, Image as ImageIcon, RefreshCw, ChevronDown,
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
import { presetsApi } from '../api/presets'
import { lorebookApi } from '../api/lorebook'
import type { FieldPreset, LorebookEntry } from '../types'
import { CHARA_FIELDS } from '../types'

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
  character_version:          'Versão',
  alternate_greetings:        'Saudações Alternativas',
}

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
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([])

  useEffect(() => {
    if (!projectId) return
    lorebookApi.list(Number(projectId)).then(setLorebookEntries).catch(() => {})
  }, [projectId])

  // Desktop export dropdown — kept separate from `exportOpen` (mobile
  // BottomSheet) since both toolbars are mounted at once behind lg:/hidden
  // and sharing one flag would pop the mobile sheet open over the desktop UI.
  const [desktopExportOpen, setDesktopExportOpen] = useState(false)
  const desktopExportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (desktopExportRef.current && !desktopExportRef.current.contains(e.target as Node)) {
        setDesktopExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Field regeneration state ─────────────────────────────────────────────
  const [presets, setPresets] = useState<FieldPreset[]>([])
  const [regenField, setRegenField] = useState<string | null>(null)
  const [regenPresetId, setRegenPresetId] = useState<string>('')
  const [regenStreaming, setRegenStreaming] = useState(false)
  const [regenText, setRegenText] = useState('')
  const regenScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    presetsApi.list().then(setPresets).catch(() => {})
  }, [])

  // Auto-scroll streaming output
  useEffect(() => {
    if (regenScrollRef.current) {
      regenScrollRef.current.scrollTop = regenScrollRef.current.scrollHeight
    }
  }, [regenText])

  const openRegenSheet = (field: string) => {
    setRegenField(field)
    setRegenPresetId('')
    setRegenText('')
  }

  const handleRegenerate = async () => {
    if (!regenField || regenStreaming || !projectId) return
    setRegenStreaming(true)
    setRegenText('')
    let accumulated = ''
    try {
      await generationApi.field(
        Number(projectId),
        regenField,
        regenPresetId ? Number(regenPresetId) : undefined,
        (chunk: string) => {
          accumulated += chunk
          setRegenText(accumulated)
        },
      )
      // Parse and merge the new field into the existing card
      if (generatedCard && accumulated.trim()) {
        const updated = {
          ...generatedCard,
          data: {
            ...generatedCard.data,
            [regenField]: regenField === 'tags' || regenField === 'alternate_greetings'
              ? (() => { try { return JSON.parse(accumulated.trim()) } catch { return accumulated.trim() } })()
              : accumulated.trim(),
          },
        }
        setGeneratedCard(updated)
        setJsonText(JSON.stringify(updated, null, 2))
        toast.success(`Campo "${FIELD_LABELS[regenField] ?? regenField}" regenerado!`)
        setRegenField(null)
      } else if (!accumulated.trim()) {
        toast.error('A IA não retornou conteúdo — tente novamente')
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro na regeneração')
    } finally {
      setRegenStreaming(false)
    }
  }

  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== Number(projectId))) {
      fetchProject(Number(projectId))
    }
  }, [projectId])

  // Load the persisted avatar once the project arrives — previously this was
  // purely local state, so it vanished on every navigation/reload and had to
  // be re-uploaded each time.
  useEffect(() => {
    if (currentProject && currentProject.id === Number(projectId)) {
      setAvatarDataUrl(currentProject.avatar ?? null)
    }
  }, [currentProject, projectId])

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
    reader.onload = async ev => {
      const dataUrl = ev.target?.result as string
      setAvatarDataUrl(dataUrl)
      if (projectId) {
        try {
          await updateProject(Number(projectId), { avatar: dataUrl })
        } catch {
          toast.error('Avatar carregado, mas não foi possível salvá-lo no projeto')
        }
      }
    }
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

      {/* Desktop tab bar + toolbar */}
      <div className="hidden lg:flex items-center gap-1 px-4 pt-3 border-b border-[#2a2a2a] shrink-0">
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
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

          <button
            onClick={() => avatarInputRef.current?.click()}
            title={avatarDataUrl ? 'Trocar imagem do personagem' : 'Carregar imagem do personagem'}
            className="relative flex items-center justify-center w-7 h-7 rounded-lg border border-[#333]
              bg-[#242424] hover:border-[#555] transition-colors overflow-hidden shrink-0"
          >
            {avatarDataUrl
              ? <img src={avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
              : <ImagePlus size={13} className="text-gray-500" />
            }
          </button>

          <Button variant="secondary" size="sm" onClick={handleSave} loading={saving} disabled={saving || !hasContent}>
            <Save size={13} />
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>

          <div ref={desktopExportRef} className="relative">
            <button
              onClick={() => setDesktopExportOpen(o => !o)}
              disabled={!generatedCard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-[#242424] border border-[#333] text-gray-300
                hover:border-[#555] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={13} />
              Exportar
              <ChevronDown size={11} className={`text-gray-500 transition-transform ${desktopExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {desktopExportOpen && generatedCard && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-[#333] bg-[#1e1e1e]
                shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => { exportCard(generatedCard, currentProject?.character_name || 'character', lorebookEntries); setDesktopExportOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-300
                    hover:bg-[#2a2a2a] transition-colors"
                >
                  <FileJson size={13} className="text-[#9b59b6]" />
                  Download .json
                </button>
                <button
                  onClick={async () => {
                    setDesktopExportOpen(false)
                    try {
                      await exportCardAsPng(generatedCard, avatarDataUrl, currentProject?.character_name || 'character', lorebookEntries)
                    } catch { toast.error('Erro ao exportar PNG') }
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-gray-300
                    hover:bg-[#2a2a2a] transition-colors border-t border-[#2a2a2a]"
                >
                  <ImageIcon size={13} className="text-[#9b59b6]" />
                  <span className="flex-1 text-left">Download .png</span>
                  {!avatarDataUrl && <span className="text-[10px] text-gray-600 ml-1">placeholder</span>}
                </button>
                {lorebookEntries.length > 0 && (
                  <p className="px-3 py-2 text-[10px] text-gray-600 border-t border-[#2a2a2a]">
                    Inclui {lorebookEntries.length} entrada{lorebookEntries.length !== 1 ? 's' : ''} do lorebook
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="flex lg:hidden items-center border-b border-[#2a2a2a] bg-[#1a1a1a] shrink-0">
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
              ? <CardPreview card={generatedCard} onRegenerateField={openRegenSheet} />
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

      {/* ── Field regeneration bottom sheet ── */}
      <BottomSheet
        open={!!regenField}
        onClose={() => { if (!regenStreaming) setRegenField(null) }}
        title={regenField ? `Refazer: ${FIELD_LABELS[regenField] ?? regenField}` : 'Refazer Campo'}
      >
        <div className="px-4 py-3 space-y-3">
          {/* Preset selector */}
          {(() => {
            const fieldPresets = presets.filter(p => p.target_field === regenField)
            if (fieldPresets.length > 0) {
              return (
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5">
                    Preset de Prompt (opcional)
                  </label>
                  <select
                    value={regenPresetId}
                    onChange={e => setRegenPresetId(e.target.value)}
                    className="w-full bg-[#242424] border border-[#333] text-gray-200 text-sm
                      rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#9b59b6]"
                    disabled={regenStreaming}
                  >
                    <option value="">Sem preset</option>
                    {fieldPresets.map(p => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )
            }
            return null
          })()}

          {/* Streaming output */}
          {regenText && (
            <div
              ref={regenScrollRef}
              className="bg-[#0f0f0f] rounded-xl p-3 max-h-48 overflow-auto border border-[#2a2a2a]"
            >
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed">
                {regenText}
                {regenStreaming && <span className="text-[#9b59b6] animate-pulse">█</span>}
              </pre>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setRegenField(null)}
              disabled={regenStreaming}
              className="flex-1 py-3 text-sm text-gray-400 bg-[#242424] rounded-xl
                border border-[#333] active:bg-[#2a2a2a] disabled:opacity-40 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenStreaming}
              className="flex-1 py-3 text-sm bg-[#9b59b6] active:bg-[#8e44ad] text-white
                rounded-xl font-semibold flex items-center justify-center gap-2
                disabled:opacity-50 transition-colors"
            >
              {regenStreaming
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Gerando...</>
                : <><RefreshCw size={14} /> Gerar</>
              }
            </button>
          </div>
        </div>
        <div className="h-2" />
      </BottomSheet>

      {/* Export bottom sheet */}
      <BottomSheet open={exportOpen} onClose={() => setExportOpen(false)} title="Exportar Card">
        <div className="px-3 py-3 space-y-2">
          {lorebookEntries.length > 0 && (
            <p className="px-1 text-[11px] text-gray-500">
              Inclui {lorebookEntries.length} entrada{lorebookEntries.length !== 1 ? 's' : ''} do lorebook
            </p>
          )}
          <button
            onClick={() => { exportCard(generatedCard!, currentProject?.character_name || 'character', lorebookEntries); setExportOpen(false) }}
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
                await exportCardAsPng(generatedCard!, avatarDataUrl, currentProject?.character_name || 'character', lorebookEntries)
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
