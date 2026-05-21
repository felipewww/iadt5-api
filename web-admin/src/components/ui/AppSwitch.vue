<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'radix-vue'

defineProps<{ label?: string; disabled?: boolean }>()

const checked = defineModel<boolean>()
</script>

<template>
    <label class="flex items-center gap-3 cursor-pointer" :class="{ 'opacity-50 cursor-not-allowed': disabled }">
        <SwitchRoot
            v-model:checked="checked"
            :disabled="disabled"
            class="relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 data-[state=checked]:bg-primary-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
        >
            <SwitchThumb
                class="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform translate-x-1 data-[state=checked]:translate-x-5"
            />
        </SwitchRoot>
        <span v-if="label" class="text-sm text-gray-700 dark:text-gray-300 select-none">{{ label }}</span>
    </label>
</template>
