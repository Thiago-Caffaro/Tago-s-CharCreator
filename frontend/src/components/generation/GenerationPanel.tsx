import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wand2, Sparkles, RefreshCw, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { TokenCounter } from './TokenCounter'
import { StreamingOutput } from './StreamingOutput'
import { PresetMultiSelect } from './PresetMultiSelect'
import { ProjectGenerationSettings } from './ProjectGenerationSettings'
import { presetsApi } from '../../api/presets'
import { generationApi } from '../../api/generation'
import { useGenerationStore } from '../../store/useGenerationStore'
import { useProjectStore } from '../../store/useProjectStore'
import { CHARA_FIELDS } from '../../types'
import type { FieldPreset } from '../../types'

interface Props {
  projectId: number
  /** When true, renders as a 300px sidebar with a header label (desktop) */
  desktop?: boolean
}

const FIELD_OPTIONS = CHARA_FIELDS.map(f => ({ value: f, label: f }))
const MODE_OPTIONS = [
  { value: 'full',   label: 'Card Completo' },
  { value: 'field',  label: 'Campo Específico' },
  { value: 'refine', label: 'Refinar Campo' },
]

export function GenerationPanel({ projectId, desktop }: Props) {
  const navigate = useNavigate()
  const {
    mode, selectedField, selectedPresetIds, selectedPresetId, fieldStreaming,
    setMode, setSelectedField, setSelectedPresetIds, setSelectedPresetId,
    setFieldStreaming, appendStreamingText, resetStreamingText,
    setCurrentField, setGeneratedCard, resetFieldProgress,
  } = useGenerationStore()

  const { currentProject } = useProjectStore()
  const [presets, setPresets] = useState<FieldPreset[]>([])
  const [refineInstruction, setRefineInstruction] = useState('')
  const [refineContent, setRefineContent] = useState('')
  const [showGenSettings, setShowGenSettings] = useState(false)

  useEffect(() => {
    presetsApi.list().then(setPresets).catch(() => {})
  }, [])

  const fieldPresets = presets.filter(p => p.target_field === selectedField)
  const presetOptions = [
    { value: '', label: 'Sem preset' },
    ...fieldPresets.map(p => ({ value: String(p.id), label: p.name })),
  ]

  const handleGenerate = async () => {
    if (fieldStreaming) return

    if (mode === 'full') {
      resetFieldProgress()
      setGeneratedCard(null)
      navigate(`/editor/${projectId}/generating`)
      return
    }

    setFieldStreaming(true)
    resetStreamingText()
    setCurrentField(null)

    try {
      if (mode === 'field') {
        await generationApi.field(projectId, selectedField, selectedPresetId ?? undefined, appendStreamingText)
        toast.success(`Campo '${selectedField}' gerado!`)
      } else if (mode === 'refine') {
        await generationApi.refine(projectId, selectedField, refineContent, refineInstruction, appendStreamingText)
        toast.success(`Campo '${selectedField}' refinado!`)
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro na geração')
    } finally {
      setFieldStreaming(false)
      setCurrentField(null)
    }
  }

  const hasOverride = !!(currentProject?.gen_model || currentProject?.gen_temperature != null || currentProject?.gen_top_p != null)

  const inner = (
    <div className="overflow-auto p-4 space-y-4 h-full">
      <button
        onClick={() => setShowGenSettings(true)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
          hasOverride
            ? 'border-[#9b59b6]/40 bg-[#9b59b6]/5 text-[#9b59b6]'
            : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-500 hover:text-gray-300 hover:border-[#333]'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Settings2 size={12} />
          Geração deste projeto
        </span>
        {hasOverride && <span className="text-[10px]">personalizado</span>}
      </button>

      <Select
        label="Modo"
        value={mode}
        onChange={e => setMode(e.target.value as any)}
        options={MODE_OPTIONS}
      />

      {(mode === 'field' || mode === 'refine') && (
        <Select
          label="Campo"
          value={selectedField}
          onChange={e => setSelectedField(e.target.value)}
          options={FIELD_OPTIONS}
        />
      )}

      {mode === 'full' && (
        <PresetMultiSelect
          presets={presets}
          selectedIds={selectedPresetIds}
          onChange={setSelectedPresetIds}
        />
      )}

      {mode === 'field' && (
        <Select
          label="Preset de Prompt"
          value={selectedPresetId ? String(selectedPresetId) : ''}
          onChange={e => setSelectedPresetId(e.target.value ? Number(e.target.value) : null)}
          options={presetOptions}
        />
      )}

      {mode === 'refine' && (
        <>
          <Textarea
            label="Conteúdo atual do campo"
            value={refineContent}
            onChange={e => setRefineContent(e.target.value)}
            placeholder="Cole o conteúdo atual aqui..."
            rows={4}
          />
          <Textarea
            label="Instrução de refinamento"
            value={refineInstruction}
            onChange={e => setRefineInstruction(e.target.value)}
            placeholder="ex: Torne mais poético, adicione mais detalhes físicos..."
            rows={3}
          />
        </>
      )}

      <TokenCounter projectId={projectId} />

      <Button
        onClick={handleGenerate}
        loading={mode !== 'full' && fieldStreaming}
        disabled={mode !== 'full' && fieldStreaming}
        className="w-full justify-center"
        size="md"
      >
        {mode === 'full'   && <><Wand2 size={16} /> Gerar Card</>}
        {mode === 'field'  && <><Sparkles size={16} /> Gerar Campo</>}
        {mode === 'refine' && <><RefreshCw size={16} /> Refinar</>}
      </Button>

      {mode !== 'full' && <StreamingOutput />}

      <ProjectGenerationSettings
        projectId={projectId}
        open={showGenSettings}
        onClose={() => setShowGenSettings(false)}
      />
    </div>
  )

  if (desktop) {
    return (
      <aside className="w-[300px] bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col shrink-0 overflow-auto">
        <div className="px-4 py-3 border-b border-[#2a2a2a] shrink-0">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Geração</span>
        </div>
        {inner}
      </aside>
    )
  }

  return inner
}
