<script setup lang="ts">
withDefaults(
    defineProps<{
        label?: string
        type?: string
        placeholder?: string
        required?: boolean
        disabled?: boolean
        autocomplete?: string
        error?: string
    }>(),
    { type: 'text', autocomplete: 'off' },
)

const model = defineModel<string>()
</script>

<template>
    <div class="flex flex-col gap-1">
        <label v-if="label" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ label }}
            <span v-if="required" class="text-red-400 ml-0.5">*</span>
        </label>
        <input
            v-model="model"
            :type="type"
            :placeholder="placeholder"
            :required="required"
            :disabled="disabled"
            :autocomplete="autocomplete"
            :class="[
                'w-full px-3 py-2 rounded-lg text-sm border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                disabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900/50'
                    : '',
                error
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500 focus:border-transparent',
            ]"
        />
        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
    </div>
</template>
