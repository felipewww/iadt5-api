<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue'

defineProps<{
    open: boolean
    title?: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
    <DialogRoot :open="open" @update:open="(v) => !v && emit('close')">
        <DialogPortal>
            <DialogOverlay
                class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[5px] transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
            />
            <DialogContent
                class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[582px] px-4
                       transition-all duration-200
                       data-[state=open]:opacity-100 data-[state=open]:scale-100
                       data-[state=closed]:opacity-0 data-[state=closed]:scale-95
                       focus:outline-none"
            >
                <!-- Ícone que protrai acima do box -->
                <div v-if="$slots.icon" class="flex justify-center">
                    <div class="relative z-10 mb-[-32px]">
                        <slot name="icon" />
                    </div>
                </div>

                <!-- Box branco -->
                <div class="bg-white dark:bg-gray-900 rounded-[8px] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] overflow-hidden"
                     :class="$slots.icon ? 'pt-10' : 'pt-6'"
                >
                    <DialogTitle
                        v-if="title"
                        class="text-center text-lg font-semibold text-gray-900 dark:text-white px-8 mb-4"
                    >
                        {{ title }}
                    </DialogTitle>

                    <!-- Divisor -->
                    <hr class="border-[#8C8B93] dark:border-gray-600 mx-8 mb-5" />

                    <!-- Conteúdo -->
                    <div class="px-8 pb-5">
                        <slot />
                    </div>

                    <!-- Actions -->
                    <div
                        v-if="$slots.footer"
                        class="flex items-center justify-center gap-4 px-8 py-5"
                    >
                        <slot name="footer" />
                    </div>
                </div>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>
