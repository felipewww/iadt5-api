<script setup lang="ts">
import {Menu, LogOut, Sun, Moon} from '@lucide/vue'
import {useAuthStore} from '@/stores/auth'
import {useThemeStore} from '@/stores/theme'
import {useRouter} from 'vue-router'
import AppNotificationBell from '@/components/ui/AppNotificationBell.vue'

const emit = defineEmits<{'toggle-sidebar': []}>()

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()

function logout() {
    auth.logout()
    router.push({name: 'login'})
}
</script>

<template>
    <header
        class="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0"
    >
        <button
            @click="emit('toggle-sidebar')"
            class="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar"
        >
            <Menu class="w-5 h-5" />
        </button>

        <div class="flex items-center gap-4">
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ auth.user?.name }}</span>

            <AppNotificationBell />

            <button
                @click="theme.toggle()"
                class="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
                :aria-label="theme.theme === 'dark' ? 'Modo claro' : 'Modo escuro'"
            >
                <Sun v-if="theme.theme === 'dark'" class="w-4 h-4" />
                <Moon v-else class="w-4 h-4" />
            </button>

            <button
                @click="logout"
                class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                aria-label="Sair"
            >
                <LogOut class="w-4 h-4" />
                Sair
            </button>
        </div>
    </header>
</template>
