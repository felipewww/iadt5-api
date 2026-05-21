<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { navItems } from '@/navigation'
import type { NavItem } from '@/navigation'
import AppNavItem from '@/components/layout/AppNavItem.vue'
import AppSidebarFlyout from '@/components/layout/AppSidebarFlyout.vue'
import { usePermissions } from '@/composables/usePermissions'

const props = defineProps<{ collapsed: boolean }>()

const { hasModule } = usePermissions()

function filterItems(items: NavItem[]): NavItem[] {
    return items.reduce<NavItem[]>((acc, item) => {
        if (item.module !== undefined && !hasModule(item.module)) return acc

        if (item.children) {
            const filtered = filterItems(item.children)
            if (filtered.length === 0) return acc
            acc.push({ ...item, children: filtered })
        } else {
            acc.push(item)
        }

        return acc
    }, [])
}

const visibleNavItems = computed(() => filterItems(navItems))

const flyoutItem = ref<NavItem | null>(null)
const flyoutTop = ref(0)

function openFlyout(item: NavItem, event: MouseEvent) {
    if (flyoutItem.value?.label === item.label) {
        flyoutItem.value = null
        return
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    flyoutTop.value = rect.top
    flyoutItem.value = item
}

provide('openFlyout', openFlyout)
provide('currentFlyout', () => flyoutItem.value)

const sidebarWidth = computed(() => (props.collapsed ? 64 : 256))
</script>

<template>
    <aside
        :class="[
            'flex flex-col bg-gray-950 shrink-0 transition-all duration-300 ease-in-out',
            collapsed ? 'w-16' : 'w-64',
        ]"
    >
        <div
            :class="[
                'flex items-center h-16 px-4 border-b border-gray-800 overflow-hidden',
                collapsed ? 'justify-center' : 'justify-start',
            ]"
        >
            <span class="text-xl font-bold tracking-wide text-white">
                <span v-if="collapsed">C</span>
                <span v-else>Cognite</span>
            </span>
        </div>

        <nav class="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
            <AppNavItem
                v-for="item in visibleNavItems"
                :key="item.label"
                :item="item"
                :collapsed="collapsed"
            />
        </nav>
    </aside>

    <AppSidebarFlyout
        v-if="flyoutItem"
        :item="flyoutItem"
        :sidebar-width="sidebarWidth"
        :top="flyoutTop"
        @close="flyoutItem = null"
    />
</template>
