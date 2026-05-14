import { create } from 'zustand'
import type { CharaCardV2 } from '../types'

type GenerationMode = 'full' | 'field' | 'refine'

interface GenerationStore {
  mode: GenerationMode
  selectedField: string
  selectedPresetIds: number[]      // multi-select — used for full-card generation
  selectedPresetId: number | null  // single-select — used for field/refine generation
  streaming: boolean
  streamingText: string
  generatedCard: CharaCardV2 | null
  tokenEstimate: number
  setMode: (mode: GenerationMode) => void
  setSelectedField: (field: string) => void
  setSelectedPresetIds: (ids: number[]) => void
  togglePresetId: (id: number) => void
  setSelectedPresetId: (id: number | null) => void
  setStreaming: (v: boolean) => void
  appendStreamingText: (chunk: string) => void
  resetStreamingText: () => void
  setGeneratedCard: (card: CharaCardV2 | null) => void
  setTokenEstimate: (n: number) => void
}

export const useGenerationStore = create<GenerationStore>(set => ({
  mode: 'full',
  selectedField: 'description',
  selectedPresetIds: [],
  selectedPresetId: null,
  streaming: false,
  streamingText: '',
  generatedCard: null,
  tokenEstimate: 0,

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
  setGeneratedCard: card => set({ generatedCard: card }),
  setTokenEstimate: n => set({ tokenEstimate: n }),
}))
