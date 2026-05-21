// Mirrors api/src/domain/dtos/iam/users/outputs/user.output.ts and commands/

export interface UserOutput {
    id: string
    name: string
    username: string
    email: string
    active: boolean
    created_at: string
    updated_at: string
}

export interface CreateUserPayload {
    name: string
    username: string
    email: string
    password: string
}

export interface UpdateUserPayload {
    name?: string
    email?: string
    password?: string
    active?: boolean
}
