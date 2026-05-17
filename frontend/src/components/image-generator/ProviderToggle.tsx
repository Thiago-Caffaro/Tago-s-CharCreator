import React, { useEffect } from 'react'
import { useImageStore } from '../../store/useImageStore'

export function ProviderToggle() {
  const { provider, setProvider, kieBalance, fetchKieBalance } = useImageStore()

  useEffect(() => {
    if (provider === 'kie_ai') {
      fetchKieBalance()
    }
  }, [provider, fetchKieBalance])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Provedor</span>
      <div className="flex rounded-lg overflow-hidden border border-[#333] text-sm">
        <button
          onClick={() => setProvider('openrouter')}
          className={`flex-1 py-2 px-3 transition-colors ${
            provider === 'openrouter'
              ? 'bg-[#9b59b6] text-white font-medium'
              : 'bg-[#1e1e1e] text-gray-400 hover:text-gray-200'
          }`}
        >
          OpenRouter
        </button>
        <button
          onClick={() => setProvider('kie_ai')}
          className={`flex-1 py-2 px-3 transition-colors ${
            provider === 'kie_ai'
              ? 'bg-[#9b59b6] text-white font-medium'
              : 'bg-[#1e1e1e] text-gray-400 hover:text-gray-200'
          }`}
        >
          Kie.ai
        </button>
      </div>
      {provider === 'kie_ai' && kieBalance !== null && (
        <span className="text-xs text-gray-500">
          Créditos: <span className="text-gray-300">{kieBalance}</span>
        </span>
      )}
    </div>
  )
}
