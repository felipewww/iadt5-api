import { useAuthStore } from '@/stores/auth'

export function usePermissions() {
    const auth = useAuthStore()

    function hasModule(moduleId: number): boolean {
        if (!auth.user) return false
        if (auth.user.root) return true
        return auth.user.acs.some((p) => p.startsWith(`${moduleId}:`))
    }

    function can(moduleId: number, action: number): boolean {
        if (!auth.user) return false
        if (auth.user.root) return true
        return auth.user.acs.includes(`${moduleId}:${action}`)
    }

    return { hasModule, can }
}
