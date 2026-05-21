// Mirrors api/src/domain/dtos/iam/permissions/outputs/

export interface PermissionOutput {
    id: string
    module_id: number
    action: number
    name: string
}

export interface SystemModuleOutput {
    id: string
    name: string
    description: string | null
    permissions: PermissionOutput[]
}
