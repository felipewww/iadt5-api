# web-spa

Template de frontend SPA gerado para projetos da software house. Stack: Vue 3, Pinia, Vue Router, Tailwind CSS 4, Axios.

---

## Convenções

### Tipos da API

Os tipos do frontend vivem em `src/domain/` e espelham os DTOs do projeto API em `api/src/domain/dtos/**`.

- Ao implementar uma tela para um endpoint novo, consulte `api/src/domain/dtos/` para entender o contrato (inputs e outputs).
- Recrie os tipos correspondentes em `src/domain/` com um comentário indicando o arquivo de origem.
- Mantenha os arquivos em sincronismo manualmente ao evoluir a API.

```
src/domain/
└── iam/
    ├── user.ts        ← mirrors api/src/domain/dtos/iam/users/outputs/ e commands/
    ├── group.ts       ← mirrors api/src/domain/dtos/iam/groups/outputs/ e commands/
    ├── permission.ts  ← mirrors api/src/domain/dtos/iam/permissions/outputs/
    └── index.ts       ← barrel export
```

### HTTP Client

O client HTTP (`src/api/client.ts`) usa Axios com:
- `VITE_API_URL` como base URL (padrão: `http://localhost:3000`)
- Token Bearer lido de `localStorage.access_token` injetado automaticamente em todas as requests
- Erros normalizados via interceptor de response

Cada módulo de API fica em `src/api/<modulo>.ts` e usa o client centralizado.

### Stores (Pinia)

Stores ficam em `src/stores/`. Cada store concentra o estado e as operações de um domínio. As views nunca chamam a API diretamente — usam a store.

**Exceção:** operações pontuais que buscam dados temporários para um modal (ex: carregar grupos de um usuário específico) podem chamar a API diretamente na view.

### Layouts e Rotas

Toda rota de área logada usa `meta: { layout: 'dashboard', requiresAuth: true }`. O guard no router redireciona para `/login` se não autenticado.

---

## Telas incluídas no boilerplate

| Rota | Descrição |
|---|---|
| `/login` | Autenticação |
| `/` | Dashboard (home) |
| `/iam/users` | Listagem, criação, edição e exclusão de usuários + gestão de grupos |
| `/iam/groups` | Listagem, criação, edição e exclusão de grupos + gestão de permissões |

---

## Variáveis de ambiente

Crie um `.env.local` na raiz do projeto:

```env
VITE_API_URL=http://localhost:3000
```

---

## Comandos

```bash
npm install       # instalar dependências
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção
npm run type-check # verificação de tipos
npm run test:unit  # testes unitários (Vitest)
npm run test:e2e   # testes E2E (Playwright)
```
