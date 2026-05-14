import type { CharaCardV2 } from '../types'

// ─── JSON export ─────────────────────────────────────────────────────────────

export function exportCard(card: CharaCardV2, characterName: string) {
  const json = JSON.stringify(card, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  triggerDownload(blob, `${characterName || 'character'}_card.json`)
}

// ─── PNG export (SillyTavern chara_card_v2 embedded in tEXt chunk) ────────────

/**
 * Exports the card as a PNG with the character JSON embedded in a tEXt chunk
 * (keyword "chara", value base64-encoded JSON). SillyTavern can import these
 * directly as character cards.
 *
 * If avatarDataUrl is provided it is used as the image; otherwise a 400×600
 * dark placeholder is generated on a canvas.
 */
export async function exportCardAsPng(
  card: CharaCardV2,
  avatarDataUrl: string | null,
  characterName: string,
) {
  const jsonStr = JSON.stringify(card)
  // base64-encode the JSON (btoa chokes on non-latin chars → encode first)
  const b64Json = btoa(unescape(encodeURIComponent(jsonStr)))

  const sourceBytes = avatarDataUrl
    ? await dataUrlToBytes(avatarDataUrl)
    : await generatePlaceholderPng(characterName)

  const finalBytes = embedTextChunk(sourceBytes, 'chara', b64Json)
  const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: 'image/png' })
  triggerDownload(blob, `${characterName || 'character'}_card.png`)
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

// ─── Utilities ────────────────────────────────────────────────────────────────

async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl)
  return new Uint8Array(await res.arrayBuffer())
}

/** Generates a 400×600 dark placeholder PNG with character initials. */
function generatePlaceholderPng(name: string): Promise<Uint8Array> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 600
    const ctx = canvas.getContext('2d')!
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 600)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#16213e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 400, 600)
    // Initials
    const initials = (name || '?').slice(0, 2).toUpperCase()
    ctx.fillStyle = '#9b59b6'
    ctx.font = 'bold 120px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials, 200, 300)
    canvas.toBlob(blob => {
      blob!.arrayBuffer().then(buf => resolve(new Uint8Array(buf)))
    }, 'image/png')
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
