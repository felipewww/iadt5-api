import { ref, onUnmounted } from 'vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { JobOutput } from '@/domain/projects'

const JOBS_URL = import.meta.env.VITE_JOBS_URL ?? 'http://localhost:3100'

export function useJobStream(jobId: string, token: string) {
    const job = ref<JobOutput | null>(null)
    const error = ref<string | null>(null)
    let ctrl: AbortController | null = new AbortController()

    fetchEventSource(`${JOBS_URL}/jobs/${jobId}/stream?token=${encodeURIComponent(token)}`, {
        signal: ctrl.signal,
        openWhenHidden: true,
        onmessage(ev) {
            if (!ev.data || ev.event === 'error') return
            try { job.value = JSON.parse(ev.data) as JobOutput } catch { /* noop */ }
        },
        onerror(err) { throw err },
    }).catch(() => {
        if (!ctrl?.signal.aborted) error.value = 'Erro ao conectar ao serviço de monitoramento'
        ctrl = null
    })

    onUnmounted(() => {
        ctrl?.abort()
        ctrl = null
    })

    return { job, error }
}
