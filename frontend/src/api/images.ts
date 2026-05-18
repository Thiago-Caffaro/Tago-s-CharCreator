import client from './client'

export interface ImagePreset {
  id: number
  name: string
  category: string
  prompt_prefix: string
  prompt_suffix: string
  negative_prompt: string
  is_default: boolean
  order_index: number
  created_at: string
}

export interface GeneratedImage {
  id: number
  project_id: number
  filename: string
  prompt: string
  negative_prompt: string
  model: string
  provider: string
  width: number
  height: number
  seed: number | null
  preset_id: number | null
  is_avatar: boolean
  created_at: string
}

export interface GenerateImageRequest {
  prompt: string
  provider: 'openrouter' | 'kie_ai'
  model: string
  preset_id?: number | null
  // OpenRouter
  width?: number
  height?: number
  negative_prompt?: string
  guidance_scale?: number | null
  steps?: number | null
  seed?: number | null
  image_ref_b64?: string | null
  // Kie.ai
  aspect_ratio?: string
  safety_tolerance?: number
  input_image_url?: string | null
}

export const imagePresetsApi = {
  list: (category?: string) =>
    client
      .get<ImagePreset[]>('/image-presets', { params: category ? { category } : {} })
      .then((r) => r.data),

  create: (data: Omit<ImagePreset, 'id' | 'created_at'>) =>
    client.post<ImagePreset>('/image-presets', data).then((r) => r.data),

  update: (id: number, data: Partial<Omit<ImagePreset, 'id' | 'created_at'>>) =>
    client.put<ImagePreset>(`/image-presets/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/image-presets/${id}`),
}

export const projectImagesApi = {
  list: (projectId: number) =>
    client.get<GeneratedImage[]>(`/projects/${projectId}/images`).then((r) => r.data),

  generate: (projectId: number, req: GenerateImageRequest) =>
    client
      .post<GeneratedImage>(
        `/projects/${projectId}/images/generate`,
        req,
        // Kie.ai jobs can take 3-5 min to poll to completion; OpenRouter is ~10-30s
        { timeout: 360_000 },
      )
      .then((r) => r.data),

  fileUrl: (imageId: number) => `/api/images/file/${imageId}`,

  delete: (imageId: number) => client.delete(`/images/${imageId}`),

  setAvatar: (imageId: number) => client.put(`/images/${imageId}/set-avatar`),
}

export const kieApi = {
  getBalance: () =>
    client.get<{ balance: number }>('/images/kie-balance').then((r) => r.data.balance),
}
