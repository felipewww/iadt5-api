<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import { Plus, Star, FolderOpen, ChevronDown, ChevronRight, Pencil, Trash2, Upload, LoaderCircle, X } from '@lucide/vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { useProjectsStore } from '@/stores/projects'
import type { ProjectOutput, JobOutput } from '@/domain/projects'

const JOBS_URL = import.meta.env.VITE_JOBS_URL ?? 'http://localhost:3100'

const PAGE_SIZE = 12
const store  = useProjectsStore()
const router = useRouter()

// Live status from SSE per project, overrides the DB value while job is RUNNING
const liveStatuses = ref<Record<string, string>>({})
const jobAbortControllers: Record<string, AbortController> = {}

function jobToCardStatus(job: JobOutput): string {
    if (job.status === 'DONE') return 'DONE'
    if (job.status === 'FAILED') return 'FAILED'
    const steps = job.result?.steps ?? []
    if (steps.some((s) => s.name === 'analyzer-awaiting-reply')) return 'AWAITING_REPLY'
    return 'RUNNING'
}

function effectiveStatus(project: ProjectOutput): string | null {
    return liveStatuses.value[project.id] ?? project.analysisStatus
}

function stopJobWatcher(projectId: string) {
    jobAbortControllers[projectId]?.abort()
    delete jobAbortControllers[projectId]
}

async function startJobWatcher(project: ProjectOutput) {
    if (!project.analysisJobId || jobAbortControllers[project.id]) return

    const ctrl = new AbortController()
    jobAbortControllers[project.id] = ctrl

    try {
        const { jobId, streamToken } = await store.getAnalysisToken(project.id)
        fetchEventSource(`${JOBS_URL}/jobs/${jobId}/stream?token=${encodeURIComponent(streamToken)}`, {
            signal: ctrl.signal,
            openWhenHidden: true,
            onmessage(ev) {
                if (!ev.data) return
                try {
                    const job = JSON.parse(ev.data) as JobOutput
                    const status = jobToCardStatus(job)
                    liveStatuses.value[project.id] = status
                    if (status !== 'RUNNING') stopJobWatcher(project.id)
                } catch { /* noop */ }
            },
            onerror(err) { throw err },
        }).catch(() => { delete jobAbortControllers[project.id] })
    } catch {
        delete jobAbortControllers[project.id]
    }
}

watch(() => store.projects, (projects) => {
    const ids = new Set(projects.map((p) => p.id))
    for (const id of Object.keys(jobAbortControllers)) {
        if (!ids.has(id)) stopJobWatcher(id)
    }
    for (const project of projects) {
        const status = liveStatuses.value[project.id] ?? project.analysisStatus
        if (project.analysisJobId && (status === 'RUNNING' || status === null)) startJobWatcher(project)
    }
}, { immediate: true })

onUnmounted(() => {
    for (const id of Object.keys(jobAbortControllers)) stopJobWatcher(id)
})

const filterName    = ref('')
const onlyFavorites = ref(false)
const sortValue     = ref('name:asc')
const page          = ref(1)

const sortOptions = [
    { value: 'name:asc',        label: 'Nome (A-Z)' },
    { value: 'name:desc',       label: 'Nome (Z-A)' },
    { value: 'created_at:desc', label: 'Mais recentes' },
]

const hasMore = computed(() => store.projects.length === PAGE_SIZE)

function parsedSort() {
    const [orderBy, orderDir] = sortValue.value.split(':')
    return { orderBy, orderDir: orderDir as 'asc' | 'desc' }
}

async function load() {
    await store.fetchProjects({
        ...(filterName.value ? { name: filterName.value } : {}),
        ...(onlyFavorites.value ? { favorite: true } : {}),
        ...parsedSort(),
        page: page.value,
        pageSize: PAGE_SIZE,
    })
}

watch([filterName, onlyFavorites, sortValue], () => {
    page.value = 1
    load()
}, { immediate: true })

function onPageChange(delta: number) {
    page.value = Math.max(1, page.value + delta)
    load()
}

async function handleToggleFavorite(id: string) {
    await store.toggleFavorite(id)
}

// Delete
const confirmDelete = ref<{ id: string; name: string } | null>(null)
const deleting      = ref(false)

function handleDelete(id: string, name: string) {
    confirmDelete.value = { id, name }
}

async function confirmDeleteProject() {
    if (!confirmDelete.value) return
    deleting.value = true
    try {
        await store.deleteProject(confirmDelete.value.id)
        confirmDelete.value = null
    } finally {
        deleting.value = false
    }
}

// Analysis
const analysisFileInput    = ref<HTMLInputElement | null>(null)
const uploadingAnalysisId  = ref<string | null>(null)
const cancellingAnalysisId = ref<string | null>(null)
const analysisError        = ref<string | null>(null)

function triggerAnalysisUpload(id: string) {
    analysisError.value = null
    uploadingAnalysisId.value = id
    analysisFileInput.value?.click()
}

async function handleAnalysisFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file  = input.files?.[0]
    if (!file) { uploadingAnalysisId.value = null; return }
    if (!uploadingAnalysisId.value) return

    const projectId = uploadingAnalysisId.value
    try {
        await store.uploadAnalysis(projectId, file)
        await load()
        await router.push({ name: 'projects-form', params: { id: projectId }, query: { tab: 'analysis' } })
    } catch (err: any) {
        analysisError.value = err?.response?.data?.message ?? 'Serviço de análise indisponível. Tente novamente mais tarde.'
    } finally {
        uploadingAnalysisId.value = null
        input.value = ''
    }
}

async function handleCancelAnalysis(id: string) {
    cancellingAnalysisId.value = id
    try {
        await store.cancelAnalysis(id)
        stopJobWatcher(id)
        delete liveStatuses.value[id]
    } catch (err: any) {
        analysisError.value = err?.response?.data?.message ?? 'Não foi possível cancelar a análise'
    } finally {
        cancellingAnalysisId.value = null
    }
}
</script>

<template>
    <div class="font-encode space-y-6">

        <!-- Toolbar -->
        <div class="flex items-center gap-4 flex-wrap">

            <div class="flex items-baseline gap-2 shrink-0">
                <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Projetos</h1>
                <span class="text-[17px] text-gray-500">({{ store.projects.length }})</span>
            </div>

            <div class="flex-1" />

            <div v-if="store.projects.length > 0 || filterName || onlyFavorites" class="flex items-center gap-2">
                <button
                    :class="[
                        'relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none',
                        onlyFavorites ? 'bg-[#FFB23D]' : 'bg-gray-300 dark:bg-gray-600',
                    ]"
                    :aria-pressed="onlyFavorites"
                    aria-label="Apenas favoritos"
                    @click="onlyFavorites = !onlyFavorites"
                >
                    <span
                        :class="[
                            'absolute top-1.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-200',
                            onlyFavorites ? 'right-1.5' : 'left-1.5',
                        ]"
                    />
                </button>
                <span class="text-sm text-[#1C1930] dark:text-gray-300 select-none">Apenas favoritos</span>
            </div>

            <div v-if="store.projects.length > 0 || filterName || onlyFavorites" class="relative">
                <select
                    v-model="sortValue"
                    class="appearance-none pl-3 pr-8 py-2 text-sm text-[#1C1930] bg-white border border-[#717171] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/40 cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                >
                    <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <ChevronDown :size="14" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] dark:text-gray-400 pointer-events-none" />
            </div>

            <AppButton v-if="store.projects.length > 0 || filterName || onlyFavorites" :to="{ name: 'projects-form', params: { id: 'new' } }">
                <Plus :size="16" />
                Novo Projeto
            </AppButton>

        </div>

        <!-- Erro -->
        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
        >
            <div
                v-if="analysisError"
                class="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            >
                <span>{{ analysisError }}</span>
                <button class="shrink-0 text-red-400 hover:text-red-600 transition-colors" @click="analysisError = null">✕</button>
            </div>
        </Transition>

        <!-- Loading -->
        <div v-if="store.loading" class="py-20 flex justify-center">
            <div class="flex flex-col items-center gap-2 text-gray-400">
                <div class="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-emerald-600 rounded-full animate-spin" />
                <span class="text-sm">Carregando...</span>
            </div>
        </div>

        <!-- Vazio -->
        <div v-else-if="store.projects.length === 0" class="flex justify-center items-center py-20">
            <div class="w-[446px] flex flex-col items-center gap-4 text-center">
                <p class="text-xl font-semibold text-gray-900 dark:text-white">
                    {{ filterName || onlyFavorites ? 'Nenhum projeto encontrado' : 'Nenhum projeto' }}
                </p>
                <p class="text-sm text-[#717171] dark:text-gray-400">
                    {{ filterName || onlyFavorites ? 'Tente ajustar os filtros' : 'Clique no botão abaixo para criar o primeiro' }}
                </p>
                <AppButton v-if="!filterName && !onlyFavorites" :to="{ name: 'projects-form', params: { id: 'new' } }">
                    <Plus :size="16" />
                    Novo Projeto
                </AppButton>
            </div>
        </div>

        <!-- Grid de cards -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div
                v-for="project in store.projects"
                :key="project.id"
                class="group relative rounded-2xl border border-[#E4E4E4] dark:border-gray-700 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-200 overflow-hidden"
            >
                <!-- Capa -->
                <div class="relative h-[172px] overflow-hidden">
                    <img
                        v-if="project.photoUrl"
                        :src="project.photoUrl"
                        :alt="project.name"
                        class="w-full h-full object-cover"
                    />
                    <div
                        v-else
                        class="w-full h-full bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center"
                    >
                        <FolderOpen :size="36" class="text-white/30" />
                    </div>

                    <!-- Overlay gradiente inferior (legibilidade dos botões) -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                    <!-- Ações topo-direita: editar + excluir (visíveis no hover) -->
                    <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                        <RouterLink
                            :to="{ name: 'projects-form', params: { id: project.id } }"
                            class="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                            title="Editar projeto"
                        >
                            <Pencil :size="13" class="text-emerald-600" />
                        </RouterLink>
                        <button
                            class="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                            title="Excluir projeto"
                            @click.stop="handleDelete(project.id, project.name)"
                        >
                            <Trash2 :size="13" class="text-red-500" />
                        </button>
                    </div>

                    <!-- Botão favorito: baixo-esquerda -->
                    <button
                        class="absolute bottom-3 left-3 z-10 transition-transform hover:scale-110 focus:outline-none"
                        :title="project.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
                        @click.stop="handleToggleFavorite(project.id)"
                    >
                        <Star
                            :size="19"
                            stroke-width="1.8"
                            :class="project.favorite
                                ? 'fill-[#FFB23D] text-[#FFB23D] drop-shadow-sm'
                                : 'fill-transparent text-white drop-shadow-sm'"
                        />
                    </button>
                </div>

                <!-- Corpo do card -->
                <div class="bg-white dark:bg-gray-800 px-4 pt-3.5 pb-4">

                    <!-- Nome e cliente -->
                    <h3 class="font-bold text-gray-900 dark:text-white text-[16px] leading-snug truncate">
                        {{ project.name }}
                    </h3>
                    <p class="text-xs text-[#717171] dark:text-gray-400 truncate mt-0.5 mb-3.5">
                        {{ project.customerName }}
                    </p>

                    <!-- Seção de análise -->
                    <div class="pt-3 border-t border-[#F0F0F0] dark:border-gray-700">

                        <!-- Status desconhecido (jobId existe mas status ainda não chegou via SSE) -->
                        <div v-if="project.analysisJobId && effectiveStatus(project) === null" class="flex items-center gap-2">
                            <div class="w-3.5 h-3.5 border-2 border-emerald-200 dark:border-emerald-700 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin shrink-0" />
                            <span class="text-xs text-emerald-600 dark:text-emerald-400 truncate">Verificando...</span>
                        </div>

                        <!-- Em processamento (RUNNING) -->
                        <div v-else-if="project.analysisJobId && effectiveStatus(project) === 'RUNNING'" class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <div class="w-3.5 h-3.5 border-2 border-emerald-200 dark:border-emerald-700 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin shrink-0" />
                                <span class="text-xs text-emerald-600 dark:text-emerald-400 truncate">Analisando...</span>
                            </div>
                            <button
                                class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                                title="Cancelar análise"
                                :disabled="cancellingAnalysisId === project.id"
                                @click.stop="handleCancelAnalysis(project.id)"
                            >
                                <LoaderCircle v-if="cancellingAnalysisId === project.id" :size="13" class="animate-spin" />
                                <X v-else :size="13" />
                            </button>
                        </div>

                        <!-- Aguardando resposta (AWAITING_REPLY) -->
                        <div v-else-if="project.analysisJobId && effectiveStatus(project) === 'AWAITING_REPLY'" class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <span class="w-1.5 h-1.5 rounded-full bg-[#FFB23D] shrink-0" />
                                <span class="text-xs font-medium text-[#FFB23D] truncate">Aguardando resposta</span>
                            </div>
                            <div class="flex items-center gap-2.5 shrink-0">
                                <RouterLink
                                    :to="{ name: 'projects-form', params: { id: project.id }, query: { tab: 'analysis' } }"
                                    class="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                    @click.stop
                                >
                                    Responder
                                    <ChevronRight :size="13" class="-ml-0.5" />
                                </RouterLink>
                                <span class="text-gray-200 dark:text-gray-600 text-[10px] select-none">|</span>
                                <button
                                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Substituir análise"
                                    @click.stop="triggerAnalysisUpload(project.id)"
                                >
                                    <Upload :size="13" />
                                </button>
                                <span class="text-gray-200 dark:text-gray-600 text-[10px] select-none">|</span>
                                <button
                                    class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                                    title="Cancelar análise"
                                    :disabled="cancellingAnalysisId === project.id"
                                    @click.stop="handleCancelAnalysis(project.id)"
                                >
                                    <LoaderCircle v-if="cancellingAnalysisId === project.id" :size="13" class="animate-spin" />
                                    <X v-else :size="13" />
                                </button>
                            </div>
                        </div>

                        <!-- Análise disponível (DONE) -->
                        <div v-else-if="project.analysisJobId && effectiveStatus(project) === 'DONE'" class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                                <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">Análise disponível</span>
                            </div>
                            <div class="flex items-center gap-2.5 shrink-0">
                                <RouterLink
                                    :to="{ name: 'projects-form', params: { id: project.id }, query: { tab: 'analysis' } }"
                                    class="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                    @click.stop
                                >
                                    Ver
                                    <ChevronRight :size="13" class="-ml-0.5" />
                                </RouterLink>
                                <span class="text-gray-200 dark:text-gray-600 text-[10px] select-none">|</span>
                                <button
                                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Substituir análise"
                                    @click.stop="triggerAnalysisUpload(project.id)"
                                >
                                    <Upload :size="13" />
                                </button>
                            </div>
                        </div>

                        <!-- Análise com falha (FAILED) -->
                        <div v-else-if="project.analysisJobId && effectiveStatus(project) === 'FAILED'" class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <span class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                <span class="text-xs font-medium text-red-400 truncate">Falha na análise</span>
                            </div>
                            <button
                                class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                title="Tentar novamente"
                                @click.stop="triggerAnalysisUpload(project.id)"
                            >
                                <Upload :size="13" />
                            </button>
                        </div>

                        <!-- Sem análise -->
                        <button
                            v-else
                            class="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-[#DCDCDC] dark:border-gray-600 text-xs font-medium text-gray-400 dark:text-gray-500 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
                            :disabled="uploadingAnalysisId === project.id"
                            @click.stop="triggerAnalysisUpload(project.id)"
                        >
                            <LoaderCircle v-if="uploadingAnalysisId === project.id" :size="13" class="animate-spin" />
                            <template v-else>
                                <Upload :size="13" />
                                Upload de análise
                            </template>
                        </button>

                    </div>
                </div>
            </div>
        </div>

        <!-- Paginação -->
        <div v-if="store.projects.length > 0" class="flex items-center justify-end gap-2">
            <button
                :disabled="page === 1"
                class="px-3 py-1.5 rounded-lg text-sm border border-[#DCDCDC] bg-white text-[#1C1930] disabled:opacity-40 hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                @click="onPageChange(-1)"
            >
                Anterior
            </button>
            <span class="text-sm text-[#717171] dark:text-gray-400 px-2">{{ page }}</span>
            <button
                :disabled="!hasMore"
                class="px-3 py-1.5 rounded-lg text-sm border border-[#DCDCDC] bg-white text-[#1C1930] disabled:opacity-40 hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                @click="onPageChange(1)"
            >
                Próxima
            </button>
        </div>

    </div>

    <!-- Input oculto para upload de análise -->
    <input
        ref="analysisFileInput"
        type="file"
        accept=".pdf,image/*"
        class="hidden"
        @change="handleAnalysisFileChange"
        @cancel="uploadingAnalysisId = null"
    />

    <!-- Modal confirmação de exclusão -->
    <AppModal
        :open="!!confirmDelete"
        title="Remover projeto"
        @close="confirmDelete = null"
    >
        <template #icon>
            <div class="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center">
                <Trash2 :size="28" class="text-[#EDE9FF]" />
            </div>
        </template>

        <div class="text-sm text-center text-[#1C1930] dark:text-gray-300 space-y-1">
            <p>Essa ação removerá definitivamente o projeto:</p>
            <p class="font-bold">{{ confirmDelete?.name }}</p>
        </div>

        <template #footer>
            <button
                class="w-32 py-2.5 rounded-full text-sm border border-[#8C8B93] text-[#1C1930] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                :disabled="deleting"
                @click="confirmDelete = null"
            >
                Cancelar
            </button>
            <button
                class="w-32 py-2.5 rounded-full text-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors"
                :disabled="deleting"
                @click="confirmDeleteProject"
            >
                <span v-if="deleting">Confirmando…</span>
                <span v-else>Confirmar</span>
            </button>
        </template>
    </AppModal>

</template>
