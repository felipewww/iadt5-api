<script setup lang="ts">
import { ref, type Component } from 'vue'
import { Bell, X, CheckCircle, XCircle, AlertTriangle, Info } from '@lucide/vue'
import { useNotifications } from '@/composables/useNotifications'
import type { AppNotification } from '@/domain/notification'

const { notifications, unread, markAllRead, fetchHistory } = useNotifications()
const open = ref(false)

function toggle() {
    open.value = !open.value
    if (open.value) {
        markAllRead()
        fetchHistory()
    }
}

const iconMap: Record<AppNotification['type'], Component> = {
    'job.done':   CheckCircle,
    'job.failed': XCircle,
    'alert':      AlertTriangle,
    'info':       Info,
}

const styleMap: Record<AppNotification['type'], { icon: string; dot: string }> = {
    'job.done':   { icon: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60', dot: 'bg-emerald-500' },
    'job.failed': { icon: 'text-red-500 bg-red-50 dark:bg-red-950/60',             dot: 'bg-red-500'     },
    'alert':      { icon: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60',       dot: 'bg-amber-500'   },
    'info':       { icon: 'text-blue-500 bg-blue-50 dark:bg-blue-950/60',          dot: 'bg-blue-500'    },
}

function formatTime(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60)    return 'agora'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
</script>

<template>
    <button
        @click="toggle"
        class="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notificações"
    >
        <Bell class="w-4 h-4" />
        <span
            v-if="unread > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-blue-500 rounded-full text-white text-[10px] font-semibold flex items-center justify-center leading-none"
        >
            {{ unread > 99 ? '99+' : unread }}
        </span>
    </button>

    <Teleport to="body">
        <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div v-if="open" class="fixed inset-0 bg-black/30 z-40" @click="open = false" />
        </Transition>

        <Transition
            enter-active-class="transition-transform duration-250 ease-out"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition-transform duration-200 ease-in"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
        >
            <div
                v-if="open"
                class="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col"
            >
                <!-- Header -->
                <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</span>
                        <span
                            v-if="notifications.length > 0"
                            class="text-xs text-gray-400 font-normal"
                        >
                            {{ notifications.length }}
                        </span>
                    </div>
                    <button
                        @click="open = false"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <!-- List -->
                <div class="flex-1 overflow-y-auto">
                    <div
                        v-if="notifications.length === 0"
                        class="flex flex-col items-center justify-center h-full gap-3 text-gray-400"
                    >
                        <Bell class="w-8 h-8 opacity-30" />
                        <p class="text-sm">Nenhuma notificação</p>
                    </div>

                    <div
                        v-for="(n, i) in notifications"
                        :key="i"
                        class="flex items-start gap-3.5 px-5 py-4 border-b border-gray-50 dark:border-gray-800/70 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
                    >
                        <!-- Icon -->
                        <div :class="['mt-0.5 p-2 rounded-xl shrink-0', styleMap[n.type].icon]">
                            <component :is="iconMap[n.type]" class="w-4 h-4" />
                        </div>

                        <!-- Content -->
                        <div class="flex-1 min-w-0 pt-0.5">
                            <div class="flex items-start justify-between gap-3">
                                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                                    {{ n.title }}
                                </p>
                                <span class="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 font-medium tabular-nums">
                                    {{ formatTime(n.receivedAt) }}
                                </span>
                            </div>
                            <p
                                v-if="n.message?.text"
                                class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed"
                            >
                                {{ n.message.text }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
