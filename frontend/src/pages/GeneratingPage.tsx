import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Circle, Loader2, StopCircle, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { generationApi } from '../api/generation'
import type { GenerationJob } from '../types'
import { useGenerationStore } from '../store/useGenerationStore'
import { useProjectStore } from '../store/useProjectStore'

const LABELS: Record<string, string> = { description: 'Descrição', personality: 'Personalidade', scenario: 'Cenário', first_mes: 'Primeira Mensagem', mes_example: 'Exemplos', system_prompt: 'System Prompt', post_history_instructions: 'Post-History', alternate_greetings: 'Saudações Alternativas' }

export default function GeneratingPage() {
  const { projectId } = useParams(); const [params, setParams] = useSearchParams(); const navigate = useNavigate()
  const [job, setJob] = useState<GenerationJob | null>(null); const [loading, setLoading] = useState(true)
  const { setGeneratedCard } = useGenerationStore(); const { fetchProject } = useProjectStore()
  const jobId = Number(params.get('job')) || null

  useEffect(() => {
    let stopped = false; let timer: number | undefined
    const load = async () => {
      try {
        let target = jobId
        if (!target) {
          const active = await generationApi.listJobs(Number(projectId), true)
          target = active[0]?.id || null
          if (target) setParams({ job: String(target) }, { replace: true })
        }
        if (!target) { setLoading(false); return }
        const next = await generationApi.getJob(target)
        if (stopped) return
        setJob(next); setLoading(false)
        if (next.status === 'completed') {
          try { if (next.result_json) setGeneratedCard(JSON.parse(next.result_json)); await fetchProject(Number(projectId)) } catch {}
        } else if (next.status === 'queued' || next.status === 'running') timer = window.setTimeout(load, 900)
      } catch (e: any) { if (!stopped) { setLoading(false); toast.error(e?.response?.data?.detail || 'Não foi possível recuperar a geração') } }
    }
    load(); return () => { stopped = true; if (timer) clearTimeout(timer) }
  }, [jobId, projectId])

  if (loading) return <div className="h-full flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/> Recuperando geração…</div>
  if (!job) return <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center"><AlertCircle className="text-amber-400"/><p className="text-gray-300">Nenhuma geração ativa foi encontrada.</p><button onClick={() => navigate(`/editor/${projectId}`)} className="min-h-11 px-5 rounded-xl bg-[#9b59b6]">Voltar ao editor</button></div>
  const complete = job.status === 'completed'; const terminal = complete || job.status === 'failed' || job.status === 'cancelled'
  return <div className="h-full flex flex-col bg-[#0f0f0f]">
    <header className="px-4 lg:px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-3"><Wand2 size={18} className="text-[#9b59b6]"/><div><h1 className="text-sm font-semibold">Geração no servidor</h1><p className="text-xs text-gray-500">Pode fechar ou recarregar esta página sem interromper</p></div><span className="ml-auto text-xs text-gray-400">{job.completed_steps}/{job.total_steps}</span></header>
    <main className="flex-1 overflow-auto p-4 lg:p-6"><div className="max-w-3xl mx-auto space-y-3">
      {job.status === 'queued' && <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-300">Na fila deste usuário. A geração começará assim que o job anterior terminar.</div>}
      {job.error && <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">{job.error}</div>}
      {(job.steps || []).map(step => <article key={step.key} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4"><div className="flex items-center gap-3">{step.status === 'completed' ? <CheckCircle2 size={17} className="text-emerald-400"/> : step.status === 'running' ? <Loader2 size={17} className="animate-spin text-[#9b59b6]"/> : step.status === 'failed' ? <AlertCircle size={17} className="text-red-400"/> : <Circle size={17} className="text-gray-700"/>}<span className="text-sm font-medium">{LABELS[step.key] || step.key}</span><span className="ml-auto text-[10px] uppercase text-gray-600">{step.status}</span></div>{step.content && <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-gray-400 border-t border-[#2a2a2a] pt-3">{step.content}</pre>}</article>)}
    </div></main>
    <footer className="p-4 border-t border-[#2a2a2a] flex flex-col sm:flex-row gap-3 justify-end bg-[#141414]">{!terminal && <button onClick={async () => { await generationApi.cancelJob(job.id); setJob(await generationApi.getJob(job.id)) }} className="min-h-11 px-4 rounded-xl border border-red-900/50 text-red-400 flex items-center justify-center gap-2"><StopCircle size={16}/> Cancelar</button>}{terminal && <button onClick={() => navigate(`/editor/${projectId}`)} className="min-h-11 px-4 rounded-xl border border-[#333]">Editar contexto</button>}{complete && <button onClick={() => navigate(`/editor/${projectId}/output`)} className="min-h-11 px-5 rounded-xl bg-[#9b59b6] font-medium">Ver card</button>}{job.status === 'failed' && <button onClick={() => navigate(`/editor/${projectId}`)} className="min-h-11 px-5 rounded-xl bg-[#9b59b6]">Tentar novamente</button>}</footer>
  </div>
}
