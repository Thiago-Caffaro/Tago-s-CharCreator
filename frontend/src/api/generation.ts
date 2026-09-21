import client from './client'
import type { GenerationJob } from '../types'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function waitForJob(job: GenerationJob, onChunk?: (chunk: string) => void): Promise<string> {
  let current = job
  while (current.status === 'queued' || current.status === 'running') {
    await sleep(900)
    current = await generationApi.getJob(current.id)
  }
  if (current.status !== 'completed') throw new Error(current.error || (current.status === 'cancelled' ? 'Geração cancelada' : 'Erro na geração'))
  const result = current.result_json || ''
  onChunk?.(result)
  return result
}

export const generationApi = {
  createJob: (kind: string, projectId?: number, payload: object = {}) => client.post<GenerationJob>('/generation-jobs', { kind, project_id: projectId, payload }).then(r => r.data),
  getJob: (id: number) => client.get<GenerationJob>(`/generation-jobs/${id}`).then(r => r.data),
  listJobs: (projectId?: number, active = false) => client.get<GenerationJob[]>('/generation-jobs', { params: { project_id: projectId, active } }).then(r => r.data),
  cancelJob: (id: number) => client.post<GenerationJob>(`/generation-jobs/${id}/cancel`).then(r => r.data),
  fullCard: async (projectId: number, presetIds: number[], onChunk?: (chunk: string) => void) => waitForJob(await generationApi.createJob('full_card', projectId, { preset_ids: presetIds }), onChunk),
  field: async (projectId: number, fieldName: string, presetId?: number, onChunk?: (chunk: string) => void) => waitForJob(await generationApi.createJob('field', projectId, { field_name: fieldName, preset_id: presetId }), onChunk),
  refine: async (projectId: number, fieldName: string, currentContent: string, instruction: string, onChunk?: (chunk: string) => void) => waitForJob(await generationApi.createJob('refine', projectId, { field_name: fieldName, current_content: currentContent, instruction }), onChunk),
  lorebook: async (projectId: number, description: string, onChunk?: (chunk: string) => void) => waitForJob(await generationApi.createJob('lorebook', projectId, { description }), onChunk),
  fixCheck: async (cardJson: string, checkId: string, onChunk?: (chunk: string) => void) => waitForJob(await generationApi.createJob('fix_check', undefined, { card_json: cardJson, check_id: checkId }), onChunk),
  fixCard: async (brokenJson: string, errors: string[], onChunk?: (chunk: string) => void) => waitForJob(await generationApi.createJob('fix_card', undefined, { broken_json: brokenJson, errors }), onChunk),
  tokenEstimate: (projectId: number, presetIds: number[] = []) => client.post<{ input_tokens: number }>('/generation-jobs/estimate', { project_id: projectId, preset_ids: presetIds }).then(r => r.data.input_tokens || 0),
}
