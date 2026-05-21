<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { loginApi } from '@/api/auth'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const auth = useAuthStore()
const router = useRouter()

async function onSubmit() {
    error.value = ''
    loading.value = true
    try {
        const data = await loginApi(username.value, password.value)
        auth.authorize(data)
        router.push({ name: 'home' })
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center px-4">
        <div class="w-full max-w-sm p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Entrar</h1>

            <div
                v-if="error"
                class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400"
            >
                {{ error }}
            </div>

            <form @submit.prevent="onSubmit" class="flex flex-col gap-4">
                <AppInput v-model="username" label="Usuário" autocomplete="username" required />
                <AppInput v-model="password" label="Senha" type="password" autocomplete="current-password" required />

                <AppButton type="submit" :disabled="loading" class="w-full mt-2">
                    {{ loading ? 'Entrando...' : 'Entrar' }}
                </AppButton>
            </form>
        </div>
    </div>
</template>
