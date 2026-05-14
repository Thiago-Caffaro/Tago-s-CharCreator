import React, { useRef, useEffect } from 'react'
import { useGenerationStore } from '../../store/useGenerationStore'

export function StreamingOutput() {
  const { streamingText, streaming } = useGenerationStore()
  const ref = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [streamingText])

  if (!streamingText && !streaming) return null

  return (
    <div className="mt-3 border border-[#2a2a2a] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Output</span>
        {streaming && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#9b59b6] animate-pulse" />
        )}
      </div>
      <pre
        ref={ref}
        className="text-xs text-gray-300 font-mono p-3 max-h-[200px] overflow-auto leading-relaxed whitespace-pre-wrap"
      >
        {streamingText}
        {streaming && <span className="animate-pulse text-[#9b59b6]">█</span>}
      </pre>
    </div>
  )
}
