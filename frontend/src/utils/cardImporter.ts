import type { CharaCardV2 } from '../types'

export interface ParsedCardImport {
  card: CharaCardV2
  avatarDataUrl: string | null
}

/** Reads a SillyTavern/Chub-style character card from a .json file or a .png with an embedded "chara" chunk. */
export async function parseCardFile(file: File): Promise<ParsedCardImport> {
  const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')

  if (isJson) {
    const raw = JSON.parse(await file.text())
    return { card: normalizeCard(raw), avatarDataUrl: null }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const raw = extractCharaChunk(bytes)
  if (!raw) {
    throw new Error('PNG não contém dados de character card (chunk "chara" não encontrado)')
  }
  const avatarDataUrl = await blobToDataUrl(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' }))
  return { card: normalizeCard(raw), avatarDataUrl }
}

/** Normalizes a v1 (flat) or v2 (spec/data) card into the v2 shape this app uses internally. */
function normalizeCard(raw: any): CharaCardV2 {
  const data = raw?.spec === 'chara_card_v2' && raw.data ? raw.data : (raw?.data ?? raw)
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: data.name ?? '',
      description: data.description ?? '',
      personality: data.personality ?? '',
      first_mes: data.first_mes ?? '',
      mes_example: data.mes_example ?? '',
      scenario: data.scenario ?? '',
      creator_notes: data.creator_notes ?? '',
      system_prompt: data.system_prompt ?? '',
      post_history_instructions: data.post_history_instructions ?? '',
      alternate_greetings: Array.isArray(data.alternate_greetings) ? data.alternate_greetings : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      talkativeness: data.talkativeness ?? '0.5',
      creator: data.creator ?? '',
      character_version: data.character_version ?? '',
      avatar: data.avatar ?? 'none',
      extensions: data.extensions ?? { depth_prompt: { role: 'system', depth: 4, prompt: '' } },
      character_book: data.character_book,
    },
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Falha ao ler a imagem'))
    reader.readAsDataURL(blob)
  })
}

/** Scans PNG chunks for a tEXt or iTXt chunk keyed "chara" and returns the parsed JSON payload. */
function extractCharaChunk(png: Uint8Array): unknown | null {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const dec = new TextDecoder('latin1')
  let offset = 8 // past the 8-byte PNG signature

  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset, false)
    const type = dec.decode(png.slice(offset + 4, offset + 8))
    const dataStart = offset + 8
    const chunkData = png.slice(dataStart, dataStart + length)

    if (type === 'tEXt' || type === 'iTXt') {
      const nul = chunkData.indexOf(0)
      const keyword = dec.decode(chunkData.slice(0, nul))
      if (keyword === 'chara') {
        const text = type === 'tEXt'
          ? dec.decode(chunkData.slice(nul + 1))
          : decodeItxtText(chunkData, nul)
        const parsed = tryParseCharaText(text)
        if (parsed) return parsed
      }
    }

    if (type === 'IEND') break
    offset = dataStart + length + 4 // skip data + CRC
  }
  return null
}

/** iTXt layout: keyword\0 compression_flag compression_method lang_tag\0 translated_keyword\0 text (UTF-8) */
function decodeItxtText(chunkData: Uint8Array, keywordNul: number): string {
  let p = keywordNul + 3 // skip NUL + compression flag + compression method
  const langNul = chunkData.indexOf(0, p)
  p = langNul + 1
  const transNul = chunkData.indexOf(0, p)
  return new TextDecoder('utf-8').decode(chunkData.slice(transNul + 1))
}

/** The "chara" payload is conventionally base64-encoded JSON, but tolerate raw JSON too. */
function tryParseCharaText(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    // fall through to base64 decode
  }
  try {
    const decoded = decodeURIComponent(escape(atob(text)))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}
