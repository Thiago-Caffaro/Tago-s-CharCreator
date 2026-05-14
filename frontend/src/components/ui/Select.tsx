import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string | number; label: string }[]
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
      <select
        {...props}
        className={`bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-sm text-gray-100
          focus:outline-none focus:ring-2 focus:ring-[#9b59b6]/50 focus:border-[#9b59b6] transition-colors ${className}`}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
