import React from 'react'
import { ShieldOff } from 'lucide-react'
import { useImageStore, OPENROUTER_FLUX_MODELS, KIE_MODELS } from '../../store/useImageStore'

const ULTRA_MODELS = new Set([
  'black-forest-labs/flux.2-pro-ultra',
  'black-forest-labs/flux-1.1-pro-ultra',
])

export function ModelSelect() {
  const { provider, selectedModel, setModel } = useImageStore()
  const models = provider === 'kie_ai' ? KIE_MODELS : OPENROUTER_FLUX_MODELS

  // Reset to first model of new provider if current model doesn't exist in new list
  React.useEffect(() => {
    const ids = models.map((m) => m.id)
    if (!ids.includes(selectedModel)) {
      setModel(ids[0])
    }
  }, [provider]) // eslint-disable-line react-hooks/exhaustive-deps

  // Is the currently selected Kie.ai model SFW-only?
  const selectedKieModel = provider === 'kie_ai'
    ? KIE_MODELS.find((m) => m.id === selectedModel)
    : null
  const isSfwOnly = selectedKieModel?.sfwOnly ?? false

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Modelo</label>
      <select
        value={selectedModel}
        onChange={(e) => setModel(e.target.value)}
        className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#9b59b6]"
      >
        {models.map((m) => {
          const sfwOnly = 'sfwOnly' in m ? m.sfwOnly : false
          const isUltra = ULTRA_MODELS.has(m.id)
          const suffix = sfwOnly ? ' 🔒' : isUltra ? ' ★' : ''
          return (
            <option key={m.id} value={m.id}>
              {m.label}{suffix}
            </option>
          )
        })}
      </select>

      {/* SFW-only warning */}
      {isSfwOnly && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-2.5 py-1.5">
          <ShieldOff size={12} className="mt-0.5 shrink-0" />
          <span>
            Este modelo filtra conteúdo adulto no lado do servidor (Kie.ai).
            Use <strong>FLUX Kontext Pro/Max</strong> para conteúdo NSFW.
          </span>
        </div>
      )}

      {/* Ultra model hint */}
      {provider === 'openrouter' && ULTRA_MODELS.has(selectedModel) && (
        <span className="text-[11px] text-[#9b59b6]">★ Suporta imagem de referência</span>
      )}

      {/* Kie.ai NSFW-capable hint */}
      {provider === 'kie_ai' && !isSfwOnly && (
        <span className="text-[11px] text-green-400">✓ Suporta conteúdo NSFW (safetyTolerance 6)</span>
      )}

      {/* Kie.ai reference URL hint */}
      {provider === 'kie_ai' && (
        <span className="text-[11px] text-[#9b59b6]">Suporta URL de imagem de referência</span>
      )}
    </div>
  )
}
