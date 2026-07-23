import type { CharaCardV2, LorebookEntry, LorebookV2 } from '../types'

// ─── Lorebook embedding ────────────────────────────────────────────────────────

/**
 * Converts the app's flat LorebookEntry rows (keys/secondary_keys stored as
 * JSON-string columns) into the spec's embedded character_book shape. Mirrors
 * the field defaults used by the standalone /lorebook/export endpoint so a
 * card exported here and a lorebook exported separately stay consistent.
 */
function buildCharacterBook(entries: LorebookEntry[], characterName: string): LorebookV2 {
  return {
    name: `${characterName} — Lorebook`,
    description: '',
    scan_depth: 4,
    token_budget: 2048,
    recursive_scanning: false,
    extensions: {},
    entries: entries.map(e => ({
      id: e.id,
      name: e.name,
      keys: safeParseArray(e.keys),
      secondary_keys: safeParseArray(e.secondary_keys),
      content: e.content,
      enabled: e.enabled,
      insertion_order: e.insertion_order,
      position: e.position,
      constant: e.constant,
      selective: e.selective,
      probability: e.probability,
      comment: e.comment,
      extensions: {
        depth: e.depth,
        weight: 100,
        addMemo: true,
        useProbability: true,
        excludeRecursion: false,
      },
      selectiveLogic: 0,
    })),
  }
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Returns a copy of card with character_book attached, or card as-is if there's nothing to embed. */
function withLorebook(card: CharaCardV2, lorebookEntries: LorebookEntry[] | undefined): CharaCardV2 {
  if (!lorebookEntries || lorebookEntries.length === 0) return card
  return {
    ...card,
    data: { ...card.data, character_book: buildCharacterBook(lorebookEntries, card.data.name) },
  }
}

// ─── JSON export ─────────────────────────────────────────────────────────────

export function exportCard(card: CharaCardV2, characterName: string, lorebookEntries?: LorebookEntry[]) {
  const json = JSON.stringify(withLorebook(card, lorebookEntries), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  triggerDownload(blob, `${characterName || 'character'}_card.json`)
}

// ─── PNG export (SillyTavern chara_card_v2 embedded in tEXt chunk) ────────────

/**
 * Exports the card as a PNG with the character JSON embedded in a tEXt chunk
 * (keyword "chara", value base64-encoded JSON). SillyTavern can import these
 * directly as character cards.
 *
 * The image always goes through a canvas step so the output is guaranteed to be
 * a valid PNG regardless of whether the user uploaded a JPEG, WebP, etc.
 */
export async function exportCardAsPng(
  card: CharaCardV2,
  avatarDataUrl: string | null,
  characterName: string,
  lorebookEntries?: LorebookEntry[],
) {
  const jsonStr = JSON.stringify(withLorebook(card, lorebookEntries))
  // base64-encode the JSON (btoa chokes on non-latin chars → encode first)
  const b64Json = btoa(unescape(encodeURIComponent(jsonStr)))

  // Always render through canvas → guaranteed valid PNG output
  const pngBytes = await renderToPng(avatarDataUrl, characterName)
  const finalBytes = embedTextChunk(pngBytes, 'chara', b64Json)
  const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: 'image/png' })
  triggerDownload(blob, `${characterName || 'character'}_card.png`)
}

// ─── Canvas rendering ────────────────────────────────────────────────────────

/**
 * Draws any image dataUrl (or a placeholder) to a 400×600 canvas and returns
 * the result as PNG bytes.  This guarantees the output is always a valid PNG
 * even when the source is a JPEG, WebP, or any other format.
 */
function renderToPng(dataUrl: string | null, name: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 600
    const ctx = canvas.getContext('2d')!

    const finish = () => {
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return }
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)))
      }, 'image/png')
    }

    if (dataUrl) {
      const img = new Image()
      img.onload = () => {
        // Cover-fill: scale & centre the image inside 400×600
        const scale = Math.max(400 / img.naturalWidth, 600 / img.naturalHeight)
        const w = img.naturalWidth * scale
        const h = img.naturalHeight * scale
        ctx.drawImage(img, (400 - w) / 2, (600 - h) / 2, w, h)
        finish()
      }
      img.onerror = () => {
        // Fallback to placeholder if image fails to load
        drawPlaceholder(ctx, name)
        finish()
      }
      img.src = dataUrl
    } else {
      drawPlaceholder(ctx, name)
      finish()
    }
  })
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, name: string) {
  const grad = ctx.createLinearGradient(0, 0, 0, 600)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 400, 600)
  const initials = (name || '?').slice(0, 2).toUpperCase()
  ctx.fillStyle = '#9b59b6'
  ctx.font = 'bold 120px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, 200, 300)
}

// ─── PNG chunk helpers ────────────────────────────────────────────────────────

/** Inserts a tEXt chunk right after the IHDR chunk. */
function embedTextChunk(png: Uint8Array, keyword: string, text: string): Uint8Array {
  // PNG: 8-byte sig + IHDR (4 len + 4 type + 13 data + 4 crc = 25 bytes)
  const insertAt = 8 + 4 + 4 + 13 + 4
  const chunk = buildTextChunk(keyword, text)
  const result = new Uint8Array(png.length + chunk.length)
  result.set(png.slice(0, insertAt))
  result.set(chunk, insertAt)
  result.set(png.slice(insertAt), insertAt + chunk.length)
  return result
}

function buildTextChunk(keyword: string, text: string): Uint8Array {
  const enc = new TextEncoder()
  const keyBytes = enc.encode(keyword)
  const textBytes = enc.encode(text)
  // chunk data = keyword + NUL + text
  const data = new Uint8Array(keyBytes.length + 1 + textBytes.length)
  data.set(keyBytes)
  data[keyBytes.length] = 0
  data.set(textBytes, keyBytes.length + 1)

  const typeBytes = new Uint8Array([0x74, 0x45, 0x58, 0x74]) // "tEXt"
  const crcBuf = new Uint8Array(4 + data.length)
  crcBuf.set(typeBytes)
  crcBuf.set(data, 4)
  const crc = crc32(crcBuf)

  const chunk = new Uint8Array(4 + 4 + data.length + 4)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length, false)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  view.setUint32(8 + data.length, crc, false)
  return chunk
}

// Minimal CRC-32 (standard PNG CRC)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

// ─── Generic download ────────────────────────────────────────────────────────

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
