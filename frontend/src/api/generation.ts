export const generationApi = {
  fullCard: async (
    projectId: number,
    presetIds: number[],
    onChunk?: (chunk: string) => void,
  ): Promise<string> => {
    const response = await fetch('/api/generate/full-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, preset_ids: presetIds }),
    })
    return readStream(response, onChunk)
  },

  field: async (
    projectId: number,
    fieldName: string,
    presetId?: number,
    onChunk?: (chunk: string) => void,
  ): Promise<string> => {
    const response = await fetch('/api/generate/field', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, field_name: fieldName, preset_id: presetId }),
    })
    return readStream(response, onChunk)
  },

  refine: async (
    projectId: number,
    fieldName: string,
    currentContent: string,
    instruction: string,
    onChunk?: (chunk: string) => void,
  ): Promise<string> => {
    const response = await fetch('/api/generate/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        field_name: fieldName,
        current_content: currentContent,
        instruction,
      }),
    })
    return readStream(response, onChunk)
  },

  lorebook: async (
    projectId: number,
    description: string,
    onChunk?: (chunk: string) => void,
  ): Promise<string> => {
    const response = await fetch('/api/generate/lorebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, description }),
    })
    return readStream(response, onChunk)
  },

  fixCheck: async (
    cardJson: string,
    checkId: string,
    onChunk?: (chunk: string) => void,
  ): Promise<string> => {
    const response = await fetch('/api/generate/fix-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_json: cardJson, check_id: checkId }),
    })
    return readStream(response, onChunk)
  },

  fixCard: async (
    brokenJson: string,
    errors: string[],
    onChunk?: (chunk: string) => void,
  ): Promise<string> => {
    const response = await fetch('/api/generate/fix-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broken_json: brokenJson, errors }),
    })
    return readStream(response, onChunk)
  },

  tokenEstimate: async (projectId: number, presetIds: number[] = []): Promise<number> => {
    const response = await fetch('/api/generate/token-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, preset_ids: presetIds }),
    })
    const data = await response.json()
    return data.input_tokens ?? 0
  },
}

async function readStream(response: Response, onChunk?: (chunk: string) => void): Promise<string> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    result += chunk
    onChunk?.(chunk)
  }
  return result
}
