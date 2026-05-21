export interface ProjectOutput {
    id: string
    name: string
    customerName: string
    dateStart: string
    dateEnd: string
    photoUrl: string | null
    analysisJobId: string | null
    analysisStatus: string | null
    favorite: boolean
    createdAt: string
    updatedAt: string
}

export interface AnalysisUploadOutput {
    jobId: string
    streamToken: string
}

export interface JobStep {
    name: string
    data: Record<string, any>
    status: number
}

export interface JobOutput {
    jobId: string
    status: 'CREATED' | 'RUNNING' | 'DONE' | 'FAILED'
    error?: string
    result?: { steps: JobStep[] }
    createdAt: string
    updatedAt: string
}

export interface ListProjectsParams {
    name?: string
    customerName?: string
    favorite?: boolean
    dateStartAfter?: string
    dateStartBefore?: string
    dateEndAfter?: string
    dateEndBefore?: string
    orderBy?: string
    orderDir?: 'asc' | 'desc'
    page?: number
    pageSize?: number
}

export interface CreateProjectPayload {
    name: string
    customerName: string
    dateStart: string
    dateEnd: string
    hoverPhoto?: string
}

export interface UpdateProjectPayload {
    name?: string
    customerName?: string
    dateStart?: string
    dateEnd?: string
    hoverPhoto?: string
}
