import client from './client'
import type { Project } from '../types'

export const projectsApi = {
  list: () => client.get<Project[]>('/projects').then(r => r.data),
  get: (id: number) => client.get<Project>(`/projects/${id}`).then(r => r.data),
  create: (data: { name: string; character_name: string; description?: string }) =>
    client.post<Project>('/projects', data).then(r => r.data),
  update: (id: number, data: Partial<Project>) =>
    client.put<Project>(`/projects/${id}`, data).then(r => r.data),
  delete: (id: number) => client.delete(`/projects/${id}`),
}
