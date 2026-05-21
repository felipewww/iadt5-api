import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { refreshApi } from '@/api/auth'

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
})

let isRefreshing = false
let pendingResolvers: (() => void)[] = []

async function doRefresh(): Promise<void> {
    const auth = useAuthStore()
    try {
        const data = await refreshApi(auth.getAccessToken()!, auth.getRefreshToken()!)
        auth.authorize(data)
        setTimeout(() => {
            pendingResolvers.forEach((fn) => fn())
            pendingResolvers = []
        }, 1)
    } catch {
        auth.logout()
        pendingResolvers = []
        window.location.href = '/login'
    }
}

client.interceptors.request.use(async (config) => {
    const auth = useAuthStore()

    if (auth.isAuthenticated && Date.now() >= auth.expiration * 1000) {
        if (!isRefreshing) {
            isRefreshing = true
            await doRefresh()
            isRefreshing = false
        }
        await new Promise<void>((resolve) => pendingResolvers.push(resolve))
    }

    const token = auth.getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

client.interceptors.response.use(
    (res) => {
        res.data = res.data?.data ?? res.data
        return res
    },
    async (error) => {
        const originalRequest = error.config
        const status = error.response?.status

        if ((status === 401 || status === 403) && !originalRequest._retry) {
            originalRequest._retry = true

            if (!isRefreshing) {
                isRefreshing = true
                await doRefresh()
                isRefreshing = false
            }
            await new Promise<void>((resolve) => pendingResolvers.push(resolve))
            return client(originalRequest)
        }

        const message = error.response?.data?.message ?? error.message
        const err: any = new Error(Array.isArray(message) ? message[0] : message)
        err.response = { status, data: error.response?.data }
        return Promise.reject(err)
    },
)

export default client
