<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = defineProps<{
    page: number
    hasMore: boolean
}>()

const emit = defineEmits<{ change: [page: number] }>()

const visible = computed(() => props.page > 1 || props.hasMore)
</script>

<template>
    <div v-if="visible" class="flex items-center justify-center gap-2 pt-2">
        <button
            :disabled="page === 1"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="emit('change', page - 1)"
        >
            <ChevronLeft :size="15" />
            Anterior
        </button>

        <span class="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 min-w-16 text-center">
            Página {{ page }}
        </span>

        <button
            :disabled="!hasMore"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="emit('change', page + 1)"
        >
            Próxima
            <ChevronRight :size="15" />
        </button>
    </div>
</template>
