import client from './client'
import type { ProjectOutput, ListProjectsParams, CreateProjectPayload, UpdateProjectPayload, AnalysisUploadOutput } from '@/domain/projects'

export const projectsApi = {
    list: (params?: ListProjectsParams) =>
        client.get<ProjectOutput[]>('/projects', { params }).then((r) => r.data),

    get: (id: string) =>
        client.get<ProjectOutput>(`/projects/${id}`).then((r) => r.data),

    create: (data: CreateProjectPayload) =>
        client.post<ProjectOutput>('/projects', data).then((r) => r.data),

    update: (id: string, data: UpdateProjectPayload) =>
        client.put<ProjectOutput>(`/projects/${id}`, data).then((r) => r.data),

    toggleFavorite: (id: string) =>
        client.patch<ProjectOutput>(`/projects/${id}/favorite`).then((r) => r.data),

    delete: (id: string) =>
        client.delete(`/projects/${id}`),

    uploadCover: (id: string, file: File) => {
        const form = new FormData()
        form.append('file', file)
        return client.patch<ProjectOutput>(`/projects/${id}/cover`, form).then((r) => r.data)
    },

    uploadAnalysis: (id: string, file: File) => {
        const form = new FormData()
        form.append('file', file)
        return client.post<AnalysisUploadOutput>(`/projects/${id}/analysis`, form).then((r) => r.data)
    },

    getAnalysisToken: (id: string) =>
        client.get<AnalysisUploadOutput>(`/projects/${id}/analysis/token`).then((r) => r.data),

    replyAnalysis: (id: string, answer: string) =>
        client.post(`/projects/${id}/analysis/reply`, { answer }),

    cancelAnalysis: (id: string) =>
        client.delete(`/projects/${id}/analysis`),
}
