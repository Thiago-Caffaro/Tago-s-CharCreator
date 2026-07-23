import React from 'react'

// Matches this app's actual output convention (enforced by the generation
// prompts in backend/services/prompt_assembler.py): **bold** wraps all
// action/narration, dialogue is plain text opened with an em-dash, and
// description uses <== Section Name ==> headers. No general markdown lib is
// used on purpose — a real parser would also accept things the prompts
// explicitly forbid (single-asterisk *italics*), silently hiding a model
// formatting mistake instead of leaving it visibly wrong in the preview.
const SECTION_HEADER_RE = /^<==\s*(.+?)\s*==>$/
const BOLD_RE = /\*\*(.+?)\*\*/g

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0
  BOLD_RE.lastIndex = 0
  while ((match = BOLD_RE.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    // Action/narration: dimmer + bold, so plain dialogue reads as the "main" text
    parts.push(
      <strong key={`${keyPrefix}-${i++}`} className="font-semibold text-gray-500">
        {match[1]}
      </strong>,
    )
    lastIndex = BOLD_RE.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

export function FormattedText({ text }: { text: string }) {
  if (!text) return <>—</>
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, idx) => {
        const headerMatch = line.trim().match(SECTION_HEADER_RE)
        if (headerMatch) {
          return (
            <div
              key={idx}
              className="mt-3 mb-1.5 first:mt-0 text-[11px] font-bold text-[#9b59b6]
                uppercase tracking-wider border-b border-[#9b59b6]/20 pb-1"
            >
              {headerMatch[1]}
            </div>
          )
        }
        if (line.trim() === '') return <div key={idx} className="h-2" />
        return (
          <p key={idx} className="leading-relaxed">
            {renderInline(line, `l${idx}`)}
          </p>
        )
      })}
    </>
  )
}
