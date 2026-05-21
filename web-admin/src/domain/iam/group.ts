// Mirrors api/src/domain/dtos/iam/groups/outputs/group.output.ts and commands/

export interface GroupOutput {
    id: string
    name: string
    description: string | null
    created_at: string
    updated_at: string
}

export interface CreateGroupPayload {
    name: string
    description?: string
}

export interface UpdateGroupPayload {
    name?: string
    description?: string
}
