import type { CharaCardV2 } from '../types'

export function exportCard(card: CharaCardV2, characterName: string) {
  const json = JSON.stringify(card, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${characterName || 'character'}_card.json`
  a.click()
  URL.revokeObjectURL(url)
}
