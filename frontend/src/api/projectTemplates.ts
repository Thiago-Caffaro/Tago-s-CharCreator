import client from './client'
import type { ProjectTemplate } from '../types'

export const projectTemplatesApi = {
  list: () => client.get<ProjectTemplate[]>('/templates').then(r => r.data),
  create: (name: string, projectId: number) =>
    client.post<ProjectTemplate>('/templates', { name, project_id: projectId }).then(r => r.data),
  delete: (id: number) => client.delete(`/templates/${id}`),
  apply: (templateId: number, projectId: number) =>
    client.post<number[]>(`/templates/${templateId}/apply/${projectId}`).then(r => r.data),
}
