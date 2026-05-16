# Módulo IAM — Identity and Access Management

Responsável por gerenciar usuários, grupos e permissões da plataforma.

---

## Conceitos

### `_system_modules`
Tabela de domínio (prefixo `_`) que organiza as permissões por área do sistema. Usada apenas para exibição e organização. Não é gerenciada pelo tenant — os registros são inseridos via migration de seed.

### `_permissions`
Tabela de domínio que contém todas as permissões disponíveis no sistema. Também não é gerenciada pelo tenant. Cada permissão pertence a um `_system_module` e possui uma `action` que mapeia ao enum `PermissionsContracts` (1=create, 2=read, 3=update, 4=delete).

O guard verifica permissões no formato `"${moduleId}:${action}"` (ex: `"1:1"` = IAM create).

### `groups`
Grupos criados pelo próprio tenant (ex: "Pessoas de confiança", "Administradores"). Cada grupo tem um conjunto de `_permissions` associadas.

### `users`
Usuários da plataforma. Cada usuário pode pertencer a múltiplos grupos. As permissões efetivas de um usuário são resolvidas a partir dos grupos aos quais pertence.

---

## Banco de dados

### Tabelas

| Tabela | Tipo | Descrição |
|---|---|---|
| `users` | tenant | Usuários da plataforma |
| `groups` | tenant | Grupos criados pelo tenant |
| `user_groups` | tenant | Relação N:N entre usuários e grupos |
| `_system_modules` | domínio | Módulos do sistema (seed) |
| `_permissions` | domínio | Permissões disponíveis (seed) |
| `group_permissions` | tenant | Relação N:N entre grupos e permissões |

### Diagrama

```
_system_modules (1) ──< _permissions (N)
                              │
                              ▼ (N)
              groups >──< group_permissions
                │
                ▼ (N)
users >──< user_groups
```

### `users`
| Coluna | Tipo | Observação |
|---|---|---|
| id | integer PK | |
| name | string | |
| username | string | unique |
| email | string | unique |
| password | string | hash em produção |
| active | boolean | default true |
| created_at | timestamp | |
| updated_at | timestamp | |

### `_system_modules`
| Coluna | Tipo | Observação |
|---|---|---|
| id | integer PK | |
| name | string | unique |
| description | string | nullable |

### `_permissions`
| Coluna | Tipo | Observação |
|---|---|---|
| id | integer PK | |
| module_id | FK | referencia `_system_modules` |
| action | smallint | mapeia `PermissionsContracts` |
| name | string | label para exibição |

### `groups`
| Coluna | Tipo | Observação |
|---|---|---|
| id | integer PK | |
| name | string | |
| description | string | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

### Tabelas de junção
- `group_permissions (group_id, permission_id)` — PK composta
- `user_groups (user_id, group_id)` — PK composta

---

## Migrations

| Arquivo | O que faz |
|---|---|
| `*_create-users-table` | Cria tabela `users` |
| `*_create-system-modules-table` | Cria tabela `_system_modules` |
| `*_create-permissions-table` | Cria tabela `_permissions` |
| `*_create-groups-table` | Cria tabela `groups` |
| `*_create-group-permissions-table` | Cria tabela `group_permissions` |
| `*_create-user-groups-table` | Cria tabela `user_groups` |
| `*_seed-iam-permissions` | Insere módulo IAM e suas 4 permissões |

---

## Permissões (`SysModules.iam = 1`)

| Action | PermissionsContracts | Guard string | Cobertura |
|---|---|---|---|
| create | 1 | `"1:1"` | Criar usuários e grupos |
| read | 2 | `"1:2"` | Visualizar usuários, grupos e permissões |
| update | 3 | `"1:3"` | Atualizar usuários, grupos e vincular grupos/permissões |
| delete | 4 | `"1:4"` | Deletar usuários e grupos |

---

## Endpoints

### Users `(/iam/users)`

| Método | Rota | Permission | Descrição |
|---|---|---|---|
| POST | `/iam/users` | iam:create | Criar usuário |
| GET | `/iam/users` | iam:read | Listar usuários |
| GET | `/iam/users/:id` | iam:read | Buscar usuário por ID |
| PUT | `/iam/users/:id` | iam:update | Atualizar usuário |
| DELETE | `/iam/users/:id` | iam:delete | Deletar usuário |
| GET | `/iam/users/:id/groups` | iam:read | Listar grupos do usuário |
| PUT | `/iam/users/:id/groups` | iam:update | Sincronizar grupos do usuário (substitui todos) |

### Groups (`/iam/groups`)

| Método | Rota | Permission | Descrição |
|---|---|---|---|
| POST | `/iam/groups` | iam:create | Criar grupo |
| GET | `/iam/groups` | iam:read | Listar grupos |
| GET | `/iam/groups/:id` | iam:read | Buscar grupo por ID |
| PUT | `/iam/groups/:id` | iam:update | Atualizar grupo |
| DELETE | `/iam/groups/:id` | iam:delete | Deletar grupo |
| GET | `/iam/groups/:id/permissions` | iam:read | Listar permissões do grupo |
| PUT | `/iam/groups/:id/permissions` | iam:update | Sincronizar permissões do grupo (substitui todas) |

### Permissions (`/iam/permissions`)

| Método | Rota | Permission | Descrição |
|---|---|---|---|
| GET | `/iam/permissions` | iam:read | Listar permissões agrupadas por módulo |

---

## Estrutura de arquivos

```
src/
├── domain/
│   ├── permissions/
│   │   └── sys-modules.ts              ← SysModules.iam = 1
│   └── dtos/iam/commands/
│       ├── create-user.command.ts
│       ├── update-user.command.ts
│       ├── create-group.command.ts
│       ├── update-group.command.ts
│       ├── sync-group-permissions.command.ts
│       └── sync-user-groups.command.ts
└── application/iam/
    ├── iam.module.ts
    ├── controllers/
    │   ├── iam-users.controller.ts
    │   ├── iam-groups.controller.ts
    │   └── iam-permissions.controller.ts
    ├── domain/handlers/
    │   ├── users/
    │   │   ├── create-user.handler.ts
    │   │   ├── list-users.handler.ts
    │   │   ├── get-user.handler.ts
    │   │   ├── update-user.handler.ts
    │   │   ├── delete-user.handler.ts
    │   │   ├── list-user-groups.handler.ts
    │   │   └── sync-user-groups.handler.ts
    │   ├── groups/
    │   │   ├── create-group.handler.ts
    │   │   ├── list-groups.handler.ts
    │   │   ├── get-group.handler.ts
    │   │   ├── update-group.handler.ts
    │   │   ├── delete-group.handler.ts
    │   │   ├── list-group-permissions.handler.ts
    │   │   └── sync-group-permissions.handler.ts
    │   └── permissions/
    │       └── list-permissions.handler.ts
    └── infra/db/postgres/
        ├── models/
        │   ├── model-user.ts
        │   ├── model-group.ts
        │   ├── model-permission.ts
        │   └── model-system-module.ts
        ├── iam-users.repository.ts
        ├── iam-groups.repository.ts
        └── iam-permissions.repository.ts
```

---

## Comportamentos importantes

- **Senha:** o campo `password` nunca é retornado nos endpoints de leitura. Hash deve ser aplicado antes de persistir (a implementar com bcrypt/argon2).
- **Sync vs Add:** os endpoints `PUT /:id/groups` e `PUT /:id/permissions` fazem **substituição total** (sync), não adição incremental. Enviar um array vazio remove todas as associações.
- **Permissões são imutáveis pelo tenant:** `_permissions` e `_system_modules` só podem ser alterados via migrations.
- **Cascade delete:** deletar um `group` remove automaticamente `group_permissions` e `user_groups` associados. Deletar um `user` remove `user_groups` associados.

---

## Como adicionar um novo módulo ao sistema (ex: "Reports")

1. Rodar migration para inserir em `_system_modules` e `_permissions`
2. Adicionar `reports = N` em `src/domain/permissions/sys-modules.ts`
3. Usar `@Roles(SysModules.reports, [...])` nos controllers do novo módulo
4. Criar documentação em `api/docs/reports.md`
