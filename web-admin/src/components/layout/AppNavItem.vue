<script setup lang="ts">
import { computed, inject } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import type { NavItem } from '@/navigation'

const props = defineProps<{
    item: NavItem
    collapsed: boolean
}>()

const openFlyout = inject<(item: NavItem, event: MouseEvent) => void>('openFlyout')!
const currentFlyout = inject<() => NavItem | null>('currentFlyout')!

const route = useRoute()
const hasChildren = computed(() => !!props.item.children?.length)

function hasActiveDescendant(item: NavItem): boolean {
    if (item.to) return item.to === '/' ? route.path === '/' : route.path.startsWith(item.to)
    return item.children?.some(hasActiveDescendant) ?? false
}

const isDescendantActive = computed(() => hasActiveDescendant(props.item))
const isFlyoutOpen = computed(() => currentFlyout()?.label === props.item.label)
</script>

<template>
    <!-- Group item — abre flyout -->
    <div v-if="hasChildren" class="px-2">
        <button
            type="button"
            :title="collapsed ? item.label : undefined"
            :class="[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isFlyoutOpen || isDescendantActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800',
                collapsed ? 'justify-center' : '',
            ]"
            @click="(e) => openFlyout(item, e)"
        >
            <component :is="item.icon" class="w-5 h-5 shrink-0" />
            <span v-if="!collapsed" class="flex-1 text-left truncate">{{ item.label }}</span>
            <ChevronRight v-if="!collapsed" :size="14" class="shrink-0 text-gray-600" />
        </button>
    </div>

    <!-- Leaf item -->
    <RouterLink v-else :to="item.to!" custom v-slot="{ href, navigate, isActive }">
        <a
            :href="href"
            :title="collapsed ? item.label : undefined"
            :class="[
                'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800',
                collapsed ? 'justify-center' : '',
            ]"
            @click="navigate"
        >
            <component :is="item.icon" class="w-5 h-5 shrink-0" />
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        </a>
    </RouterLink>
</template>
