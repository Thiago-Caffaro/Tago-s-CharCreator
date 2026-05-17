import { create } from 'zustand'
import toast from 'react-hot-toast'
import { imagePresetsApi, projectImagesApi, kieApi } from '../api/images'
import type { GeneratedImage, ImagePreset, GenerateImageRequest } from '../api/images'

export const OPENROUTER_FLUX_MODELS = [
  { id: 'black-forest-labs/flux-2-pro', label: 'FLUX 2 Pro' },
  { id: 'black-forest-labs/flux-2-pro-ultra', label: 'FLUX 2 Pro Ultra (supports img ref)' },
  { id: 'black-forest-labs/flux-schnell', label: 'FLUX Schnell — fast, cheap' },
  { id: 'black-forest-labs/flux-dev', label: 'FLUX Dev' },
  { id: 'black-forest-labs/flux-1.1-pro', label: 'FLUX 1.1 Pro' },
  { id: 'black-forest-labs/flux-1.1-pro-ultra', label: 'FLUX 1.1 Pro Ultra (supports img ref)' },
]

export const KIE_MODELS = [
  { id: 'flux-kontext-pro', label: 'FLUX Kontext Pro' },
  { id: 'flux-kontext-max', label: 'FLUX Kontext Max' },
  { id: 'flux-2-pro', label: 'FLUX 2 Pro' },
  { id: 'flux-2-flex', label: 'FLUX 2 Flex' },
  { id: 'flux-2-dev', label: 'FLUX 2 Dev' },
  { id: 'gpt4o-image', label: 'GPT-4o Image' },
]

export const KIE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']

const OPENROUTER_ULTRA_MODELS = new Set([
  'black-forest-labs/flux-2-pro-ultra',
  'black-forest-labs/flux-1.1-pro-ultra',
])

export function supportsImageRef(provider: 'openrouter' | 'kie_ai', model: string): boolean {
  if (provider === 'kie_ai') return true
  return OPENROUTER_ULTRA_MODELS.has(model)
}

interface ImageStore {
  images: GeneratedImage[]
  presets: ImagePreset[]
  generating: boolean
  loadingImages: boolean
  kieBalance: number | null

  // Provider + form state
  provider: 'openrouter' | 'kie_ai'
  prompt: string
  negativePrompt: string
  selectedModel: string
  selectedPresetId: number | null
  // OpenRouter
  width: number
  height: number
  guidanceScale: number | null
  steps: number | null
  seed: number | null
  imageRefB64: string | null
  // Kie.ai
  aspectRatio: string
  safetyTolerance: number
  inputImageUrl: string | null

  fetchImages: (projectId: number) => Promise<void>
  fetchPresets: (category?: string) => Promise<void>
  generate: (projectId: number) => Promise<void>
  deleteImage: (imageId: number) => Promise<void>
  setAvatarImage: (imageId: number) => Promise<void>
  fetchKieBalance: () => Promise<void>

  setProvider: (v: 'openrouter' | 'kie_ai') => void
  setPrompt: (v: string) => void
  setNegativePrompt: (v: string) => void
  setModel: (v: string) => void
  setPresetId: (id: number | null) => void
  setWidth: (v: number) => void
  setHeight: (v: number) => void
  setGuidanceScale: (v: number | null) => void
  setSteps: (v: number | null) => void
  setSeed: (v: number | null) => void
  setImageRefB64: (v: string | null) => void
  setAspectRatio: (v: string) => void
  setSafetyTolerance: (v: number) => void
  setInputImageUrl: (v: string | null) => void
}

export const useImageStore = create<ImageStore>((set, get) => ({
  images: [],
  presets: [],
  generating: false,
  loadingImages: false,
  kieBalance: null,

  provider: 'openrouter',
  prompt: '',
  negativePrompt: '',
  selectedModel: 'black-forest-labs/flux-schnell',
  selectedPresetId: null,
  width: 1024,
  height: 1024,
  guidanceScale: null,
  steps: null,
  seed: null,
  imageRefB64: null,
  aspectRatio: '1:1',
  safetyTolerance: 6,
  inputImageUrl: null,

  fetchImages: async (projectId) => {
    set({ loadingImages: true })
    try {
      const images = await projectImagesApi.list(projectId)
      set({ images })
    } catch {
      toast.error('Failed to load images')
    } finally {
      set({ loadingImages: false })
    }
  },

  fetchPresets: async (category) => {
    try {
      const presets = await imagePresetsApi.list(category)
      set({ presets })
    } catch {
      toast.error('Failed to load image presets')
    }
  },

  generate: async (projectId) => {
    const s = get()
    if (!s.prompt.trim()) {
      toast.error('Enter a prompt first')
      return
    }
    set({ generating: true })
    try {
      const req: GenerateImageRequest = {
        prompt: s.prompt,
        provider: s.provider,
        model: s.selectedModel,
        preset_id: s.selectedPresetId,
        ...(s.provider === 'openrouter'
          ? {
              width: s.width,
              height: s.height,
              negative_prompt: s.negativePrompt || undefined,
              guidance_scale: s.guidanceScale,
              steps: s.steps,
              seed: s.seed,
              image_ref_b64: s.imageRefB64,
            }
          : {
              aspect_ratio: s.aspectRatio,
              safety_tolerance: s.safetyTolerance,
              input_image_url: s.inputImageUrl || undefined,
            }),
      }
      const newImage = await projectImagesApi.generate(projectId, req)
      set((st) => ({ images: [newImage, ...st.images] }))
      toast.success('Image generated!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      toast.error(msg)
    } finally {
      set({ generating: false })
    }
  },

  deleteImage: async (imageId) => {
    await projectImagesApi.delete(imageId)
    set((s) => ({ images: s.images.filter((i) => i.id !== imageId) }))
  },

  setAvatarImage: async (imageId) => {
    await projectImagesApi.setAvatar(imageId)
    set((s) => ({
      images: s.images.map((i) => ({ ...i, is_avatar: i.id === imageId })),
    }))
  },

  fetchKieBalance: async () => {
    try {
      const balance = await kieApi.getBalance()
      set({ kieBalance: balance })
    } catch {
      // silently fail — balance is non-critical
    }
  },

  setProvider: (v) => set({ provider: v }),
  setPrompt: (v) => set({ prompt: v }),
  setNegativePrompt: (v) => set({ negativePrompt: v }),
  setModel: (v) => set({ selectedModel: v }),
  setPresetId: (id) => set({ selectedPresetId: id }),
  setWidth: (v) => set({ width: v }),
  setHeight: (v) => set({ height: v }),
  setGuidanceScale: (v) => set({ guidanceScale: v }),
  setSteps: (v) => set({ steps: v }),
  setSeed: (v) => set({ seed: v }),
  setImageRefB64: (v) => set({ imageRefB64: v }),
  setAspectRatio: (v) => set({ aspectRatio: v }),
  setSafetyTolerance: (v) => set({ safetyTolerance: v }),
  setInputImageUrl: (v) => set({ inputImageUrl: v }),
}))
