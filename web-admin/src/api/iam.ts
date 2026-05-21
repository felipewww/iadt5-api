import client from './client'
import type {
    UserOutput,
    CreateUserPayload,
    UpdateUserPayload,
    GroupOutput,
    CreateGroupPayload,
    UpdateGroupPayload,
    PermissionOutput,
    SystemModuleOutput,
} from '@/domain/iam'

export const iamApi = {
    // Users
    listUsers: (params?: Record<string, unknown>) =>
        client.get<UserOutput[]>('/iam/users', { params }).then((r) => r.data),

    getUser: (id: string) =>
        client.get<UserOutput>(`/iam/users/${id}`).then((r) => r.data),

    createUser: (data: CreateUserPayload) =>
        client.post<UserOutput>('/iam/users', data).then((r) => r.data),

    updateUser: (id: string, data: UpdateUserPayload) =>
        client.put<UserOutput>(`/iam/users/${id}`, data).then((r) => r.data),

    deleteUser: (id: string) =>
        client.delete(`/iam/users/${id}`),

    getUserGroups: (id: string) =>
        client.get<GroupOutput[]>(`/iam/users/${id}/groups`).then((r) => r.data),

    syncUserGroups: (id: string, groupIds: string[]) =>
        client.put(`/iam/users/${id}/groups`, { groupIds }),

    // Groups
    listGroups: (params?: Record<string, unknown>) =>
        client.get<GroupOutput[]>('/iam/groups', { params }).then((r) => r.data),

    getGroup: (id: string) =>
        client.get<GroupOutput>(`/iam/groups/${id}`).then((r) => r.data),

    createGroup: (data: CreateGroupPayload) =>
        client.post<GroupOutput>('/iam/groups', data).then((r) => r.data),

    updateGroup: (id: string, data: UpdateGroupPayload) =>
        client.put<GroupOutput>(`/iam/groups/${id}`, data).then((r) => r.data),

    deleteGroup: (id: string) =>
        client.delete(`/iam/groups/${id}`),

    getGroupPermissions: (id: string) =>
        client.get<PermissionOutput[]>(`/iam/groups/${id}/permissions`).then((r) => r.data),

    getGroupUsers: (id: string) =>
        client.get<UserOutput[]>(`/iam/groups/${id}/users`).then((r) => r.data),

    syncGroupPermissions: (id: string, permissionIds: string[]) =>
        client.put(`/iam/groups/${id}/permissions`, { permissionIds }),

    // Permissions
    listPermissions: () =>
        client.get<SystemModuleOutput[]>('/iam/permissions').then((r) => r.data),
}
