<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ArrowLeft, Check, UserMinus, Users, Shield, Loader2, AlertTriangle } from '@lucide/vue'
import { useIamStore } from '@/stores/iam'
import { iamApi } from '@/api/iam'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppFormPage from '@/components/layout/AppFormPage.vue'
import type { CreateGroupPayload, UpdateGroupPayload, UserOutput } from '@/domain/iam'

const route = useRoute()
const router = useRouter()
const store = useIamStore()

const isNew = computed(() => route.params.id === 'new')
const groupId = computed(() => (isNew.value ? null : (route.params.id as string)))

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const pageTitle = ref('Novo Grupo')
const permissionsError = ref(false)

const form = ref({ name: '', description: '' })
const selectedPermissionIds = ref<string[]>([])
const groupUsers = ref<UserOutput[]>([])

onMounted(async () => {
    loading.value = true
    try {
        try {
            await store.fetchPermissions()
        } catch {
            permissionsError.value = true
        }

        if (!isNew.value && groupId.value) {
            const [group, perms, users] = await Promise.all([
                iamApi.getGroup(groupId.value),
                iamApi.getGroupPermissions(groupId.value),
                iamApi.getGroupUsers(groupId.value),
            ])
            pageTitle.value = group.name
            form.value = { name: group.name, description: group.description ?? '' }
            selectedPermissionIds.value = perms.map((p) => p.id)
            groupUsers.value = users
        }
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        loading.value = false
    }
})

function isSelected(permId: string) {
    return selectedPermissionIds.value.includes(permId)
}

function togglePermission(id: string) {
    const i = selectedPermissionIds.value.indexOf(id)
    if (i === -1) selectedPermissionIds.value.push(id)
    else selectedPermissionIds.value.splice(i, 1)
}

async function removeUser(user: UserOutput) {
    if (!confirm(`Remover "${user.name}" deste grupo?`)) return
    const userGroups = await iamApi.getUserGroups(user.id)
    const newGroupIds = userGroups.filter((g) => g.id !== groupId.value).map((g) => g.id)
    await iamApi.syncUserGroups(user.id, newGroupIds)
    groupUsers.value = groupUsers.value.filter((u) => u.id !== user.id)
}

async function save() {
    error.value = ''
    saving.value = true
    try {
        const payload = { name: form.value.name.trim(), description: form.value.description.trim() || undefined }
        let id = groupId.value
        if (isNew.value) {
            const group = await store.createGroup(payload as CreateGroupPayload)
            id = group.id
        } else {
            await store.updateGroup(id!, payload as UpdateGroupPayload)
        }
        await iamApi.syncGroupPermissions(id!, selectedPermissionIds.value)
        router.push({ name: 'iam-groups' })
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        saving.value = false
    }
}

const avatarColors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
function avatarColor(name: string) {
    const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return avatarColors[h % avatarColors.length]
}
function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}
</script>

<template>
    <AppFormPage>
        <!-- Cabeçalho da página -->
        <div>
            <RouterLink
                :to="{ name: 'iam-groups' }"
                class="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-2"
            >
                <ArrowLeft :size="13" />
                Grupos
            </RouterLink>
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ pageTitle }}</h1>
                    <p v-if="!isNew" class="text-xs text-gray-400 mt-0.5">Editar informações e permissões do grupo</p>
                    <p v-else class="text-xs text-gray-400 mt-0.5">Preencha os dados e selecione as permissões</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <AppButton variant="secondary" size="sm" @click="router.push({ name: 'iam-groups' })">
                        Cancelar
                    </AppButton>
                    <AppButton size="sm" :disabled="saving" @click="save">
                        <Loader2 v-if="saving" :size="13" class="animate-spin" />
                        {{ saving ? 'Salvando...' : 'Salvar grupo' }}
                    </AppButton>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="py-20 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 :size="18" class="animate-spin" />
            <span class="text-sm">Carregando...</span>
        </div>

        <template v-else>
            <!-- Error banner -->
            <div
                v-if="error"
                class="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400"
            >
                <AlertTriangle :size="15" class="shrink-0 mt-0.5" />
                {{ error }}
            </div>

            <!-- Informações -->
            <section class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Informações</h2>
                    <p class="text-xs text-gray-400 mt-0.5">Dados básicos do grupo</p>
                </div>
                <div class="p-5 space-y-4">
                    <AppInput v-model="form.name" label="Nome" placeholder="Ex: Administradores" required />
                    <AppInput
                        v-model="form.description"
                        label="Descrição"
                        placeholder="Descreva o propósito deste grupo (opcional)"
                    />
                </div>
            </section>

            <!-- Permissões -->
            <section>
                <div class="flex items-center gap-2 mb-3">
                    <Shield :size="14" class="text-gray-400" />
                    <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Permissões</h2>
                    <span
                        v-if="selectedPermissionIds.length > 0"
                        class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                    >
                        {{ selectedPermissionIds.length }}
                        selecionada{{ selectedPermissionIds.length !== 1 ? 's' : '' }}
                    </span>
                </div>

                <!-- Erro ao carregar permissões -->
                <div
                    v-if="permissionsError"
                    class="flex items-center gap-2.5 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400"
                >
                    <AlertTriangle :size="14" class="shrink-0" />
                    Não foi possível carregar as permissões. Verifique a conexão com a API.
                </div>

                <!-- Lista vazia -->
                <div
                    v-else-if="store.permissions.length === 0"
                    class="p-10 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center"
                >
                    <Shield :size="28" class="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma permissão configurada</p>
                    <p class="text-xs text-gray-400 mt-1">Adicione módulos em permissions.config.ts</p>
                </div>

                <!-- Módulos de permissão -->
                <div v-else class="space-y-3">
                    <div
                        v-for="module in store.permissions"
                        :key="module.id"
                        class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                        <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-3">
                            <div>
                                <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ module.name }}</p>
                                <p v-if="module.description" class="text-xs text-gray-400 mt-0.5">
                                    {{ module.description }}
                                </p>
                            </div>
                            <span class="text-xs text-gray-400 shrink-0">
                                {{ module.permissions.filter((p) => isSelected(p.id)).length }}/{{ module.permissions.length }}
                            </span>
                        </div>
                        <div class="p-4 grid grid-cols-2 gap-2">
                            <button
                                v-for="perm in module.permissions"
                                :key="perm.id"
                                type="button"
                                @click="togglePermission(perm.id)"
                                :class="[
                                    'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm border transition-all text-left cursor-pointer select-none',
                                    isSelected(perm.id)
                                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/40',
                                ]"
                            >
                                <div
                                    :class="[
                                        'w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors',
                                        isSelected(perm.id)
                                            ? 'bg-primary-600 border-primary-600'
                                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
                                    ]"
                                >
                                    <Check v-if="isSelected(perm.id)" :size="10" :stroke-width="3" class="text-white" />
                                </div>
                                <span class="leading-snug">{{ perm.name }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Usuários (somente edição) -->
            <section v-if="!isNew">
                <div class="flex items-center gap-2 mb-3">
                    <Users :size="14" class="text-gray-400" />
                    <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Usuários</h2>
                    <span v-if="groupUsers.length > 0" class="ml-auto text-xs text-gray-400">
                        {{ groupUsers.length }} usuário{{ groupUsers.length !== 1 ? 's' : '' }}
                    </span>
                </div>

                <div
                    v-if="groupUsers.length === 0"
                    class="p-10 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center"
                >
                    <Users :size="28" class="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum usuário neste grupo</p>
                </div>

                <div
                    v-else
                    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60"
                >
                    <div
                        v-for="user in groupUsers"
                        :key="user.id"
                        class="flex items-center gap-3 px-4 py-3 group"
                    >
                        <div
                            :class="[
                                'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
                                avatarColor(user.name),
                            ]"
                        >
                            {{ initials(user.name) }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ user.name }}</p>
                            <p class="text-xs text-gray-400 truncate">@{{ user.username }}</p>
                        </div>
                        <button
                            type="button"
                            @click="removeUser(user)"
                            class="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        >
                            <UserMinus :size="13" />
                            Remover
                        </button>
                    </div>
                </div>
            </section>

            <!-- Ações finais -->
            <div class="flex justify-end gap-2 pt-2">
                <AppButton variant="secondary" size="sm" @click="router.push({ name: 'iam-groups' })">
                    Cancelar
                </AppButton>
                <AppButton size="sm" :disabled="saving" @click="save">
                    <Loader2 v-if="saving" :size="13" class="animate-spin" />
                    {{ saving ? 'Salvando...' : 'Salvar grupo' }}
                </AppButton>
            </div>
        </template>
    </AppFormPage>
</template>
