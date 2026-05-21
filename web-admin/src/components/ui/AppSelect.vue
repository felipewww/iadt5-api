<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import {
    SelectContent,
    SelectItem,
    SelectItemIndicator,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectViewport,
} from 'radix-vue'

defineProps<{
    options: { value: string; label: string }[]
    placeholder?: string
}>()

const model = defineModel<string>()
</script>

<template>
    <SelectRoot v-model="model">
        <SelectTrigger
            class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-32 cursor-pointer"
        >
            <SelectValue :placeholder="placeholder ?? 'Selecionar'" />
            <ChevronDown :size="14" class="text-gray-400 flex-shrink-0" />
        </SelectTrigger>
        <SelectPortal>
            <SelectContent
                position="popper"
                :side-offset="4"
                class="z-50 min-w-[var(--radix-select-trigger-width)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
            >
                <SelectViewport class="p-1">
                    <SelectItem
                        v-for="option in options"
                        :key="option.value"
                        :value="option.value"
                        class="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-200 cursor-pointer select-none outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700 data-[state=checked]:text-primary-600 dark:data-[state=checked]:text-primary-400"
                    >
                        <SelectItemIndicator>
                            <Check :size="13" />
                        </SelectItemIndicator>
                        <SelectItemText>{{ option.label }}</SelectItemText>
                    </SelectItem>
                </SelectViewport>
            </SelectContent>
        </SelectPortal>
    </SelectRoot>
</template>
