import {defineStore} from 'pinia'
import {ref, watch} from 'vue'

type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
    const stored = localStorage.getItem('theme') as Theme | null
    const theme = ref<Theme>(stored ?? 'dark')

    function apply(t: Theme) {
        document.documentElement.classList.toggle('dark', t === 'dark')
    }

    function toggle() {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    watch(theme, (t) => {
        apply(t)
        localStorage.setItem('theme', t)
    }, {immediate: true})

    return {theme, toggle}
})
