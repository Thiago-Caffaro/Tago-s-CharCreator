import client from './client'
import type { LorebookEntry } from '../types'

export const lorebookApi = {
  list: (projectId: number) =>
    client.get<LorebookEntry[]>(`/projects/${projectId}/lorebook`).then(r => r.data),
  create: (projectId: number, data: Omit<LorebookEntry, 'id' | 'project_id'>) =>
    client.post<LorebookEntry>(`/projects/${projectId}/lorebook`, data).then(r => r.data),
  update: (entryId: number, data: Partial<LorebookEntry>) =>
    client.put<LorebookEntry>(`/lorebook/${entryId}`, data).then(r => r.data),
  delete: (entryId: number) => client.delete(`/lorebook/${entryId}`),
  exportUrl: (projectId: number) => `/api/projects/${projectId}/lorebook/export`,
}
