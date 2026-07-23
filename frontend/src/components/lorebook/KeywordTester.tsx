import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Textarea'
import type { LorebookEntry } from '../../types'
import { safeParseArray } from '../../utils/cardExporter'

interface Props {
  open: boolean
  onClose: () => void
  entries: LorebookEntry[]
}

interface MatchResult {
  entry: LorebookEntry
  activated: boolean
  matchedPrimary: string[]
  matchedSecondary: string[]
}

// Mirrors SillyTavern's "AND ANY" selective logic (the only mode this app
// stores) — constant entries always fire, selective entries need a hit on
// both key lists, everything else just needs one primary key match.
function testEntry(entry: LorebookEntry, lowerText: string): MatchResult {
  const matchedPrimary = safeParseArray(entry.keys)
    .filter(k => k.trim() && lowerText.includes(k.trim().toLowerCase()))
  const matchedSecondary = safeParseArray(entry.secondary_keys)
    .filter(k => k.trim() && lowerText.includes(k.trim().toLowerCase()))

  const keywordMatch = entry.constant
    ? true
    : entry.selective
      ? matchedPrimary.length > 0 && matchedSecondary.length > 0
      : matchedPrimary.length > 0

  return { entry, activated: entry.enabled && keywordMatch, matchedPrimary, matchedSecondary }
}

export function KeywordTester({ open, onClose, entries }: Props) {
  const [text, setText] = useState('')

  const lowerText = text.toLowerCase()
  const results = entries.map(e => testEntry(e, lowerText))
  const activated = results.filter(r => r.activated)
  const inactive = results.filter(r => !r.activated)

  return (
    <Modal open={open} onClose={onClose} title="Testador de Keywords" size="lg">
      <div className="space-y-4">
        <Textarea
          label="Texto de exemplo"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          placeholder="Cole aqui um trecho de conversa para simular quais entries seriam ativadas..."
        />

        {entries.length === 0 ? (
          <p className="text-xs text-gray-600">Nenhuma entry no lorebook ainda.</p>
        ) : !text.trim() ? (
          <p className="text-xs text-gray-600">Digite ou cole um texto acima para ver quais entries ativariam.</p>
        ) : (
          <div className="space-y-4 max-h-[360px] overflow-auto">
            <div>
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
                Ativariam ({activated.length})
              </p>
              {activated.length === 0 ? (
                <p className="text-xs text-gray-600">Nenhuma entry ativaria com esse texto</p>
              ) : (
                <div className="space-y-1.5">
                  {activated.map(r => <EntryResultRow key={r.entry.id} result={r} />)}
                </div>
              )}
            </div>

            {inactive.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Não ativariam ({inactive.length})
                </p>
                <div className="space-y-1.5">
                  {inactive.map(r => <EntryResultRow key={r.entry.id} result={r} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function EntryResultRow({ result }: { result: MatchResult }) {
  const { entry, activated, matchedPrimary, matchedSecondary } = result
  return (
    <div className={`flex flex-col gap-1 px-3 py-2 rounded-lg border ${
      activated ? 'border-green-900/40 bg-green-900/10' : 'border-[#2a2a2a] bg-[#1a1a1a] opacity-60'
    }`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-gray-200">{entry.name || '—'}</span>
        {entry.constant && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-400">constante</span>
        )}
        {!entry.enabled && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">desativada</span>
        )}
        {entry.probability < 100 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-500">
            {entry.probability}% chance
          </span>
        )}
      </div>
      {(matchedPrimary.length > 0 || matchedSecondary.length > 0) && (
        <p className="text-[10px] text-gray-500">
          {matchedPrimary.length > 0 && (
            <>keyword: <span className="text-[#9b59b6]">{matchedPrimary.join(', ')}</span></>
          )}
          {matchedSecondary.length > 0 && (
            <> {matchedPrimary.length > 0 && '· '}secundária: <span className="text-[#9b59b6]">{matchedSecondary.join(', ')}</span></>
          )}
        </p>
      )}
      {entry.selective && matchedPrimary.length > 0 && matchedSecondary.length === 0 && (
        <p className="text-[10px] text-orange-500">Seletiva — falta match de keyword secundária</p>
      )}
    </div>
  )
}
