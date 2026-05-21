import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LoginOutput, TokenUser } from '@/domain/auth'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<TokenUser | null>(null)
    const isAuthenticated = ref(false)
    const accessToken = ref<string | null>(null)
    const refreshToken = ref<string | null>(null)
    const expiration = ref<number>(0)

    function authorize(data: LoginOutput) {
        accessToken.value = data.accessToken
        refreshToken.value = data.refreshToken
        expiration.value = data.accessTokenExp
        user.value = data.payload
        isAuthenticated.value = true

        localStorage.setItem('auth_access', data.accessToken)
        localStorage.setItem('auth_refresh', data.refreshToken)
        localStorage.setItem('auth_exp', String(data.accessTokenExp))
        localStorage.setItem('auth_user', JSON.stringify(data.payload))
    }

    function verifyAuth(): boolean {
        if (isAuthenticated.value) return true

        const storedAccess = localStorage.getItem('auth_access')
        const storedRefresh = localStorage.getItem('auth_refresh')
        const storedExp = localStorage.getItem('auth_exp')
        const storedUser = localStorage.getItem('auth_user')

        if (!storedAccess || !storedRefresh || !storedUser) return false

        try {
            accessToken.value = storedAccess
            refreshToken.value = storedRefresh
            expiration.value = Number(storedExp ?? 0)
            user.value = JSON.parse(storedUser) as TokenUser
            isAuthenticated.value = true
            return true
        } catch {
            logout()
            return false
        }
    }

    function logout() {
        user.value = null
        isAuthenticated.value = false
        accessToken.value = null
        refreshToken.value = null
        expiration.value = 0
        localStorage.removeItem('auth_access')
        localStorage.removeItem('auth_refresh')
        localStorage.removeItem('auth_exp')
        localStorage.removeItem('auth_user')
    }

    function getAccessToken() {
        return accessToken.value
    }

    function getRefreshToken() {
        return refreshToken.value
    }

    return { user, isAuthenticated, expiration, authorize, verifyAuth, logout, getAccessToken, getRefreshToken }
})
