import client from './client'
import type { FieldPreset } from '../types'

export const presetsApi = {
  list: (field?: string) =>
    client.get<FieldPreset[]>('/presets', { params: field ? { field } : {} }).then(r => r.data),
  create: (data: Omit<FieldPreset, 'id' | 'created_at'>) =>
    client.post<FieldPreset>('/presets', data).then(r => r.data),
  update: (id: number, data: Partial<FieldPreset>) =>
    client.put<FieldPreset>(`/presets/${id}`, data).then(r => r.data),
  delete: (id: number) => client.delete(`/presets/${id}`),
}
