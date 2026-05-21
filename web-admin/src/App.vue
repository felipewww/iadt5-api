<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotifications } from '@/composables/useNotifications'

const route = useRoute()
const auth = useAuthStore()
const { connect, disconnect } = useNotifications()

const layout = computed(() =>
  route.meta.layout === 'dashboard' ? DashboardLayout : PublicLayout,
)

watch(() => auth.isAuthenticated, (authenticated) => {
    if (authenticated) connect()
    else disconnect()
}, { immediate: true })
</script>

<template>
  <component :is="layout">
    <router-view />
  </component>
</template>
