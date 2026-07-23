import React from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-300
          placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9b59b6]/50 focus:border-[#9b59b6]
          transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
