import client from '@/api/client'
import type { AppNotification } from '@/domain/notification'

export async function getNotificationToken(): Promise<string> {
    const { data } = await client.get<{ token: string }>('/notifications/token')
    return data.token
}

export async function getNotificationHistory(token: string, limit = 10): Promise<AppNotification[]> {
    const NOTIFICATIONS_URL = import.meta.env.VITE_NOTIFICATIONS_URL ?? 'http://localhost:3200'
    const res = await fetch(`${NOTIFICATIONS_URL}/history?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const items = await res.json() as Array<AppNotification & { createdAt: string }>
    return items.map(({ createdAt, ...rest }) => ({ ...rest, receivedAt: new Date(createdAt) }))
}
