<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { NavItem } from '@/navigation'

const props = defineProps<{
    item: NavItem
    sidebarWidth: number
    top: number
}>()

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const removeAfterEach = router.afterEach(() => emit('close'))
onUnmounted(() => removeAfterEach())

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

type ItemColor = { bg: string; text: string; activeBg: string; activeText: string }

const itemColors: ItemColor[] = [
    { bg: 'bg-blue-500/15 group-hover:bg-blue-500/25', text: 'text-blue-400', activeBg: 'bg-blue-500/30', activeText: 'text-blue-300' },
    { bg: 'bg-violet-500/15 group-hover:bg-violet-500/25', text: 'text-violet-400', activeBg: 'bg-violet-500/30', activeText: 'text-violet-300' },
    { bg: 'bg-emerald-500/15 group-hover:bg-emerald-500/25', text: 'text-emerald-400', activeBg: 'bg-emerald-500/30', activeText: 'text-emerald-300' },
    { bg: 'bg-orange-500/15 group-hover:bg-orange-500/25', text: 'text-orange-400', activeBg: 'bg-orange-500/30', activeText: 'text-orange-300' },
    { bg: 'bg-pink-500/15 group-hover:bg-pink-500/25', text: 'text-pink-400', activeBg: 'bg-pink-500/30', activeText: 'text-pink-300' },
    { bg: 'bg-teal-500/15 group-hover:bg-teal-500/25', text: 'text-teal-400', activeBg: 'bg-teal-500/30', activeText: 'text-teal-300' },
    { bg: 'bg-amber-500/15 group-hover:bg-amber-500/25', text: 'text-amber-400', activeBg: 'bg-amber-500/30', activeText: 'text-amber-300' },
]

const fallbackColor: ItemColor = itemColors[0] as ItemColor

let colorIndex = 0
const leafColorMap = new Map<string, ItemColor>()

function getLeafColor(label: string): ItemColor {
    if (!leafColorMap.has(label)) {
        leafColorMap.set(label, itemColors[colorIndex % itemColors.length] ?? fallbackColor)
        colorIndex++
    }
    return leafColorMap.get(label) ?? fallbackColor
}

// Collect all leaf items in order for consistent color assignment
function collectLeaves(items: NavItem[]): NavItem[] {
    return items.flatMap((item) => (item.children ? collectLeaves(item.children) : [item]))
}

// Pre-assign colors in order
collectLeaves(props.item.children ?? []).forEach((leaf) => getLeafColor(leaf.label))
</script>

<template>
    <Teleport to="body">
        <!-- Backdrop -->
        <div class="fixed inset-0 z-40" @click="emit('close')" />

        <!-- Painel -->
        <div
            class="fixed z-50 rounded-xl bg-gray-800/95 backdrop-blur-sm border border-gray-700/60 shadow-2xl min-w-52 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
            :style="{ left: `${sidebarWidth + 8}px`, top: `${top}px` }"
        >
            <!-- Conteúdo -->
            <nav class="overflow-y-auto p-2 space-y-3">
                <template v-for="child in item.children" :key="child.label">
                    <!-- Seção com sub-itens -->
                    <div v-if="child.children?.length">
                        <div class="flex items-center gap-2 px-2 mb-2 mt-1">
                            <component :is="child.icon" :size="14" class="text-gray-400 shrink-0" />
                            <p class="text-sm font-semibold text-gray-200">{{ child.label }}</p>
                        </div>
                        <RouterLink
                            v-for="leaf in child.children"
                            :key="leaf.label"
                            :to="leaf.to!"
                            custom
                            v-slot="{ navigate, isActive }"
                        >
                            <button
                                type="button"
                                :class="[
                                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all group text-left',
                                    isActive
                                        ? 'bg-gray-700/80'
                                        : 'hover:bg-gray-700/50',
                                ]"
                                @click="navigate"
                            >
                                <div
                                    :class="[
                                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                        isActive
                                            ? getLeafColor(leaf.label).activeBg + ' ' + getLeafColor(leaf.label).activeText
                                            : getLeafColor(leaf.label).bg + ' ' + getLeafColor(leaf.label).text,
                                    ]"
                                >
                                    <component :is="leaf.icon" :size="14" />
                                </div>
                                <span
                                    :class="[
                                        'text-sm font-medium transition-colors',
                                        isActive ? 'text-white' : 'text-gray-300 group-hover:text-white',
                                    ]"
                                >
                                    {{ leaf.label }}
                                </span>
                            </button>
                        </RouterLink>
                    </div>

                    <!-- Link direto (sem agrupamento) -->
                    <RouterLink
                        v-else-if="child.to"
                        :to="child.to"
                        custom
                        v-slot="{ navigate, isActive }"
                    >
                        <button
                            type="button"
                            :class="[
                                'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all group text-left',
                                isActive ? 'bg-gray-700/80' : 'hover:bg-gray-700/50',
                            ]"
                            @click="navigate"
                        >
                            <div
                                :class="[
                                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    isActive
                                        ? getLeafColor(child.label).activeBg + ' ' + getLeafColor(child.label).activeText
                                        : getLeafColor(child.label).bg + ' ' + getLeafColor(child.label).text,
                                ]"
                            >
                                <component :is="child.icon" :size="14" />
                            </div>
                            <span
                                :class="[
                                    'text-sm font-medium transition-colors',
                                    isActive ? 'text-white' : 'text-gray-300 group-hover:text-white',
                                ]"
                            >
                                {{ child.label }}
                            </span>
                        </button>
                    </RouterLink>
                </template>
            </nav>

        </div>
    </Teleport>
</template>
