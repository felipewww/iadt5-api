<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Calendar, CalendarCheck2, Trash2, ImagePlus, ArrowLeft, Upload, LoaderCircle } from '@lucide/vue'
import { projectsApi } from '@/api/projects'
import { useProjectsStore } from '@/stores/projects'
import ProjectAnalysisTab from '@/components/projects/ProjectAnalysisTab.vue'
import AppFormPage from '@/components/layout/AppFormPage.vue'
import type { ProjectOutput, AnalysisUploadOutput } from '@/domain/projects'

const route  = useRoute()
const router = useRouter()
const store  = useProjectsStore()

const isNew      = computed(() => route.params.id === 'new')
const projectId  = computed(() => route.params.id as string)
const pageTitle  = computed(() => isNew.value ? 'Novo Projeto' : 'Editar Projeto')

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'settings' | 'analysis'
const activeTab = ref<Tab>((route.query.tab as string) === 'analysis' ? 'analysis' : 'settings')

// ── Form ──────────────────────────────────────────────────────────────────────
const form   = ref({ name: '', customerName: '', dateStart: '', dateEnd: '' })
const errors = ref({ name: '', customerName: '', dateStart: '', dateEnd: '' })

const coverFile     = ref<File | null>(null)
const coverPreview  = ref<string | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)

const loading     = ref(route.params.id as string !== 'new')
const submitting  = ref(false)
const submitError = ref<string | null>(null)

// ── Analysis state ─────────────────────────────────────────────────────────────
const projectData          = ref<ProjectOutput | null>(null)
const analysisToken        = ref<AnalysisUploadOutput | null>(null)
const analysisTokenLoading = ref(false)
const analysisTokenError   = ref<string | null>(null)
const noAnalysis           = ref(false)
const analysisFileInput    = ref<HTMLInputElement | null>(null)
const uploadingAnalysis    = ref(false)
const uploadError          = ref<string | null>(null)

async function fetchAnalysisToken() {
    if (analysisToken.value || analysisTokenLoading.value || !projectData.value) return
    analysisTokenLoading.value = true
    analysisTokenError.value = null
    noAnalysis.value = false
    try {
        analysisToken.value = await store.getAnalysisToken(projectId.value)
    } catch (err: any) {
        if (err?.response?.status === 404) {
            noAnalysis.value = true
        } else {
            analysisTokenError.value = 'Não foi possível carregar a análise'
        }
    } finally {
        analysisTokenLoading.value = false
    }
}

function switchTab(tab: Tab) {
    activeTab.value = tab
}

watch([activeTab, projectData], ([tab, data]) => {
    if (tab === 'analysis' && data) fetchAnalysisToken()
})

function onAnalysisCancelled() {
    analysisToken.value = null
    noAnalysis.value = true
}

function triggerAnalysisUpload() {
    uploadError.value = null
    analysisFileInput.value?.click()
}

async function handleAnalysisFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file  = input.files?.[0]
    if (!file) return
    uploadingAnalysis.value = true
    uploadError.value = null
    try {
        const result = await store.uploadAnalysis(projectId.value, file)
        analysisToken.value = result
        noAnalysis.value = false
    } catch (err: any) {
        uploadError.value = err?.response?.data?.message ?? 'Erro ao enviar análise'
    } finally {
        uploadingAnalysis.value = false
        input.value = ''
    }
}

// ── Load project ──────────────────────────────────────────────────────────────
onMounted(async () => {
    if (isNew.value) return
    loading.value = true
    try {
        const project = await projectsApi.get(projectId.value)
        form.value.name         = project.name
        form.value.customerName = project.customerName
        form.value.dateStart    = project.dateStart.slice(0, 10)
        form.value.dateEnd      = project.dateEnd.slice(0, 10)
        coverPreview.value      = project.photoUrl
        projectData.value       = project
    } finally {
        loading.value = false
    }
})

// ── Cover ─────────────────────────────────────────────────────────────────────
function onCoverChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    coverFile.value    = file
    coverPreview.value = URL.createObjectURL(file)
}

function removeCover() {
    coverFile.value    = null
    coverPreview.value = null
    if (coverInputRef.value) coverInputRef.value.value = ''
}

// ── Submit ────────────────────────────────────────────────────────────────────
function validate() {
    errors.value = { name: '', customerName: '', dateStart: '', dateEnd: '' }
    let ok = true
    if (!form.value.name.trim())         { errors.value.name         = 'Campo obrigatório'; ok = false }
    if (!form.value.customerName.trim()) { errors.value.customerName = 'Campo obrigatório'; ok = false }
    if (!form.value.dateStart)           { errors.value.dateStart    = 'Campo obrigatório'; ok = false }
    if (!form.value.dateEnd)             { errors.value.dateEnd      = 'Campo obrigatório'; ok = false }
    return ok
}

async function submit() {
    if (!validate()) return
    submitting.value  = true
    submitError.value = null
    try {
        const payload = {
            name: form.value.name,
            customerName: form.value.customerName,
            dateStart: form.value.dateStart,
            dateEnd: form.value.dateEnd,
        }
        let project
        if (isNew.value) {
            project = await store.createProject(payload)
        } else {
            project = await store.updateProject(projectId.value, payload)
        }
        if (coverFile.value && project) {
            await projectsApi.uploadCover(project.id, coverFile.value)
        }
        await router.push({ name: 'projects' })
    } catch {
        submitError.value = 'Ocorreu um erro ao salvar. Tente novamente.'
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <AppFormPage class="font-encode">

        <!-- Back + título -->
        <div class="flex items-center gap-3">
            <RouterLink
                :to="{ name: 'projects' }"
                class="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <ArrowLeft :size="20" />
            </RouterLink>
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="py-20 flex justify-center">
            <div class="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-emerald-600 rounded-full animate-spin" />
        </div>

        <template v-else>

            <!-- Tabs (edit mode only) -->
            <div v-if="!isNew" class="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    :class="[
                        'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'settings'
                            ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                    ]"
                    @click="switchTab('settings')"
                >
                    Configurações
                </button>
                <button
                    :class="[
                        'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'analysis'
                            ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                    ]"
                    @click="switchTab('analysis')"
                >
                    Análise
                </button>
            </div>

            <!-- ── Settings tab ─────────────────────────────────────────── -->
            <div v-show="activeTab === 'settings'">
                <form class="space-y-6" @submit.prevent="submit" novalidate>

                    <!-- Nome do Projeto -->
                    <div class="space-y-1.5">
                        <div class="flex items-baseline gap-2">
                            <label class="text-lg font-medium text-gray-700 dark:text-gray-300">Nome do Projeto</label>
                            <span class="text-sm text-gray-400 dark:text-gray-500">(obrigatório)</span>
                        </div>
                        <input
                            v-model="form.name"
                            type="text"
                            placeholder="Ex.: Redesign do site"
                            :class="[
                                'w-full h-10 px-4 rounded-lg text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800',
                                'placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors',
                                'focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600',
                                errors.name ? 'border-2 border-red-400' : 'border border-gray-300 dark:border-gray-600',
                            ]"
                        />
                        <p v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</p>
                    </div>

                    <!-- Nome do Cliente -->
                    <div class="space-y-1.5">
                        <div class="flex items-baseline gap-2">
                            <label class="text-lg font-medium text-gray-700 dark:text-gray-300">Nome do Cliente</label>
                            <span class="text-sm text-gray-400 dark:text-gray-500">(obrigatório)</span>
                        </div>
                        <input
                            v-model="form.customerName"
                            type="text"
                            placeholder="Ex.: Acme Corp"
                            :class="[
                                'w-full h-10 px-4 rounded-lg text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800',
                                'placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors',
                                'focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600',
                                errors.customerName ? 'border-2 border-red-400' : 'border border-gray-300 dark:border-gray-600',
                            ]"
                        />
                        <p v-if="errors.customerName" class="text-xs text-red-500">{{ errors.customerName }}</p>
                    </div>

                    <!-- Datas -->
                    <div class="grid grid-cols-2 gap-10">
                        <!-- Data de Início -->
                        <div class="space-y-1.5">
                            <div class="flex items-baseline gap-2">
                                <label class="text-lg font-medium text-gray-700 dark:text-gray-300">Data de Início</label>
                                <span class="text-sm text-gray-400 dark:text-gray-500">(obrigatório)</span>
                            </div>
                            <div class="relative">
                                <input
                                    v-model="form.dateStart"
                                    type="date"
                                    :class="[
                                        'w-full h-10 pl-4 pr-10 rounded-lg text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800',
                                        'transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600',
                                        'dark:[color-scheme:dark]',
                                        errors.dateStart ? 'border-2 border-red-400' : 'border border-gray-300 dark:border-gray-600',
                                    ]"
                                />
                                <Calendar :size="18" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <p v-if="errors.dateStart" class="text-xs text-red-500">{{ errors.dateStart }}</p>
                        </div>

                        <!-- Data de Término -->
                        <div class="space-y-1.5">
                            <div class="flex items-baseline gap-2">
                                <label class="text-lg font-medium text-gray-700 dark:text-gray-300">Data de Término</label>
                                <span class="text-sm text-gray-400 dark:text-gray-500">(obrigatório)</span>
                            </div>
                            <div class="relative">
                                <input
                                    v-model="form.dateEnd"
                                    type="date"
                                    :class="[
                                        'w-full h-10 pl-4 pr-10 rounded-lg text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800',
                                        'transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600',
                                        'dark:[color-scheme:dark]',
                                        errors.dateEnd ? 'border-2 border-red-400' : 'border border-gray-300 dark:border-gray-600',
                                    ]"
                                />
                                <CalendarCheck2 :size="18" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <p v-if="errors.dateEnd" class="text-xs text-red-500">{{ errors.dateEnd }}</p>
                        </div>
                    </div>

                    <!-- Foto de capa -->
                    <div class="space-y-1.5">
                        <label class="text-lg font-medium text-gray-700 dark:text-gray-300">Foto de capa</label>

                        <input
                            ref="coverInputRef"
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="onCoverChange"
                        />

                        <div v-if="coverPreview" class="relative rounded-lg overflow-hidden">
                            <img :src="coverPreview" alt="Foto de capa" class="w-full h-[340px] object-cover rounded-lg" />
                            <button
                                type="button"
                                class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                                title="Remover foto"
                                @click="removeCover"
                            >
                                <Trash2 :size="16" class="text-gray-500" />
                            </button>
                        </div>

                        <button
                            v-else
                            type="button"
                            class="w-full h-[200px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            @click="coverInputRef?.click()"
                        >
                            <ImagePlus :size="28" class="text-gray-400" />
                            <span class="text-sm text-gray-400 dark:text-gray-500">Clique para adicionar uma foto de capa</span>
                        </button>
                    </div>

                    <p v-if="submitError" class="text-sm text-center text-red-500">{{ submitError }}</p>

                    <button
                        type="submit"
                        :disabled="submitting"
                        class="w-full h-[52px] rounded-[26px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xl font-normal transition-colors flex items-center justify-center gap-2"
                    >
                        <div v-if="submitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{{ isNew ? 'Criar Projeto' : 'Salvar Alterações' }}</span>
                    </button>

                </form>
            </div>

            <!-- ── Analysis tab ─────────────────────────────────────────── -->
            <div v-if="!isNew && activeTab === 'analysis'" class="space-y-6 pb-8">

                <!-- Loading token -->
                <div v-if="analysisTokenLoading" class="flex flex-col items-center gap-3 py-16 text-gray-400">
                    <div class="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-emerald-600 rounded-full animate-spin" />
                    <span class="text-sm">Carregando análise...</span>
                </div>

                <!-- No analysis yet (API returned 404 or cancelled) -->
                <div v-else-if="noAnalysis" class="flex flex-col items-center gap-4 py-20 text-center">
                    <p class="text-base font-medium text-gray-700 dark:text-gray-300">Nenhuma análise iniciada</p>
                    <p class="text-sm text-gray-400">Envie um diagrama de arquitetura para começar</p>
                    <button
                        class="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-400 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
                        :disabled="uploadingAnalysis"
                        @click="triggerAnalysisUpload"
                    >
                        <LoaderCircle v-if="uploadingAnalysis" :size="14" class="animate-spin" />
                        <Upload v-else :size="14" />
                        Upload de análise
                    </button>
                    <p v-if="uploadError" class="text-sm text-red-500">{{ uploadError }}</p>
                </div>

                <!-- Token error -->
                <div
                    v-else-if="analysisTokenError"
                    class="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300"
                >
                    {{ analysisTokenError }}
                </div>

                <!-- Analysis content -->
                <ProjectAnalysisTab
                    v-else-if="analysisToken"
                    :key="analysisToken.jobId"
                    :project-id="projectId"
                    :project-name="form.name"
                    :job-id="analysisToken.jobId"
                    :stream-token="analysisToken.streamToken"
                    @cancelled="onAnalysisCancelled"
                />

            </div>

        </template>
    </AppFormPage>

    <!-- Hidden file inputs -->
    <input
        ref="analysisFileInput"
        type="file"
        accept=".pdf,image/*"
        class="hidden"
        @change="handleAnalysisFileChange"
        @cancel="uploadingAnalysis = false"
    />
</template>
