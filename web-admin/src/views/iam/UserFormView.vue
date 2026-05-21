<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from '@lucide/vue'
import { useIamStore } from '@/stores/iam'
import { iamApi } from '@/api/iam'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppFormPage from '@/components/layout/AppFormPage.vue'
import type { CreateUserPayload, UpdateUserPayload } from '@/domain/iam'

const route = useRoute()
const router = useRouter()
const store = useIamStore()

const isNew = computed(() => route.params.id === 'new')
const userId = computed(() => (isNew.value ? null : (route.params.id as string)))

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const pageTitle = ref('Novo Usuário')

const form = ref({ name: '', username: '', email: '', password: '', active: true })
const selectedGroupIds = ref<string[]>([])

onMounted(async () => {
    loading.value = true
    try {
        await store.fetchGroups()
        if (!isNew.value && userId.value) {
            const [user, userGroups] = await Promise.all([
                iamApi.getUser(userId.value),
                iamApi.getUserGroups(userId.value),
            ])
            pageTitle.value = user.name
            form.value = {
                name: user.name,
                username: user.username,
                email: user.email,
                password: '',
                active: user.active,
            }
            selectedGroupIds.value = userGroups.map((g) => g.id)
        }
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        loading.value = false
    }
})

function toggleGroup(id: string) {
    const i = selectedGroupIds.value.indexOf(id)
    if (i === -1) selectedGroupIds.value.push(id)
    else selectedGroupIds.value.splice(i, 1)
}

async function save() {
    error.value = ''
    saving.value = true
    try {
        let id = userId.value
        if (isNew.value) {
            const user = await store.createUser(form.value as CreateUserPayload)
            id = user.id
        } else {
            const payload: UpdateUserPayload = {
                name: form.value.name,
                email: form.value.email,
                active: form.value.active,
            }
            if (form.value.password) payload.password = form.value.password
            await store.updateUser(id!, payload)
        }
        await iamApi.syncUserGroups(id!, selectedGroupIds.value)
        router.push({ name: 'iam-users' })
    } catch (e) {
        error.value = (e as Error).message
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <AppFormPage>
        <!-- Cabeçalho da página -->
        <div>
            <RouterLink
                :to="{ name: 'iam-users' }"
                class="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-2"
            >
                <ArrowLeft :size="13" />
                Usuários
            </RouterLink>
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ pageTitle }}</h1>
                    <p v-if="!isNew" class="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span :class="form.active ? 'text-emerald-500' : 'text-gray-400'">
                            ● {{ form.active ? 'Ativo' : 'Inativo' }}
                        </span>
                        <span class="text-gray-300 dark:text-gray-600">·</span>
                        @{{ form.username }}
                    </p>
                    <p v-else class="text-xs text-gray-400 mt-0.5">Preencha os dados e associe o usuário a grupos</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <AppButton variant="secondary" size="sm" @click="router.push({ name: 'iam-users' })">
                        Cancelar
                    </AppButton>
                    <AppButton size="sm" :disabled="saving" @click="save">
                        <Loader2 v-if="saving" :size="13" class="animate-spin" />
                        {{ saving ? 'Salvando...' : 'Salvar usuário' }}
                    </AppButton>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="py-20 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 :size="18" class="animate-spin" />
            <span class="text-sm">Carregando...</span>
        </div>

        <template v-else>
            <!-- Error banner -->
            <div
                v-if="error"
                class="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400"
            >
                <AlertTriangle :size="15" class="shrink-0 mt-0.5" />
                {{ error }}
            </div>

            <!-- Dados pessoais -->
            <section class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Dados pessoais</h2>
                    <p class="text-xs text-gray-400 mt-0.5">Informações de identificação do usuário</p>
                </div>
                <div class="p-5 space-y-4">
                    <AppInput
                        v-model="form.name"
                        label="Nome completo"
                        placeholder="Ex: João da Silva"
                        required
                    />
                    <div class="grid grid-cols-2 gap-4">
                        <AppInput
                            v-model="form.username"
                            label="Usuário"
                            placeholder="Ex: joao.silva"
                            :disabled="!isNew"
                            required
                        />
                        <AppInput
                            v-model="form.email"
                            label="E-mail"
                            type="email"
                            placeholder="joao@empresa.com"
                            required
                        />
                    </div>
                    <AppInput
                        v-model="form.password"
                        label="Senha"
                        type="password"
                        :placeholder="isNew ? 'Mínimo 8 caracteres' : 'Deixe em branco para manter a senha atual'"
                        :required="isNew"
                        autocomplete="new-password"
                    />
                    <div
                        v-if="!isNew"
                        class="flex items-center justify-between p-3.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700/60"
                    >
                        <div>
                            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Status da conta</p>
                            <p class="text-xs text-gray-400 mt-0.5">Usuários inativos não conseguem fazer login</p>
                        </div>
                        <AppSwitch v-model="form.active" />
                    </div>
                </div>
            </section>

            <!-- Grupos -->
            <section>
                <div class="flex items-center gap-2 mb-3">
                    <ShieldCheck :size="14" class="text-gray-400" />
                    <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Grupos de acesso</h2>
                    <span
                        v-if="selectedGroupIds.length > 0"
                        class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                    >
                        {{ selectedGroupIds.length }}
                        selecionado{{ selectedGroupIds.length !== 1 ? 's' : '' }}
                    </span>
                </div>

                <div
                    v-if="store.groups.length === 0"
                    class="p-10 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center"
                >
                    <ShieldCheck :size="28" class="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum grupo cadastrado</p>
                    <RouterLink
                        :to="{ name: 'iam-group-form', params: { id: 'new' } }"
                        class="inline-block mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        Criar primeiro grupo →
                    </RouterLink>
                </div>

                <div
                    v-else
                    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60"
                >
                    <label
                        v-for="group in store.groups"
                        :key="group.id"
                        class="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                        <div
                            :class="[
                                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                selectedGroupIds.includes(group.id)
                                    ? 'bg-primary-600 border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
                            ]"
                            @click.stop="toggleGroup(group.id)"
                        >
                            <svg
                                v-if="selectedGroupIds.includes(group.id)"
                                viewBox="0 0 10 8"
                                fill="none"
                                class="w-2.5 h-2.5 text-white"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M1 4l2.5 2.5L9 1" />
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0" @click.stop="toggleGroup(group.id)">
                            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ group.name }}</p>
                            <p v-if="group.description" class="text-xs text-gray-400 truncate mt-0.5">
                                {{ group.description }}
                            </p>
                        </div>
                    </label>
                </div>
            </section>

            <!-- Ações finais -->
            <div class="flex justify-end gap-2 pt-2">
                <AppButton variant="secondary" size="sm" @click="router.push({ name: 'iam-users' })">
                    Cancelar
                </AppButton>
                <AppButton size="sm" :disabled="saving" @click="save">
                    <Loader2 v-if="saving" :size="13" class="animate-spin" />
                    {{ saving ? 'Salvando...' : 'Salvar usuário' }}
                </AppButton>
            </div>
        </template>
    </AppFormPage>
</template>
