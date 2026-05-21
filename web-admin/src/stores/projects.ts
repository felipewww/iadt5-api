import { defineStore } from 'pinia'
import { ref } from 'vue'
import { projectsApi } from '@/api/projects'
import type { ProjectOutput, ListProjectsParams, CreateProjectPayload, UpdateProjectPayload } from '@/domain/projects'

export const useProjectsStore = defineStore('projects', () => {
    const projects = ref<ProjectOutput[]>([])
    const loading = ref(false)
    const pendingReplyJobIds = ref(new Set<string>())

    async function fetchProjects(params?: ListProjectsParams) {
        loading.value = true
        try {
            projects.value = await projectsApi.list(params)
        } finally {
            loading.value = false
        }
    }

    async function createProject(data: CreateProjectPayload) {
        const project = await projectsApi.create(data)
        projects.value.unshift(project)
        return project
    }

    async function updateProject(id: string, data: UpdateProjectPayload) {
        const project = await projectsApi.update(id, data)
        const idx = projects.value.findIndex((p) => p.id === id)
        if (idx !== -1) projects.value[idx] = project
        return project
    }

    async function toggleFavorite(id: string) {
        const project = await projectsApi.toggleFavorite(id)
        const idx = projects.value.findIndex((p) => p.id === id)
        if (idx !== -1) projects.value[idx] = project
        return project
    }

    async function deleteProject(id: string) {
        await projectsApi.delete(id)
        projects.value = projects.value.filter((p) => p.id !== id)
    }

    async function uploadAnalysis(id: string, file: File) {
        return projectsApi.uploadAnalysis(id, file)
    }

    async function getAnalysisToken(id: string) {
        return projectsApi.getAnalysisToken(id)
    }

    async function replyAnalysis(id: string, jobId: string, answer: string) {
        await projectsApi.replyAnalysis(id, answer)
        pendingReplyJobIds.value.add(jobId)
        const project = projects.value.find((p) => p.id === id)
        if (project) project.analysisStatus = 'RUNNING'
    }

    function clearReplyPending(jobId: string) {
        pendingReplyJobIds.value.delete(jobId)
    }

    async function cancelAnalysis(id: string) {
        await projectsApi.cancelAnalysis(id)
        const project = projects.value.find((p) => p.id === id)
        if (project) {
            project.analysisJobId = null
            project.analysisStatus = null
        }
    }

    return { projects, loading, pendingReplyJobIds, fetchProjects, createProject, updateProject, toggleFavorite, deleteProject, uploadAnalysis, getAnalysisToken, replyAnalysis, clearReplyPending, cancelAnalysis }
})
