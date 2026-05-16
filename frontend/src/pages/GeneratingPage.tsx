import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, Circle, ChevronDown, ChevronUp, Wand2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { generationApi } from '../api/generation'
import { useGenerationStore } from '../store/useGenerationStore'
import { useProjectStore } from '../store/useProjectStore'
import { validate_card_client } from '../utils/validators'

// The same ordered list as the backend's _CHUNKED_FIELDS
const CHUNKED_FIELDS = [
  'description',
  'personality',
  'scenario',
  'first_mes',
  'mes_example',
  'system_prompt',
  'post_history_instructions',
  'alternate_greetings',
]

const FIELD_LABELS: Record<string, string> = {
  description:               'Aparência & Personalidade',
  personality:               'Personalidade (resumo)',
  scenario:                  'Cenário',
  first_mes:                 'Primeira Mensagem',
  mes_example:               'Exemplos de Mensagem',
  system_prompt:             'System Prompt',
  post_history_instructions: 'Post-History',
  alternate_greetings:       'Saudações Alternativas',
}

type FieldStatus = 'pending' | 'generating' | 'done' | 'error'

export default function GeneratingPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentProject, updateProject } = useProjectStore()

  const {
    selectedPresetIds,
    setGeneratedCard,
    setStreaming,
    fieldStatuses,
    fieldContents,
    liveFieldText,
    generationComplete,
    setFieldStatus,
    setFieldContent,
    appendLiveFieldText,
    clearLiveFieldText,
    resetFieldProgress,
    setGenerationComplete,
  } = useGenerationStore()

  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const liveScrollRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)

  // Auto-scroll the live block while streaming
  useEffect(() => {
    if (liveScrollRef.current) {
      liveScrollRef.current.scrollTop = liveScrollRef.current.scrollHeight
    }
  }, [liveFieldText])

  // Kick off generation once on mount
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const pid = Number(projectId)
    let pendingLine = ''
    let afterDone = false
    let currentFieldName = ''
    let currentFieldContent = ''

    setStreaming(true)

    const run = async () => {
      try {
        const result = await generationApi.fullCard(
          pid,
          selectedPresetIds,
          (chunk: string) => {
            const combined = pendingLine + chunk
            const lines = combined.split('\n')
            pendingLine = lines.pop() ?? ''

            for (const line of lines) {
              if (line.startsWith('__FIELD__:')) {
                // Finalise the previous field before starting the next
                if (currentFieldName) {
                  setFieldContent(currentFieldName, currentFieldContent.trim())
                  setFieldStatus(currentFieldName, 'done')
                  clearLiveFieldText()
                }
                currentFieldName = line.slice('__FIELD__:'.length)
                currentFieldContent = ''
                setFieldStatus(currentFieldName, 'generating')
              } else if (line === '__DONE__') {
                // Finalise the last field
                if (currentFieldName) {
                  setFieldContent(currentFieldName, currentFieldContent.trim())
                  setFieldStatus(currentFieldName, 'done')
                  clearLiveFieldText()
                }
                afterDone = true
              } else if (!afterDone) {
                currentFieldContent += line + '\n'
                appendLiveFieldText(line + '\n')
              }
            }
          },
        )

        // Flush any partial line left in the buffer
        if (pendingLine && !afterDone && currentFieldName) {
          currentFieldContent += pendingLine
          setFieldContent(currentFieldName, currentFieldContent.trim())
          setFieldStatus(currentFieldName, 'done')
          clearLiveFieldText()
        }

        // Extract assembled JSON (everything after __DONE__\n)
        const doneIdx = result.indexOf('__DONE__\n')
        const jsonStr = doneIdx >= 0 ? result.slice(doneIdx + 9) : result

        // Always persist the latest raw JSON so the Output page always shows
        // the NEW generation — even if it has structural problems.
        if (jsonStr.trim()) {
          await updateProject(pid, { last_generated_card: jsonStr })
        }

        const { ok, card } = validate_card_client(jsonStr)
        if (ok && card) {
          setGeneratedCard(card)
          setGenerationComplete(true)
          toast.success('Card gerado com sucesso!')
        } else {
          // Don't set generatedCard — Output will fall through to
          // last_generated_card (the broken JSON we just saved) and open
          // the JSON tab with error indicators + the AI fix button.
          toast.error('JSON com problemas — corrija no Output.')
          CHUNKED_FIELDS.forEach(f => {
            if ((fieldStatuses[f] as string) === 'generating') setFieldStatus(f, 'error')
          })
          setGenerationComplete(true)
        }
      } catch (e: any) {
        toast.error(e.message || 'Erro na geração')
        if (currentFieldName) setFieldStatus(currentFieldName, 'error')
        setGenerationComplete(true)
      } finally {
        setStreaming(false)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const allDoneText = Object.values(fieldContents).join(' ')
  const combinedText = allDoneText + ' ' + liveFieldText
  const totalWords = combinedText.trim()
    ? combinedText.trim().split(/\s+/).filter(Boolean).length
    : 0
  const totalChars = Object.values(fieldContents).reduce((s, c) => s + c.length, 0)
    + liveFieldText.length
  const estimatedTokens = Math.round(totalChars / 4)
  const estimatedKB = ((totalChars * 1.35) / 1024).toFixed(1)
  const completedCount = CHUNKED_FIELDS.filter(
    f => fieldStatuses[f] === 'done' || fieldStatuses[f] === 'error',
  ).length
  const activeField = CHUNKED_FIELDS.find(f => fieldStatuses[f] === 'generating')

  const toggleExpand = (field: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col">

      {/* ── Header ── */}
      <div className="border-b border-[#2a2a2a] px-6 py-4 flex items-center gap-4 sticky top-0 bg-[#111111] z-10">
        <button
          onClick={() => navigate(`/editor/${projectId}`)}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Voltar
        </button>

        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-[#9b59b6]" />
          <span className="text-white font-semibold text-sm">
            Gerando Card
            {currentProject ? (
              <span className="text-gray-400 font-normal">
                {' '}— {currentProject.character_name}
              </span>
            ) : null}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {!generationComplete ? (
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9b59b6] animate-pulse inline-block" />
              {completedCount} / {CHUNKED_FIELDS.length} campos
            </span>
          ) : (
            <span className="text-xs text-green-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Concluído
            </span>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="border-b border-[#2a2a2a] px-6 py-2.5 flex items-center gap-8 bg-[#141414]">
        <StatPill label="Palavras geradas" value={totalWords.toLocaleString('pt-BR')} />
        <StatPill label="Tamanho estimado" value={`~${estimatedKB} KB`} />
        <StatPill label="Tokens de saída (est.)" value={estimatedTokens.toLocaleString('pt-BR')} />
        {activeField && (
          <span className="ml-auto text-xs text-[#9b59b6] flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            {FIELD_LABELS[activeField] ?? activeField}
          </span>
        )}
      </div>

      {/* ── Field blocks ── */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-2">
          {CHUNKED_FIELDS.map(field => {
            const status: FieldStatus = (fieldStatuses[field] as FieldStatus) ?? 'pending'
            const content = fieldContents[field] ?? ''
            const wordCount = content
              ? content.trim().split(/\s+/).filter(Boolean).length
              : 0
            const liveWordCount = liveFieldText.trim()
              ? liveFieldText.trim().split(/\s+/).filter(Boolean).length
              : 0
            const isExpanded = expandedFields.has(field)

            return (
              <FieldBlock
                key={field}
                label={FIELD_LABELS[field] ?? field}
                status={status}
                content={content}
                liveText={status === 'generating' ? liveFieldText : ''}
                wordCount={wordCount}
                liveWordCount={liveWordCount}
                isExpanded={isExpanded}
                liveScrollRef={status === 'generating' ? liveScrollRef : undefined}
                onToggleExpand={() => toggleExpand(field)}
              />
            )
          })}
        </div>
      </div>

      {/* ── Footer CTA ── */}
      {generationComplete && (
        <div className="border-t border-[#2a2a2a] px-6 py-4 flex items-center justify-between bg-[#141414]">
          <div className="text-xs text-gray-500">
            {totalWords.toLocaleString('pt-BR')} palavras &middot; ~{estimatedKB} KB &middot; {estimatedTokens.toLocaleString('pt-BR')} tokens est.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetFieldProgress()
                navigate(`/editor/${projectId}`)
              }}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Editar Contexto
            </button>
            <button
              onClick={() => navigate(`/editor/${projectId}/output`)}
              className="px-5 py-2 text-sm bg-[#9b59b6] hover:bg-[#8e44ad] text-white rounded-lg font-medium transition-colors"
            >
              Ver Card →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-600 uppercase tracking-wider leading-none">{label}</span>
      <span className="text-sm text-gray-200 font-mono leading-none">{value}</span>
    </div>
  )
}

interface FieldBlockProps {
  label: string
  status: FieldStatus
  content: string
  liveText: string
  wordCount: number
  liveWordCount: number
  isExpanded: boolean
  liveScrollRef?: React.RefObject<HTMLDivElement>
  onToggleExpand: () => void
}

function FieldBlock({
  label,
  status,
  content,
  liveText,
  wordCount,
  liveWordCount,
  isExpanded,
  liveScrollRef,
  onToggleExpand,
}: FieldBlockProps) {
  const isDone      = status === 'done'
  const isGenerating = status === 'generating'
  const isPending   = status === 'pending'
  const isError     = status === 'error'

  const borderClass =
    isDone       ? 'border-[#1e3a1e] bg-[#131a13]' :
    isGenerating ? 'border-[#3a1f50] bg-[#160e22]' :
    isError      ? 'border-[#4a1a1a] bg-[#1a1010]' :
    /* pending */  'border-[#222222] bg-[#131313] opacity-40'

  return (
    <div className={`rounded-xl border transition-all duration-200 ${borderClass}`}>

      {/* Header row */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${isDone ? 'cursor-pointer select-none' : ''}`}
        onClick={isDone ? onToggleExpand : undefined}
      >
        {/* Status icon */}
        <span className="shrink-0 w-4 flex justify-center">
          {isDone       && <CheckCircle2 size={15} className="text-green-500" />}
          {isGenerating && <Loader2     size={15} className="text-[#9b59b6] animate-spin" />}
          {isPending    && <Circle      size={15} className="text-gray-700" />}
          {isError      && <AlertCircle size={15} className="text-red-500" />}
        </span>

        {/* Label */}
        <span className={`text-sm font-medium flex-1 truncate ${
          isDone       ? 'text-gray-200' :
          isGenerating ? 'text-[#c07ee8]' :
          isError      ? 'text-red-400' :
          /* pending */  'text-gray-600'
        }`}>
          {label}
        </span>

        {/* Word count chips */}
        {isDone && wordCount > 0 && (
          <span className="text-[11px] text-gray-500 font-mono shrink-0">
            {wordCount.toLocaleString('pt-BR')} pal.
          </span>
        )}
        {isGenerating && (
          <span className="text-[11px] text-[#9b59b6] font-mono shrink-0 animate-pulse">
            {liveWordCount.toLocaleString('pt-BR')} pal.
          </span>
        )}

        {/* Expand toggle for done blocks */}
        {isDone && (
          <span className="text-gray-600 shrink-0 ml-1">
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        )}
      </div>

      {/* Live streaming content */}
      {isGenerating && (
        <div
          ref={liveScrollRef}
          className="px-4 pb-4 max-h-[320px] overflow-auto"
        >
          <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed">
            {liveText}
            <span className="text-[#9b59b6] animate-pulse">█</span>
          </pre>
        </div>
      )}

      {/* Expanded content for done blocks */}
      {isDone && isExpanded && (
        <div className="px-4 pb-4 border-t border-[#1a2e1a]">
          <pre className="mt-3 text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-auto">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}
