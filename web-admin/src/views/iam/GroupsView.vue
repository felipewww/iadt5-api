<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Pencil, Trash2, Search, ShieldCheck } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { useIamStore } from '@/stores/iam'
import AppButton from '@/components/ui/AppButton.vue'
import AppPagination from '@/components/ui/AppPagination.vue'

const PAGE_SIZE = 15

const store = useIamStore()

const filterName = ref('')
const page = ref(1)

const hasMore = computed(() => store.groups.length === PAGE_SIZE)

const groupColors = [
    'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
]
function groupColor(name: string) {
    const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return groupColors[h % groupColors.length]
}

async function load() {
    await store.fetchGroups({
        ...(filterName.value ? { name: filterName.value } : {}),
        page: page.value,
        pageSize: PAGE_SIZE,
    })
}

watch(filterName, () => {
    page.value = 1
    load()
}, { immediate: true })

function onPageChange(newPage: number) {
    page.value = newPage
    load()
}

async function removeGroup(id: string, name: string) {
    if (!confirm(`Excluir o grupo "${name}"? Esta ação não pode ser desfeita.`)) return
    await store.deleteGroup(id)
}
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
            <div>
                <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Grupos</h1>
                <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                    Organize permissões em grupos e atribua aos usuários
                </p>
            </div>
            <AppButton size="sm" :to="{ name: 'iam-group-form', params: { id: 'new' } }">
                <Plus :size="15" />
                Novo Grupo
            </AppButton>
        </div>

        <!-- Filtro -->
        <div class="relative max-w-xs">
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

        <!-- Lista -->
        <div>
            <div v-if="store.loading" class="py-20 text-center">
                <div class="inline-flex flex-col items-center gap-2 text-gray-400">
                    <div class="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-primary-500 rounded-full animate-spin" />
                    <span class="text-sm">Carregando...</span>
                </div>
            </div>

            <div
                v-else-if="store.groups.length === 0"
                class="py-20 flex flex-col items-center gap-3 text-center"
            >
                <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <ShieldCheck :size="20" class="text-gray-400" />
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Nenhum grupo encontrado</p>
                    <p v-if="filterName" class="text-xs text-gray-400 mt-1">Tente ajustar o filtro</p>
                </div>
            </div>

            <div
                v-else
                class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60"
            >
                <div
                    v-for="group in store.groups"
                    :key="group.id"
                    class="flex items-center gap-4 px-4 py-3.5 group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                    <!-- Ícone + Info (link) -->
                    <RouterLink
                        :to="{ name: 'iam-group-form', params: { id: group.id } }"
                        class="flex items-center gap-4 flex-1 min-w-0"
                    >
                        <div
                            :class="[
                                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                                groupColor(group.name),
                            ]"
                        >
                            <ShieldCheck :size="16" />
                        </div>
                        <div class="min-w-0">
                            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ group.name }}</p>
                            <p class="text-xs truncate mt-0.5" :class="group.description ? 'text-gray-400' : 'text-gray-300 dark:text-gray-600 italic'">
                                {{ group.description ?? 'Sem descrição' }}
                            </p>
                        </div>
                    </RouterLink>

                    <!-- Ações -->
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <RouterLink
                            :to="{ name: 'iam-group-form', params: { id: group.id } }"
                            class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Editar"
                        >
                            <Pencil :size="14" />
                        </RouterLink>
                        <button
                            class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            @click="removeGroup(group.id, group.name)"
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
