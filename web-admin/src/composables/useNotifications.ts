import { ref } from 'vue'
import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source'
import { getNotificationToken, getNotificationHistory } from '@/api/notifications'
import type { AppNotification } from '@/domain/notification'

const NOTIFICATIONS_URL = import.meta.env.VITE_NOTIFICATIONS_URL ?? 'http://localhost:3200'

const notifications  = ref<AppNotification[]>([])
const unread         = ref(0)
const historyFetched = ref(false)
let controller: AbortController | null = null
let currentToken: string | null = null
let active = false

async function tryConnect(): Promise<void> {
    if (controller || !active) return

    controller = new AbortController()

    try {
        currentToken = await getNotificationToken()
    } catch {
        controller = null
        if (active) setTimeout(tryConnect, 5_000)
        return
    }

    fetchEventSource(`${NOTIFICATIONS_URL}/subscribe`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        signal: controller.signal,
        openWhenHidden: true,
        onmessage(ev: EventSourceMessage) {
            if (!ev.data) return
            try {
                const raw = JSON.parse(ev.data)
                const notification: AppNotification = { ...raw, receivedAt: new Date() }
                notifications.value.unshift(notification)
                unread.value++
            } catch { /* malformed */ }
        },
        onerror(err: Error) { throw err },
    }).catch(() => {
        controller = null
        if (active) setTimeout(tryConnect, 5_000)
    })
}

export function useNotifications() {
    function connect() {
        active = true
        tryConnect()
    }

    function disconnect() {
        active = false
        controller?.abort()
        controller = null
        currentToken = null
        notifications.value = []
        unread.value = 0
        historyFetched.value = false
    }

    function markAllRead() {
        unread.value = 0
    }

    async function fetchHistory(): Promise<void> {
        if (historyFetched.value) return
        historyFetched.value = true

        const token = currentToken ?? await getNotificationToken().catch(() => null)
        if (!token) return

        const history = await getNotificationHistory(token)
        // merge: SSE items já recebidos ficam no topo, histórico preenche o resto
        const existingTimes = new Set(notifications.value.map(n => n.receivedAt.getTime()))
        const fresh = history.filter(h => !existingTimes.has(h.receivedAt.getTime()))
        notifications.value = [...notifications.value, ...fresh]
    }

    return { notifications, unread, connect, disconnect, markAllRead, fetchHistory }
}
