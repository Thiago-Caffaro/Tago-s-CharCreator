import client from './client'
import type { FieldPreset } from '../types'
import { triggerDownload } from '../utils/cardExporter'

export const presetsApi = {
  list: (field?: string) =>
    client.get<FieldPreset[]>('/presets', { params: field ? { field } : {} }).then(r => r.data),
  create: (data: Omit<FieldPreset, 'id' | 'created_at'>) =>
    client.post<FieldPreset>('/presets', data).then(r => r.data),
  update: (id: number, data: Partial<FieldPreset>) =>
    client.put<FieldPreset>(`/presets/${id}`, data).then(r => r.data),
  delete: (id: number) => client.delete(`/presets/${id}`),

  exportPresets: async () => {
    const data = await client.get('/presets/export').then(r => r.data)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    triggerDownload(blob, 'presets_export.json')
  },

  importPresets: (data: object) =>
    client.post<{ imported: number }>('/presets/import', data).then(r => r.data),
}
