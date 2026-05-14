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
import { useProjectStore } from '../../store/useProjectStore'
import { CHARA_FIELDS } from '../../types'
import type { FieldPreset } from '../../types'
import { validate_card_client } from '../../utils/validators'

interface Props {
  projectId: number
}

const FIELD_OPTIONS = CHARA_FIELDS.map(f => ({ value: f, label: f }))
const MODE_OPTIONS = [
  { value: 'full', label: 'Card Completo' },
  { value: 'field', label: 'Campo Específico' },
  { value: 'refine', label: 'Refinar Campo' },
]

export function GenerationPanel({ projectId }: Props) {
  const navigate = useNavigate()
  const { currentProject, updateProject } = useProjectStore()
  const {
    mode, selectedField, selectedPresetIds, selectedPresetId, streaming,
    setMode, setSelectedField, setSelectedPresetIds, setSelectedPresetId,
    setStreaming, appendStreamingText, resetStreamingText, setGeneratedCard,
  } = useGenerationStore()

  const [presets, setPresets] = useState<FieldPreset[]>([])
  const [refineInstruction, setRefineInstruction] = useState('')
  const [refineContent, setRefineContent] = useState('')

  useEffect(() => {
    presetsApi.list().then(setPresets).catch(() => {})
  }, [])

  // Field presets for single-select (field/refine mode)
  const fieldPresets = presets.filter(p => p.target_field === selectedField)
  const presetOptions = [
    { value: '', label: 'Sem preset' },
    ...fieldPresets.map(p => ({ value: String(p.id), label: p.name })),
  ]

  const handleGenerate = async () => {
    if (streaming) return
    setStreaming(true)
    resetStreamingText()
    try {
      if (mode === 'full') {
        const result = await generationApi.fullCard(projectId, selectedPresetIds, appendStreamingText)
        const { ok, card } = validate_card_client(result)
        if (ok && card) {
          setGeneratedCard(card)
          await updateProject(projectId, { last_generated_card: result })
          toast.success('Card gerado! Veja em Output.')
          navigate(`/editor/${projectId}/output`)
        } else {
          toast.error('JSON gerado tem problemas. Verifique o Output.')
          navigate(`/editor/${projectId}/output`)
        }
      } else if (mode === 'field') {
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
    }
  }

  return (
    <aside className="w-[300px] bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col shrink-0 overflow-auto">
      <div className="px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Geração</span>
      </div>

      <div className="p-4 space-y-4 flex-1">
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

        {/* Full card mode: multi-select presets */}
        {mode === 'full' && (
          <PresetMultiSelect
            presets={presets}
            selectedIds={selectedPresetIds}
            onChange={setSelectedPresetIds}
          />
        )}

        {/* Field mode: single-select preset */}
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
          loading={streaming}
          disabled={streaming}
          className="w-full justify-center"
          size="md"
        >
          {mode === 'full' && <><Wand2 size={15} /> Gerar Card</>}
          {mode === 'field' && <><Sparkles size={15} /> Gerar Campo</>}
          {mode === 'refine' && <><RefreshCw size={15} /> Refinar</>}
        </Button>

        <StreamingOutput />
      </div>
    </aside>
  )
}
