<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

withDefaults(
    defineProps<{
        variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
        size?: 'sm' | 'md' | 'lg'
        type?: 'button' | 'submit' | 'reset'
        disabled?: boolean
        to?: RouteLocationRaw
    }>(),
    { variant: 'primary', size: 'md', type: 'button' },
)
</script>

<template>
    <component
        :is="to ? RouterLink : 'button'"
        :to="to"
        :type="to ? undefined : type"
        :disabled="to ? undefined : disabled"
        :class="[
            'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            {
                'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600': variant === 'primary',
                'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-300': variant === 'secondary',
                'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-300': variant === 'ghost',
                'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
            },
            {
                'text-sm px-3 py-1.5': size === 'sm',
                'text-base px-4 py-2': size === 'md',
                'text-lg px-6 py-3': size === 'lg',
            },
        ]"
    >
        <slot />
    </component>
</template>
