import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (v: string[]) => void
  label?: string
  placeholder?: string
}

export function KeywordInput({ value, onChange, label, placeholder = 'Adicionar keyword...' }: Props) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
  }

  const remove = (kw: string) => onChange(value.filter(v => v !== kw))

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
      <div className="flex flex-wrap gap-1 min-h-[36px] bg-[#1a1a1a] border border-[#333] rounded-md p-2">
        {value.map(kw => (
          <span
            key={kw}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#9b59b6]/20 text-[#9b59b6] border border-[#9b59b6]/30"
          >
            {kw}
            <button onClick={() => remove(kw)} className="hover:text-white transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 min-w-[120px] bg-transparent text-xs text-gray-200 placeholder-gray-700 outline-none"
        />
      </div>
    </div>
  )
}
