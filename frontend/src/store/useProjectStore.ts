import { create } from 'zustand'
import { projectsApi } from '../api/projects'
import type { Project } from '../types'

interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  fetchProjects: () => Promise<void>
  fetchProject: (id: number) => Promise<void>
  createProject: (data: { name: string; character_name: string; description?: string }) => Promise<Project>
  updateProject: (id: number, data: Partial<Project>) => Promise<void>
  deleteProject: (id: number) => Promise<void>
  setCurrentProject: (project: Project | null) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    try {
      const projects = await projectsApi.list()
      set({ projects })
    } finally {
      set({ loading: false })
    }
  },

  fetchProject: async (id) => {
    const project = await projectsApi.get(id)
    set({ currentProject: project })
  },

  createProject: async (data) => {
    const project = await projectsApi.create(data)
    set(s => ({ projects: [project, ...s.projects] }))
    return project
  },

  updateProject: async (id, data) => {
    const updated = await projectsApi.update(id, data)
    set(s => ({
      projects: s.projects.map(p => (p.id === id ? updated : p)),
      currentProject: s.currentProject?.id === id ? updated : s.currentProject,
    }))
  },

  deleteProject: async (id) => {
    await projectsApi.delete(id)
    set(s => ({
      projects: s.projects.filter(p => p.id !== id),
      currentProject: s.currentProject?.id === id ? null : s.currentProject,
    }))
  },

  setCurrentProject: (project) => set({ currentProject: project }),
}))
