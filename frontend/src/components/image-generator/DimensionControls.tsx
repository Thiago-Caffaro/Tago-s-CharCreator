import React from 'react'
import { useImageStore, KIE_ASPECT_RATIOS } from '../../store/useImageStore'

const PIXEL_SIZES = [512, 768, 1024, 1152, 1280]

const ASPECT_RATIO_LABELS: Record<string, string> = {
  '1:1': '1:1 — Quadrado',
  '16:9': '16:9 — Paisagem',
  '9:16': '9:16 — Retrato',
  '4:3': '4:3 — Clássico',
  '3:4': '3:4 — Retrato clássico',
  '21:9': '21:9 — Cinemático',
}

export function DimensionControls() {
  const { provider, width, height, setWidth, setHeight, aspectRatio, setAspectRatio } =
    useImageStore()

  if (provider === 'kie_ai') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Proporção
        </label>
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#9b59b6]"
        >
          {KIE_ASPECT_RATIOS.map((r) => (
            <option key={r} value={r}>
              {ASPECT_RATIO_LABELS[r] ?? r}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-1.5 flex-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Largura</label>
        <select
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#9b59b6]"
        >
          {PIXEL_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end pb-2 text-gray-500 text-sm">×</div>
      <div className="flex flex-col gap-1.5 flex-1">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Altura</label>
        <select
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#9b59b6]"
        >
          {PIXEL_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
