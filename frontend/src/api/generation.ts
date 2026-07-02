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

// Emitted by the backend in place of raising mid-stream (the HTTP response
// is already open by the time an LLM call fails, so a clean 4xx isn't
// possible — see backend/routers/generation.py's _stream_with_errors).
const STREAM_ERROR_MARKER = '\n__STREAM_ERROR__:'

async function readStream(response: Response, onChunk?: (chunk: string) => void): Promise<string> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let detail = text
    try { detail = JSON.parse(text)?.detail || text } catch { /* not JSON */ }
    throw new Error(detail || `HTTP ${response.status}`)
  }

  const reader = response.body!.getReader()
  // { stream: true } keeps partial multi-byte UTF-8 sequences (e.g. accented
  // characters split across chunk boundaries) buffered instead of corrupting
  // them into U+FFFD replacement chars.
  const decoder = new TextDecoder()
  const keepTail = STREAM_ERROR_MARKER.length - 1

  let result = ''
  let pending = ''

  const emit = (text: string) => {
    if (!text) return
    result += text
    onChunk?.(text)
  }

  // Buffers a lookback tail so the error marker is never split across an
  // emit boundary, mirroring the backend's <think> tag streaming filter.
  const push = (text: string) => {
    pending += text
    const idx = pending.indexOf(STREAM_ERROR_MARKER)
    if (idx !== -1) {
      emit(pending.slice(0, idx))
      const message = pending.slice(idx + STREAM_ERROR_MARKER.length).trim()
      pending = ''
      throw new Error(message || 'Erro ao gerar conteúdo — verifique o modelo/chave configurados')
    }
    if (pending.length > keepTail) {
      emit(pending.slice(0, pending.length - keepTail))
      pending = pending.slice(pending.length - keepTail)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (value) push(decoder.decode(value, { stream: true }))
    if (done) break
  }
  push(decoder.decode())
  emit(pending)

  return result
}
