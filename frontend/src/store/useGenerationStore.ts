import { create } from 'zustand'
import type { CharaCardV2 } from '../types'

type GenerationMode = 'full' | 'field' | 'refine'
type FieldStatus = 'pending' | 'generating' | 'done' | 'error'

interface GenerationStore {
  mode: GenerationMode
  selectedField: string
  selectedPresetIds: number[]      // multi-select — used for full-card generation
  selectedPresetId: number | null  // single-select — used for field/refine generation
  streaming: boolean
  streamingText: string
  currentField: string | null      // field being generated in chunked full-card mode
  generatedCard: CharaCardV2 | null
  tokenEstimate: number

  // Per-field progress tracking (used by GeneratingPage)
  fieldStatuses: Record<string, FieldStatus>
  fieldContents: Record<string, string>   // final content once a field is done
  liveFieldText: string                   // live buffer for the currently streaming field
  generationComplete: boolean

  setMode: (mode: GenerationMode) => void
  setSelectedField: (field: string) => void
  setSelectedPresetIds: (ids: number[]) => void
  togglePresetId: (id: number) => void
  setSelectedPresetId: (id: number | null) => void
  setStreaming: (v: boolean) => void
  appendStreamingText: (chunk: string) => void
  resetStreamingText: () => void
  setCurrentField: (field: string | null) => void
  setGeneratedCard: (card: CharaCardV2 | null) => void
  setTokenEstimate: (n: number) => void

  setFieldStatus: (field: string, status: FieldStatus) => void
  setFieldContent: (field: string, content: string) => void
  appendLiveFieldText: (text: string) => void
  clearLiveFieldText: () => void
  resetFieldProgress: () => void
  setGenerationComplete: (v: boolean) => void
}

export const useGenerationStore = create<GenerationStore>(set => ({
  mode: 'full',
  selectedField: 'description',
  selectedPresetIds: [],
  selectedPresetId: null,
  streaming: false,
  streamingText: '',
  currentField: null,
  generatedCard: null,
  tokenEstimate: 0,

  fieldStatuses: {},
  fieldContents: {},
  liveFieldText: '',
  generationComplete: false,

  setMode: mode => set({ mode }),
  setSelectedField: field => set({ selectedField: field }),
  setSelectedPresetIds: ids => set({ selectedPresetIds: ids }),
  togglePresetId: id => set(s => ({
    selectedPresetIds: s.selectedPresetIds.includes(id)
      ? s.selectedPresetIds.filter(x => x !== id)
      : [...s.selectedPresetIds, id],
  })),
  setSelectedPresetId: id => set({ selectedPresetId: id }),
  setStreaming: v => set({ streaming: v }),
  appendStreamingText: chunk => set(s => ({ streamingText: s.streamingText + chunk })),
  resetStreamingText: () => set({ streamingText: '' }),
  setCurrentField: field => set({ currentField: field }),
  setGeneratedCard: card => set({ generatedCard: card }),
  setTokenEstimate: n => set({ tokenEstimate: n }),

  setFieldStatus: (field, status) =>
    set(s => ({ fieldStatuses: { ...s.fieldStatuses, [field]: status } })),
  setFieldContent: (field, content) =>
    set(s => ({ fieldContents: { ...s.fieldContents, [field]: content } })),
  appendLiveFieldText: text => set(s => ({ liveFieldText: s.liveFieldText + text })),
  clearLiveFieldText: () => set({ liveFieldText: '' }),
  resetFieldProgress: () => set({
    fieldStatuses: {},
    fieldContents: {},
    liveFieldText: '',
    generationComplete: false,
  }),
  setGenerationComplete: v => set({ generationComplete: v }),
}))
