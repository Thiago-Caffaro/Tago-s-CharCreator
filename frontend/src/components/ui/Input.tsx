import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
      <input
        {...props}
        className={`bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-sm text-gray-100
          placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9b59b6]/50 focus:border-[#9b59b6]
          transition-colors ${error ? 'border-red-500' : ''} ${className}`}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
