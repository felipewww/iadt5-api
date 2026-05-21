import axios from 'axios'
import type { LoginOutput } from '@/domain/auth'

const authClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
})

authClient.interceptors.response.use((res) => {
    res.data = res.data?.data ?? res.data
    return res
})

export async function loginApi(username: string, password: string): Promise<LoginOutput> {
    const res = await authClient.post<LoginOutput>('/auth/login', { username, password })
    return res.data
}

export async function refreshApi(accessToken: string, refreshToken: string): Promise<LoginOutput> {
    const res = await authClient.post<LoginOutput>('/auth/refresh', null, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-rt': refreshToken,
        },
    })
    return res.data
}
