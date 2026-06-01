import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wand2, Sparkles, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { TokenCounter } from './TokenCounter'
import { StreamingOutput } from './StreamingOutput'
import { PresetMultiSelect } from './PresetMultiSelect'
import { presetsApi } from '../../api/presets'
import { generationApi } from '../../api/generation'
import { useGenerationStore } from '../../store/useGenerationStore'
import { CHARA_FIELDS } from '../../types'
import type { FieldPreset } from '../../types'

interface Props {
  projectId: number
}

const FIELD_OPTIONS = CHARA_FIELDS.map(f => ({ value: f, label: f }))
const MODE_OPTIONS = [
  { value: 'full',   label: 'Card Completo' },
  { value: 'field',  label: 'Campo Específico' },
  { value: 'refine', label: 'Refinar Campo' },
]

export function GenerationPanel({ projectId }: Props) {
  const navigate = useNavigate()
  const {
    mode, selectedField, selectedPresetIds, selectedPresetId, streaming,
    setMode, setSelectedField, setSelectedPresetIds, setSelectedPresetId,
    setStreaming, appendStreamingText, resetStreamingText,
    setCurrentField, setGeneratedCard, resetFieldProgress,
  } = useGenerationStore()

  const [presets, setPresets] = useState<FieldPreset[]>([])
  const [refineInstruction, setRefineInstruction] = useState('')
  const [refineContent, setRefineContent] = useState('')

  useEffect(() => {
    presetsApi.list().then(setPresets).catch(() => {})
  }, [])

  const fieldPresets = presets.filter(p => p.target_field === selectedField)
  const presetOptions = [
    { value: '', label: 'Sem preset' },
    ...fieldPresets.map(p => ({ value: String(p.id), label: p.name })),
  ]

  const handleGenerate = async () => {
    if (streaming) return

    if (mode === 'full') {
      resetFieldProgress()
      setGeneratedCard(null)
      navigate(`/editor/${projectId}/generating`)
      return
    }

    setStreaming(true)
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
      setStreaming(false)
      setCurrentField(null)
    }
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
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
        loading={mode !== 'full' && streaming}
        disabled={mode !== 'full' && streaming}
        className="w-full justify-center"
        size="md"
      >
        {mode === 'full'   && <><Wand2 size={16} /> Gerar Card</>}
        {mode === 'field'  && <><Sparkles size={16} /> Gerar Campo</>}
        {mode === 'refine' && <><RefreshCw size={16} /> Refinar</>}
      </Button>

      {mode !== 'full' && <StreamingOutput />}
    </div>
  )
}
