import { defineStore } from 'pinia'
import { ref } from 'vue'
import { iamApi } from '@/api/iam'
import type {
    UserOutput,
    CreateUserPayload,
    UpdateUserPayload,
    GroupOutput,
    CreateGroupPayload,
    UpdateGroupPayload,
    SystemModuleOutput,
} from '@/domain/iam'

export const useIamStore = defineStore('iam', () => {
    const users = ref<UserOutput[]>([])
    const groups = ref<GroupOutput[]>([])
    const permissions = ref<SystemModuleOutput[]>([])
    const loading = ref(false)

    async function fetchUsers(params?: Record<string, unknown>) {
        loading.value = true
        try {
            users.value = await iamApi.listUsers(params)
        } finally {
            loading.value = false
        }
    }

    async function createUser(data: CreateUserPayload) {
        const user = await iamApi.createUser(data)
        users.value.push(user)
        return user
    }

    async function updateUser(id: string, data: UpdateUserPayload) {
        const user = await iamApi.updateUser(id, data)
        const idx = users.value.findIndex((u) => u.id === id)
        if (idx !== -1) users.value[idx] = user
        return user
    }

    async function deleteUser(id: string) {
        await iamApi.deleteUser(id)
        users.value = users.value.filter((u) => u.id !== id)
    }

    async function fetchGroups(params?: Record<string, unknown>) {
        groups.value = await iamApi.listGroups(params)
    }

    async function createGroup(data: CreateGroupPayload) {
        const group = await iamApi.createGroup(data)
        groups.value.push(group)
        return group
    }

    async function updateGroup(id: string, data: UpdateGroupPayload) {
        const group = await iamApi.updateGroup(id, data)
        const idx = groups.value.findIndex((g) => g.id === id)
        if (idx !== -1) groups.value[idx] = group
        return group
    }

    async function deleteGroup(id: string) {
        await iamApi.deleteGroup(id)
        groups.value = groups.value.filter((g) => g.id !== id)
    }

    async function fetchPermissions() {
        permissions.value = await iamApi.listPermissions()
    }

    return {
        users,
        groups,
        permissions,
        loading,
        fetchUsers,
        createUser,
        updateUser,
        deleteUser,
        fetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
        fetchPermissions,
    }
})
