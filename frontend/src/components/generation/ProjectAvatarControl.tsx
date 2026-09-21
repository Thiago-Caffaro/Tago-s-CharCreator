import React, { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsApi } from '../../api/projects'
import { useProjectStore } from '../../store/useProjectStore'

export function ProjectAvatarControl({ projectId }: { projectId: number }) {
  const project = useProjectStore(s => s.currentProject); const fetchProject = useProjectStore(s => s.fetchProject)
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false)
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setBusy(true); try { await projectsApi.uploadAvatar(projectId, file); await fetchProject(projectId); toast.success('Imagem salva no projeto') } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erro ao salvar imagem') } finally { setBusy(false) } }
  const remove = async () => { setBusy(true); try { await projectsApi.deleteAvatar(projectId); await fetchProject(projectId) } finally { setBusy(false) } }
  return <section className="rounded-xl border border-[#2a2a2a] bg-[#151515] p-3"><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload}/><div className="flex items-center gap-3"><button onClick={() => input.current?.click()} disabled={busy} className="w-14 h-14 rounded-xl border border-dashed border-[#555] overflow-hidden flex items-center justify-center shrink-0">{project?.avatar ? <img src={project.avatar} className="w-full h-full object-cover" alt="Imagem do personagem"/> : <ImagePlus size={20} className="text-gray-500"/>}</button><div className="min-w-0 flex-1"><p className="text-xs font-medium text-gray-300">Imagem do personagem</p><p className="text-[10px] text-gray-600 mt-0.5">Usada na prévia e no PNG final; não é enviada para a IA.</p><button onClick={() => input.current?.click()} className="text-[11px] text-[#9b59b6] mt-1">{project?.avatar ? 'Trocar imagem' : 'Escolher imagem'}</button></div>{project?.avatar && <button onClick={remove} disabled={busy} title="Remover imagem" className="min-w-11 min-h-11 flex items-center justify-center text-gray-600 hover:text-red-400"><Trash2 size={15}/></button>}</div></section>
}
