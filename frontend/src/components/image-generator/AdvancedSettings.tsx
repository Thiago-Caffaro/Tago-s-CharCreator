import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Shuffle } from 'lucide-react'
import { useImageStore } from '../../store/useImageStore'

export function AdvancedSettings() {
  const [open, setOpen] = useState(false)
  const {
    provider,
    guidanceScale,
    setGuidanceScale,
    steps,
    setSteps,
    seed,
    setSeed,
    safetyTolerance,
    setSafetyTolerance,
  } = useImageStore()

  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-[#1e1e1e] transition-colors"
      >
        <span>Configurações avançadas</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 bg-[#161616]">
          {provider === 'openrouter' ? (
            <>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-gray-500">Guidance Scale</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={0.5}
                    placeholder="padrão"
                    value={guidanceScale ?? ''}
                    onChange={(e) =>
                      setGuidanceScale(e.target.value ? Number(e.target.value) : null)
                    }
                    className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#9b59b6]"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-gray-500">Steps</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    placeholder="padrão"
                    value={steps ?? ''}
                    onChange={(e) => setSteps(e.target.value ? Number(e.target.value) : null)}
                    className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#9b59b6]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Seed</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="aleatório"
                    value={seed ?? ''}
                    onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-[#9b59b6]"
                  />
                  <button
                    onClick={() => setSeed(null)}
                    title="Aleatório"
                    className="p-1.5 rounded border border-[#333] text-gray-500 hover:text-gray-200 hover:border-[#555] transition-colors"
                  >
                    <Shuffle size={14} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">
                Safety Tolerance: <span className="text-gray-300">{safetyTolerance}</span>
              </label>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={safetyTolerance}
                onChange={(e) => setSafetyTolerance(Number(e.target.value))}
                className="w-full accent-[#9b59b6]"
              />
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>0 — mais seguro</span>
                <span>6 — NSFW permitido</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
