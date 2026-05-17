import React from 'react'
import { useImageStore } from '../../store/useImageStore'
import type { ImagePreset } from '../../api/images'

const CATEGORY_LABELS: Record<string, string> = {
  anime: 'Anime',
  nsfw_anime: 'Anime — Explícito',
  furry: 'Furry',
  nsfw_furry: 'Furry — Explícito',
  fetish: 'Fetiche',
}

function groupByCategory(presets: ImagePreset[]) {
  const groups: Record<string, ImagePreset[]> = {}
  for (const p of presets) {
    if (!groups[p.category]) groups[p.category] = []
    groups[p.category].push(p)
  }
  return groups
}

export function PresetSelector() {
  const { presets, selectedPresetId, setPresetId, setNegativePrompt, negativePrompt, provider } =
    useImageStore()

  const groups = groupByCategory(presets)

  function handleSelect(preset: ImagePreset | null) {
    if (!preset) {
      setPresetId(null)
      return
    }
    setPresetId(preset.id)
    // Auto-fill negative prompt when empty and using OpenRouter
    if (provider === 'openrouter' && !negativePrompt.trim() && preset.negative_prompt) {
      setNegativePrompt(preset.negative_prompt)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preset de Estilo</span>

      {/* None option */}
      <label className="flex items-center gap-2.5 cursor-pointer group">
        <input
          type="radio"
          name="image-preset"
          checked={selectedPresetId === null}
          onChange={() => handleSelect(null)}
          className="accent-[#9b59b6]"
        />
        <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
          Nenhum
        </span>
      </label>

      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 mt-2">
            {CATEGORY_LABELS[category] ?? category}
          </div>
          {items.map((preset) => (
            <label key={preset.id} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
              <input
                type="radio"
                name="image-preset"
                checked={selectedPresetId === preset.id}
                onChange={() => handleSelect(preset)}
                className="accent-[#9b59b6]"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                {preset.name}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}
