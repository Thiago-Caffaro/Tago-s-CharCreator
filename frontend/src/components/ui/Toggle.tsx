import React from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, size = 'md' }: ToggleProps) {
  const track = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5'
  const thumb = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5'

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        className={`relative ${track} rounded-full transition-colors ${checked ? 'bg-[#9b59b6]' : 'bg-[#333]'}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 left-0.5 ${thumb} rounded-full bg-white shadow transition-transform ${checked ? translate : 'translate-x-0'}`}
        />
      </div>
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </label>
  )
}
