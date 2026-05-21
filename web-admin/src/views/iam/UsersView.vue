<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Pencil, Trash2, Search, Users } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { useIamStore } from '@/stores/iam'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppPagination from '@/components/ui/AppPagination.vue'

const PAGE_SIZE = 15

const store = useIamStore()

const filterName = ref('')
const filterActive = ref('all')
const page = ref(1)

const activeOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'true', label: 'Ativos' },
    { value: 'false', label: 'Inativos' },
]

const hasMore = computed(() => store.users.length === PAGE_SIZE)

async function load() {
    await store.fetchUsers({
        ...(filterName.value ? { name: filterName.value } : {}),
        ...(filterActive.value !== 'all' ? { active: filterActive.value } : {}),
        page: page.value,
        pageSize: PAGE_SIZE,
    })
}

watch([filterName, filterActive], () => {
    page.value = 1
    load()
}, { immediate: true })

function onPageChange(newPage: number) {
    page.value = newPage
    load()
}

const avatarColors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
function avatarColor(name: string) {
    const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return avatarColors[h % avatarColors.length]
}
function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

async function removeUser(id: string, name: string) {
    if (!confirm(`Excluir o usuário "${name}"? Esta ação não pode ser desfeita.`)) return
    await store.deleteUser(id)
}
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
            <div>
                <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Usuários</h1>
                <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                    Gerencie os usuários e seus grupos de acesso
                </p>
            </div>
            <AppButton size="sm" :to="{ name: 'iam-user-form', params: { id: 'new' } }">
                <Plus :size="15" />
                Novo Usuário
            </AppButton>
        </div>

        <!-- Filtros -->
        <div class="flex flex-wrap items-center gap-2">
            <div class="relative flex-1 min-w-48 max-w-xs">
                <Search
                    :size="14"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                    v-model="filterName"
                    placeholder="Buscar por nome..."
                    class="w-full pl-9 pr-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
            </div>
            <AppSelect v-model="filterActive" :options="activeOptions" />
        </div>

        <!-- Lista -->
        <div>
            <div v-if="store.loading" class="py-20 text-center">
                <div class="inline-flex flex-col items-center gap-2 text-gray-400">
                    <div class="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-primary-500 rounded-full animate-spin" />
                    <span class="text-sm">Carregando...</span>
                </div>
            </div>

            <div
                v-else-if="store.users.length === 0"
                class="py-20 flex flex-col items-center gap-3 text-center"
            >
                <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Users :size="20" class="text-gray-400" />
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Nenhum usuário encontrado</p>
                    <p v-if="filterName || filterActive !== 'all'" class="text-xs text-gray-400 mt-1">
                        Tente ajustar os filtros
                    </p>
                </div>
            </div>

            <div v-else class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60">
                <div
                    v-for="user in store.users"
                    :key="user.id"
                    class="flex items-center gap-4 px-4 py-3.5 group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                    <!-- Avatar + Info (link) -->
                    <RouterLink
                        :to="{ name: 'iam-user-form', params: { id: user.id } }"
                        class="flex items-center gap-4 flex-1 min-w-0"
                    >
                        <div
                            :class="[
                                'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
                                avatarColor(user.name),
                            ]"
                        >
                            {{ initials(user.name) }}
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {{ user.name }}
                                </span>
                                <span
                                    :class="[
                                        'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium shrink-0',
                                        user.active
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                                    ]"
                                >
                                    {{ user.active ? 'Ativo' : 'Inativo' }}
                                </span>
                            </div>
                            <p class="text-xs text-gray-400 truncate mt-0.5">
                                @{{ user.username }}
                                <span class="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                                {{ user.email }}
                            </p>
                        </div>
                    </RouterLink>

                    <!-- Ações -->
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <RouterLink
                            :to="{ name: 'iam-user-form', params: { id: user.id } }"
                            class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Editar"
                        >
                            <Pencil :size="14" />
                        </RouterLink>
                        <button
                            class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            @click="removeUser(user.id, user.name)"
                            title="Excluir"
                        >
                            <Trash2 :size="14" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <AppPagination :page="page" :has-more="hasMore" @change="onPageChange" />
    </div>
</template>
