# Design Patterns

## Stack

- **Framework:** NestJS 11
- **Database:** PostgreSQL via Knex.js
- **Message Queue:** RabbitMQ (amqplib)
- **Storage:** AWS S3
- **Auth:** JWT (jose)
- **Docs:** Swagger + Scalar UI

---

## Estrutura de Camadas

```
src/
├── domain/          # Tipos, DTOs, enums de domínio — sem dependências de framework
├── application/     # Módulos de negócio (auth, users, rabbitmq)
├── infra/           # Framework, banco, AWS, utilitários de infraestrutura
└── utils/           # Funções utilitárias puras
```

A regra de dependência segue: `application` depende de `domain` e `infra`. `infra` não conhece `application`.

---

## Patterns

### Handler (Command/Query)

Cada caso de uso é encapsulado em uma classe que implementa `Handler<I, O>`.

```
src/infra/framework/handler.ts          ← interface Handler<I, O>
src/application/auth/domain/handlers/  ← implementações
```

```typescript
// Definição
export interface Handler<I, O> {
    execute(input: I): Promise<O>
}

// Uso
export class LoginHandler implements Handler<LoginCommand, LoginOutput> {
    execute(input: LoginCommand): Promise<LoginOutput> { ... }
}
```

Os DTOs de entrada/saída vivem em `src/domain/dtos/<domínio>/commands/`.

---

### Repository

Acesso a dados via classe abstrata `PgRepository`. Cada repositório concreto declara apenas `tableName` e seus métodos de query.

```
src/infra/db/postgres/pg-repository.ts                            ← base
src/application/users/infra/db/postgres/users.repository.ts      ← concreto
```

- `reader()` — query builder na connection de leitura
- `writer(trx)` — query builder na connection de escrita (aceita transação)
- `transaction(callback)` — executa callback dentro de uma transaction gerenciada

---

### Repository: Reader / Writer

`PgRepository` recebe duas connections no construtor (`connection` e `readerConnection`), preparado para separar leitura e escrita em réplicas distintas.

---

### Global Module (NestJS)

`PostgresModule` é declarado com `@Global()` e exporta o token `PG_CONNECTION`. Qualquer módulo que precisar do Knex injeta via `@Inject('PG_CONNECTION')` sem precisar importar o módulo.

```
src/infra/db/postgres/postgres.module.ts
```

---

### Interceptor Global

`GlobalInterceptor` é registrado em `InfraModule` como `APP_INTERCEPTOR` e atua em todas as rotas:

- Envelopa a resposta em `{ data }` no sucesso
- Normaliza erros HTTP em `{ ok, duration, error, errors[] }`
- Dispara a gravação de auditoria quando o endpoint é marcado com `@Auditable()`

```
src/infra/framework/http/global.interceptor.ts
```

---

### Request Context

Cada requisição carrega um `RequestContext` anexado ao objeto `Request` do Express. Ele agrega:

- `RemoteUser` — usuário autenticado com grupos de permissão e metadados genéricos
- `Audit` — rastro de eventos da requisição
- `traceId` — UUID para rastreamento distribuído

O contexto é injetado em controllers via o decorator `@Context()`.

```
src/infra/framework/context/request-context.ts
src/infra/framework/context/context.decorator.ts
src/infra/framework/context/remote-user.ts
```

`RemoteUser<META>` é genérico para que cada domínio possa tipar seus metadados de tenant.

---

### Audit

A classe `Audit` acumula `AuditRecord[]` durante o ciclo de vida da requisição. O `GlobalInterceptor` chama `audit.record()` automaticamente em mutações (POST/PUT/PATCH/DELETE) quando o endpoint tem `@Auditable(event)`.

```
src/infra/framework/audit/audit.ts
src/infra/framework/audit/audit-record.ts
src/infra/framework/audit/auditable.ts
```

A publicação dos registros em exchange RabbitMQ está prevista no interceptor mas ainda pendente de implementação.

---

### Permissions (RBAC)

Permissões são declaradas por endpoint via `@Roles(module, permissions[])` e verificadas pelo `RolesGuard`. Os módulos do sistema ficam em `SysModules` e as operações em `PermissionsContracts`.

```
src/domain/permissions/sys-modules.ts
src/infra/framework/permissions/permissions.contracts.ts
src/infra/framework/permissions/roles.decorator.ts
src/infra/framework/permissions/roles.guard.ts
```

---

### RabbitMQ: Exchange / Queue / Consumer / Producer

A camada de mensageria é construída sobre quatro classes base em `src/infra/framework/rabbitmq/`:

| Classe | Responsabilidade |
|---|---|
| `Connection` | Abre canal AMQP, inicializa exchanges e consumers |
| `Exchange` | Assert de exchange + bind de queues |
| `Queue` | Assert de queue com dead-letter configurado |
| `Consumer<T>` | Abstrato — implementa `handler()`, gerencia ack/reject |
| `Producer<T>` | Publica mensagens serializadas numa exchange |

**Definição de exchanges e queues** fica em `src/application/_rabbit-mq/` e é separada da inicialização. A conexão e o bootstrapping ficam em `RabbitConnectorModule.onModuleInit()`.

**Queue types:**
- `round-robin` (padrão) — múltiplos consumers fazem load balance
- `propagation` — mensagem é recebida por todos os servidores; usa `EventQueue` com fila exclusiva por instância

**EventQueue** requer chamada a `.mount(serviceName, serverId)` antes de ser consumida, para gerar um nome de fila único por instância de servidor.

---

### Namespace por Tenant (manifest UID)

Exchanges, queues e a dead-letter exchange recebem automaticamente o prefixo `manifest.uid` (ex: `_97_23`) em seus nomes. O prefixo é aplicado nos construtores de `Exchange` e `Queue` e na constante `DEAD_LETTER_EXC_NAME`.

```
src/infra/manifest/manifest.ts     ← IManifest + singleton tipado
src/infra/framework/rabbitmq/Exchange.ts
src/infra/framework/rabbitmq/Queue.ts
src/infra/framework/rabbitmq/module.ts
```

O `manifest.json` na raiz do projeto define `uid`, `tenantName`, `projectId` etc. Trocar o arquivo muda o namespace de todas as filas/exchanges sem nenhuma alteração de código.

---

### Convenções de nomenclatura RabbitMQ

| Tipo | Padrão |
|---|---|
| Exchange | `{uid}_{nome}-exc` |
| Queue | `{uid}_{nome}-queue` |
| EventQueue | `{uid}_evt-{classe}-{service}-{serverId}` |
| Dead-letter | `{uid}_exc-dlx` |

---

### Mensagem padronizada

Todas as mensagens trafegam com o envelope `IMessagePattern<T>`:

```typescript
{
    tenant: { id, schema, location },
    data: T
}
```

---

### Path aliases

O `tsconfig.json` define `baseUrl: "./"` e o alias `@/*` → `src/*`. O `module-alias` replica isso em runtime para o build compilado. Imports devem usar `@/` em vez de caminhos relativos longos.
