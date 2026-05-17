import React from 'react'
import { useImageStore, OPENROUTER_FLUX_MODELS, KIE_MODELS } from '../../store/useImageStore'

const ULTRA_MODELS = new Set([
  'black-forest-labs/flux-2-pro-ultra',
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

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Modelo</label>
      <select
        value={selectedModel}
        onChange={(e) => setModel(e.target.value)}
        className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#9b59b6]"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {ULTRA_MODELS.has(m.id) ? ' ★' : ''}
          </option>
        ))}
      </select>
      {provider === 'openrouter' && ULTRA_MODELS.has(selectedModel) && (
        <span className="text-[11px] text-[#9b59b6]">★ Suporta imagem de referência</span>
      )}
      {provider === 'kie_ai' && (
        <span className="text-[11px] text-[#9b59b6]">★ Suporta URL de referência</span>
      )}
    </div>
  )
}
