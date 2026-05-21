<script setup lang="ts">
import { Check } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'radix-vue'

defineProps<{ disabled?: boolean }>()

const checked = defineModel<boolean>()
</script>

<template>
    <CheckboxRoot
        v-model:checked="checked"
        :disabled="disabled"
        class="w-4 h-4 flex-shrink-0 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
        <CheckboxIndicator class="text-white">
            <Check :size="11" :stroke-width="3" />
        </CheckboxIndicator>
    </CheckboxRoot>
</template>
