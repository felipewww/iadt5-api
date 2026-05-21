<script setup lang="ts">
import {ref} from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

const sidebarCollapsed = ref(false)
</script>

<template>
    <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <AppSidebar :collapsed="sidebarCollapsed" />

        <div class="flex flex-col flex-1 overflow-hidden">
            <AppHeader @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />

            <main class="flex-1 overflow-y-auto p-6">
                <slot />
            </main>
        </div>
    </div>
</template>
