# CLAUDE.md — web-spa/

Documentação técnica de referência para o assistente de IA. Leia este arquivo sempre que for trabalhar dentro de `web-spa/`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite |
| CSS | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Componentes primitivos | Radix Vue |
| Ícones | Lucide Vue |
| Roteamento | Vue Router |
| Estado | Pinia |

---

## Estrutura (`src/`)

```
src/
├── api/          # Chamadas HTTP para a API (por domínio)
├── assets/       # CSS global, fontes
├── components/
│   ├── layout/   # Componentes de estrutura de página (AppSidebar, AppFormPage, …)
│   └── ui/       # Componentes de UI reutilizáveis (AppButton, AppInput, …)
├── domain/       # Types TypeScript (sem lógica)
├── layouts/      # Layouts de rota (DashboardLayout, PublicLayout)
├── stores/       # Pinia stores (por domínio)
├── views/        # Páginas Vue por rota
└── router/       # Definição de rotas
```

---

## Navegação — padrão obrigatório

**Nunca use `router.push()` para navegação simples entre páginas.** Todo elemento que leva o usuário a outra rota deve ser um link real (`<a>`) para que funcione com botão direito → "Abrir em nova aba", Ctrl+clique, etc.

### AppButton com `to`

`AppButton` aceita a prop `to: RouteLocationRaw`. Quando fornecida, renderiza como `RouterLink` (`<a>`); sem ela, renderiza como `<button>`.

```vue
<!-- ✅ correto — renderiza como <a>, pode abrir em nova aba -->
<AppButton :to="{ name: 'iam-user-form', params: { id: 'new' } }">
    Novo Usuário
</AppButton>

<!-- ❌ errado — não é um link real -->
<AppButton @click="router.push({ name: 'iam-user-form', params: { id: 'new' } })">
    Novo Usuário
</AppButton>
```

### RouterLink diretamente

Para elementos que não são AppButton (ícones, avatares, células de tabela), use `RouterLink` diretamente com as classes de estilo necessárias:

```vue
<RouterLink
    :to="{ name: 'iam-user-form', params: { id: user.id } }"
    class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 ..."
>
    <Pencil :size="14" />
</RouterLink>
```

### Quando `router.push()` é aceitável

Apenas para navegação **programática após uma ação** (ex: redirecionar após salvar um formulário):

```vue
// ✅ ok — navega como consequência de uma ação async
async function save() {
    await store.createUser(form.value)
    router.push({ name: 'iam-users' })  // redirect pós-submit
}
```

---

## Padrão de linha em listagens

Cada linha de uma listagem com item navegável deve seguir esta estrutura:

```
linha (div.flex)
├── [ícone/avatar + info] → RouterLink (flex-1, área principal clicável)
└── [ações] → div.shrink-0 (visível no hover)
    ├── botão editar → RouterLink
    └── botão excluir → button (ação destrutiva, nunca link)
```

**Por quê:** em monitores grandes a área de ação (ícone do lápis) é pequena demais. Tornar o conteúdo principal um link amplia drasticamente a área clicável sem alterar o visual.

```vue
<!-- ✅ padrão correto -->
<div class="flex items-center gap-4 px-4 py-3.5 group hover:bg-gray-50 ...">
    <!-- Área principal: ícone/avatar + título + subtítulo -->
    <RouterLink
        :to="{ name: 'iam-user-form', params: { id: user.id } }"
        class="flex items-center gap-4 flex-1 min-w-0"
    >
        <div class="avatar-classes">...</div>
        <div class="min-w-0">
            <p class="text-sm font-medium text-gray-900 ...">{{ user.name }}</p>
            <p class="text-xs text-gray-400 ...">{{ user.email }}</p>
        </div>
    </RouterLink>

    <!-- Ações: visíveis no hover -->
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
        <RouterLink :to="..." class="p-1.5 rounded-lg ..."><Pencil :size="14" /></RouterLink>
        <button @click="remove(user.id)" class="p-1.5 rounded-lg ..."><Trash2 :size="14" /></button>
    </div>
</div>
```

---

## Layouts de página

### `AppFormPage`

Para páginas de formulário/detalhe centralizadas. Aplica max-width responsivo e mantém o conteúdo centralizado:

| Breakpoint | Max-width |
|---|---|
| < 1024px | 672px |
| lg 1024px+ | 768px |
| xl 1280px+ | 896px |
| 2xl 1536px+ | 1024px |

```vue
<template>
    <AppFormPage>
        <!-- conteúdo do formulário -->
    </AppFormPage>
</template>
```

Telas de **listagem** não usam `AppFormPage` — ficam em full-width.

---

## Notificações em tempo real

O sistema de notificações usa SSE (Server-Sent Events) via `@microsoft/fetch-event-source` (necessário para suportar `Authorization` header, que o `EventSource` nativo não suporta).

### Composable — `useNotifications`

Estado singleton compartilhado entre todos os componentes. Conecta automaticamente ao `platform-notifications` quando o usuário faz login e desconecta no logout.

```typescript
import { useNotifications } from '@/composables/useNotifications'

const { notifications, unread, connect, disconnect, markAllRead } = useNotifications()
```

A conexão e desconexão são gerenciadas em `App.vue` via `watch` em `auth.isAuthenticated`. Não chame `connect()`/`disconnect()` em outros lugares.

O token de autenticação do canal é obtido via `GET /notifications/token` na API e renovado automaticamente a cada reconexão.

### Componente — `AppNotificationBell`

Sino com badge de não-lidas e dropdown de histórico. Já incluído no `AppHeader`. Não instanciar em outro lugar.

### Variável de ambiente

```
VITE_NOTIFICATIONS_URL=http://localhost:3200
```

Em produção Docker, apontar para o endereço público do `platform-notifications`.

---

## Scripts (`package.json`)

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o dev server (Vite) |
| `npm run build` | Build de produção |
| `npm run test:unit` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes e2e (Playwright) |
| `npm run lint` | Lint + autofix |
| `npm run type-check` | Checagem de tipos TypeScript |
