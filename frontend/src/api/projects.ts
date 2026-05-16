import client from './client'
import type { Project } from '../types'
import { triggerDownload } from '../utils/cardExporter'

export const projectsApi = {
  list: () => client.get<Project[]>('/projects').then(r => r.data),
  get: (id: number) => client.get<Project>(`/projects/${id}`).then(r => r.data),
  create: (data: { name: string; character_name: string; description?: string }) =>
    client.post<Project>('/projects', data).then(r => r.data),
  update: (id: number, data: Partial<Project>) =>
    client.put<Project>(`/projects/${id}`, data).then(r => r.data),
  delete: (id: number) => client.delete(`/projects/${id}`),

  exportProject: async (id: number, name: string) => {
    const data = await client.get(`/projects/${id}/export`).then(r => r.data)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    triggerDownload(blob, `project_${name || id}.json`)
  },

  importProject: (data: object) =>
    client.post<Project>('/projects/import', data).then(r => r.data),
}
