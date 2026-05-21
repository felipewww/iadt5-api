<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
    CircleCheckBig, Circle, LoaderCircle, CircleAlert,
    MessageSquare, Star, ThumbsUp, ThumbsDown, Lightbulb, Layers, Trash2, Upload,
} from '@lucide/vue'
import { useJobStream } from '@/composables/useJobStream'
import { useProjectsStore } from '@/stores/projects'

const props = defineProps<{
    projectId: string
    projectName: string
    jobId: string
    streamToken: string
}>()

const emit = defineEmits<{ cancelled: []; reupload: [] }>()

const store = useProjectsStore()
const { job, error: streamError } = useJobStream(props.jobId, props.streamToken)

const steps = computed(() => job.value?.result?.steps ?? [])
const jobStatus = computed(() => job.value?.status ?? 'RUNNING')

const ocrStep    = computed(() => steps.value.find((s) => s.name === 'ocr-extract'))
const waitStep   = computed(() => steps.value.find((s) => s.name === 'analyzer-awaiting-reply'))
const resultStep = computed(() => steps.value.find((s) => s.name === 'analyzer-result'))
const errorStep  = computed(() => steps.value.find((s) => s.name === 'analyzer-error'))

const failureMessage = computed(() =>
    errorStep.value?.data?.message ??
    'Ocorreu um erro durante a análise. Tente enviar o arquivo novamente.'
)

const isAwaiting = computed(() => jobStatus.value === 'RUNNING' && !!waitStep.value)
const isDone     = computed(() => jobStatus.value === 'DONE')
const isFailed   = computed(() => jobStatus.value === 'FAILED')

const questions = computed<string[]>(() => waitStep.value?.data?.questions ?? [])
const result    = computed(() => resultStep.value?.data ?? null)

const replyText     = ref('')
const replyLoading  = ref(false)
const replyError    = ref<string | null>(null)
const cancelLoading = ref(false)
const cancelError   = ref<string | null>(null)

async function cancelAnalysis() {
    cancelLoading.value = true
    cancelError.value = null
    try {
        await store.cancelAnalysis(props.projectId)
        emit('cancelled')
    } catch (err: any) {
        cancelError.value = err?.response?.data?.message ?? 'Não foi possível cancelar a análise'
    } finally {
        cancelLoading.value = false
    }
}

const replySent = computed(() => store.pendingReplyJobIds.has(props.jobId))

async function submitReply() {
    if (!replyText.value.trim() || replyLoading.value) return
    replyLoading.value = true
    replyError.value = null
    try {
        await store.replyAnalysis(props.projectId, props.jobId, replyText.value.trim())
        replyText.value = ''
    } catch (err: any) {
        replyError.value = err?.response?.data?.message ?? 'Erro ao enviar resposta'
    } finally {
        replyLoading.value = false
    }
}

watch(() => job.value?.result?.steps?.length, (newLen, oldLen) => {
    if (oldLen !== undefined && newLen !== oldLen) store.clearReplyPending(props.jobId)
})

type StageStatus = 'done' | 'running' | 'waiting' | 'paused'
interface Stage { label: string; status: StageStatus }

const stages = computed<Stage[]>(() => {
    const ocr    = !!ocrStep.value
    const llm    = !!waitStep.value || !!resultStep.value
    const done   = isDone.value
    const failed = isFailed.value
    return [
        { label: 'Upload recebido',         status: 'done' },
        { label: 'Extração de texto (OCR)', status: ocr ? 'done' : (failed ? 'waiting' : 'running') },
        { label: 'Análise de arquitetura',  status: llm ? (isAwaiting.value ? 'paused' : 'done') : (ocr ? 'running' : 'waiting') },
        { label: 'Avaliação final',         status: done ? 'done' : (llm && !isAwaiting.value ? 'running' : 'waiting') },
    ]
})

function scoreColor(score: number): string {
    if (score >= 8) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 6) return 'text-amber-500 dark:text-amber-400'
    return 'text-red-500 dark:text-red-400'
}
</script>

<template>
    <div class="space-y-6">

        <!-- Cancel button -->
        <div v-if="!isDone && !isFailed" class="flex justify-end">
            <button
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                :disabled="cancelLoading"
                @click="cancelAnalysis"
            >
                <LoaderCircle v-if="cancelLoading" :size="14" class="animate-spin" />
                <Trash2 v-else :size="14" />
                Cancelar análise
            </button>
        </div>

        <!-- Cancel error -->
        <div
            v-if="cancelError"
            class="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
            <CircleAlert :size="16" class="shrink-0" />
            {{ cancelError }}
        </div>

        <!-- Stream error -->
        <div
            v-if="streamError"
            class="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
            <CircleAlert :size="16" class="shrink-0" />
            {{ streamError }}
        </div>

        <!-- Connecting -->
        <div v-if="!job && !streamError" class="flex flex-col items-center gap-3 py-16 text-gray-400">
            <LoaderCircle :size="32" class="animate-spin" />
            <span class="text-sm">Conectando ao monitoramento...</span>
        </div>

        <template v-else-if="job">

            <!-- Stage pipeline -->
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 space-y-3">
                <div
                    v-for="(stage, i) in stages"
                    :key="i"
                    class="flex items-center gap-3"
                >
                    <div class="shrink-0 w-5 h-5 flex items-center justify-center">
                        <CircleCheckBig v-if="stage.status === 'done'"    :size="18" class="text-emerald-500" />
                        <LoaderCircle  v-else-if="stage.status === 'running'" :size="18" class="animate-spin text-emerald-600" />
                        <MessageSquare v-else-if="stage.status === 'paused'"  :size="18" class="text-amber-500" />
                        <Circle        v-else :size="18" class="text-gray-300 dark:text-gray-600" />
                    </div>
                    <span :class="[
                        'text-sm',
                        stage.status === 'done'    ? 'text-gray-700 dark:text-gray-200' :
                        stage.status === 'running' ? 'text-emerald-600 dark:text-emerald-400 font-medium' :
                        stage.status === 'paused'  ? 'text-amber-600 dark:text-amber-400 font-medium' :
                        'text-gray-400 dark:text-gray-500',
                    ]">{{ stage.label }}</span>
                </div>
            </div>

            <!-- Processing sent reply -->
            <div
                v-if="replySent"
                class="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800 px-4 py-3"
            >
                <LoaderCircle :size="16" class="animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span class="text-sm text-emerald-600 dark:text-emerald-400">Processando sua resposta...</span>
            </div>

            <!-- Questions panel -->
            <div
                v-else-if="isAwaiting"
                class="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-6 space-y-5"
            >
                <div class="flex items-center gap-2">
                    <MessageSquare :size="16" class="text-amber-600 dark:text-amber-400 shrink-0" />
                    <p class="text-sm font-semibold text-amber-700 dark:text-amber-300">A IA precisa de mais informações</p>
                </div>

                <ul class="space-y-3">
                    <li
                        v-for="(q, i) in questions"
                        :key="i"
                        class="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                        <span class="font-semibold text-amber-600 dark:text-amber-400 shrink-0">{{ i + 1 }}.</span>
                        <span>{{ q }}</span>
                    </li>
                </ul>

                <div class="space-y-3">
                    <textarea
                        v-model="replyText"
                        rows="5"
                        placeholder="Digite sua resposta..."
                        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 resize-none"
                        @keydown.ctrl.enter="submitReply"
                    />

                    <div v-if="replyError" class="text-xs text-red-600 dark:text-red-400">{{ replyError }}</div>

                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-400">Ctrl + Enter para enviar</span>
                        <button
                            :disabled="!replyText.trim() || replyLoading"
                            class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                            @click="submitReply"
                        >
                            <LoaderCircle v-if="replyLoading" :size="14" class="animate-spin" />
                            Enviar resposta
                        </button>
                    </div>
                </div>
            </div>

            <!-- Result panel -->
            <div v-if="isDone && result" class="space-y-6">

                <!-- Score card -->
                <div class="flex items-center gap-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-5">
                    <Star :size="32" class="text-emerald-600 shrink-0" />
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Pontuação da arquitetura</p>
                        <p class="text-3xl font-bold" :class="scoreColor(result.score)">
                            {{ result.score }}<span class="text-lg font-normal text-gray-400">/10</span>
                        </p>
                    </div>
                    <div class="ml-auto text-right">
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Componentes</p>
                        <p class="text-2xl font-semibold text-gray-800 dark:text-gray-200">{{ result.components_count }}</p>
                    </div>
                </div>

                <!-- Summary -->
                <div>
                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Resumo executivo</p>
                    <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{{ result.summary }}</p>
                </div>

                <!-- Strengths + Weaknesses side by side -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <!-- Strengths -->
                    <div v-if="result.strengths?.length">
                        <div class="flex items-center gap-1.5 mb-3">
                            <ThumbsUp :size="14" class="text-emerald-500" />
                            <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Pontos fortes</p>
                        </div>
                        <ul class="space-y-2">
                            <li
                                v-for="(s, i) in result.strengths"
                                :key="i"
                                class="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                            >
                                <span class="text-emerald-500 shrink-0 mt-0.5">•</span>
                                <span>{{ s }}</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Weaknesses -->
                    <div v-if="result.weaknesses?.length">
                        <div class="flex items-center gap-1.5 mb-3">
                            <ThumbsDown :size="14" class="text-red-500" />
                            <p class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Pontos fracos</p>
                        </div>
                        <ul class="space-y-2">
                            <li
                                v-for="(w, i) in result.weaknesses"
                                :key="i"
                                class="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                            >
                                <span class="text-red-500 shrink-0 mt-0.5">•</span>
                                <span>{{ w }}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Recommendations -->
                <div v-if="result.recommendations?.length">
                    <div class="flex items-center gap-1.5 mb-3">
                        <Lightbulb :size="14" class="text-amber-500" />
                        <p class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Recomendações</p>
                    </div>
                    <ul class="space-y-2">
                        <li
                            v-for="(r, i) in result.recommendations"
                            :key="i"
                            class="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                            <span class="text-amber-500 shrink-0 mt-0.5">•</span>
                            <span>{{ r }}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Failed -->
            <div v-if="isFailed" class="space-y-3">
                <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <CircleAlert :size="16" class="shrink-0 mt-0.5" />
                    <span>{{ failureMessage }}</span>
                </div>
                <div class="flex justify-end">
                    <button
                        class="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        @click="emit('reupload')"
                    >
                        <Upload :size="14" />
                        Nova análise
                    </button>
                </div>
            </div>

            <!-- Running, no steps yet -->
            <div
                v-if="jobStatus === 'RUNNING' && !isAwaiting && !ocrStep"
                class="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500"
            >
                <Layers :size="16" class="shrink-0" />
                Processando o arquivo... isso pode levar alguns instantes.
            </div>

        </template>

    </div>
</template>
