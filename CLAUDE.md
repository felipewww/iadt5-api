# CLAUDE.md — api/

Documentação técnica de referência para o assistente de IA. Leia este arquivo sempre que for trabalhar dentro de `api/`.

---

## Scripts (`package.json`)

| Script | O que faz |
|---|---|
| `npm run start:dev` | Sobe a API em modo watch |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run lint` | Lint + autofix |
| `npm run mgt:make -- <nome>` | **Cria uma nova migration** |
| `npm run mgt:run` | Executa todas as migrations pendentes |
| `npm run test` | Testes unitários |
| `npm run test:e2e` | Testes end-to-end |
| `npm run test:cov` | Cobertura de testes |

**Regras:**
- Migrations são criadas **exclusivamente** via `npm run mgt:make -- <nome>`. Nunca criar o arquivo `.ts` manualmente.
  - Exemplo: `npm run mgt:make -- create-products-table`
  - O arquivo é gerado em `src/infra/db/postgres/migrations/`.
- Para aplicar migrations pendentes: `npm run mgt:run`.

---

## Arquitetura e camadas (`src/`)

```
src/
├── domain/       # Tipos, DTOs, enums — zero dependências de framework
├── application/  # Módulos de negócio (auth, users, rabbitmq, ...)
├── infra/        # Framework NestJS, banco, AWS, utilitários de infra
└── utils/        # Funções utilitárias puras
```

**Regras de dependência:**
- `application` pode importar de `domain` e `infra`
- `infra` **não** importa de `application`
- `domain` **não** importa de nenhuma camada interna

**Imports:** sempre usar o alias `@/` (mapeia para `src/`). Nunca usar caminhos relativos longos (`../../..`).

---

## Patterns — como criar cada elemento

### Handler (caso de uso)

Localização: `src/application/<módulo>/domain/handlers/<nome>.handler.ts`

```typescript
import { Handler } from '@/infra/framework/handler';
import { FooCommand } from '@/domain/dtos/foo/commands/foo.command';
import { FooOutput } from '@/domain/dtos/foo/commands/foo.output';

export class FooHandler implements Handler<FooCommand, FooOutput> {
    constructor(/* dependências injetadas */) {}

    async execute(input: FooCommand): Promise<FooOutput> {
        // implementação
    }
}
```

DTOs de entrada/saída ficam em `src/domain/dtos/<módulo>/commands/`.

---

### Repository

Localização: `src/application/<módulo>/infra/db/postgres/<nome>.repository.ts`

```typescript
import { PgRepository } from '@/infra/db/postgres/pg-repository';
import { Knex } from 'knex';

export class FooRepository extends PgRepository {
    tableName = 'foos';

    async findById(id: number) {
        return this.reader().where('f.id', id).first();
    }

    async create(data: object, trx: Knex.Transaction) {
        return this.writer(trx).insert(data).returning('*');
    }
}
```

- `reader()` — connection de leitura (réplica)
- `writer(trx)` — connection de escrita; sempre recebe uma transaction
- `transaction(callback)` — abre e gerencia uma transaction

---

### Migration

**Criar:** `npm run mgt:make -- <nome>` (executar dentro de `api/`)

Estrutura do arquivo gerado (em `src/infra/db/postgres/migrations/`):

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('products', (t) => {
        t.increments('id').primary();
        // colunas...
        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('products');
}
```

---

### Controller

Localização: `src/application/<módulo>/controllers/<nome>.controller.ts`

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@/infra/framework/permissions/roles.decorator';
import { Context } from '@/infra/framework/context/context.decorator';
import { RequestContext } from '@/infra/framework/context/request-context';
import { SysModules } from '@/domain/permissions/sys-modules';
import { PermissionsContracts } from '@/infra/framework/permissions/permissions.contracts';

@ApiTags('foo')
@Controller('foo')
export class FooController {
    constructor(private readonly fooHandler: FooHandler) {}

    @Post()
    @Roles(SysModules.foo, [PermissionsContracts.create])
    async create(@Body() body: FooCommand, @Context() ctx: RequestContext) {
        return this.fooHandler.execute(body);
    }
}
```

---

### Module

Localização: `src/application/<módulo>/<nome>.module.ts`

```typescript
import { Module } from '@nestjs/common';

@Module({
    controllers: [FooController],
    providers: [FooHandler, FooRepository],
})
export class FooModule {}
```

Registrar o novo módulo em `src/application/application.module.ts`.

---

### Permissions (RBAC)

1. Adicionar o módulo em `src/domain/permissions/sys-modules.ts`:
   ```typescript
   export enum SysModules {
       contracts = 6,
       foo = 7,  // novo
   }
   ```
2. Usar nos controllers via `@Roles(SysModules.foo, [PermissionsContracts.create])`.
3. Operações em `PermissionsContracts`: `create = 1`, `read`, `update`, `delete`.

---

### RabbitMQ

| Artefato | Localização |
|---|---|
| Exchanges | `src/application/_rabbit-mq/exchanges.ts` |
| Queues | `src/application/_rabbit-mq/queues.ts` |
| Consumers | `src/application/_rabbit-mq/consumers/<nome>.consumer.ts` |

Tipos de fila:
- `round-robin` (padrão) — load balance entre consumers
- `propagation` — mensagem entregue a todas as instâncias (`EventQueue`)

Envelope padrão de mensagem (`IMessagePattern<T>`):
```typescript
{
    tenant: { id, schema, location },
    data: T
}
```

O prefixo `manifest.uid` (ex: `_97_23`) é aplicado automaticamente a todos os nomes de exchange e queue.

---

## Manifest (`manifest.json`)

Define o namespace do tenant. Trocar esse arquivo muda o prefixo de todas as filas/exchanges sem alterar código.

```json
{
    "tenatId": 97,
    "tenantName": "Fiap Secure Systems",
    "projectId": 23,
    "uid": "_97_23"
}
```

---

## Variáveis de ambiente (`.env.example`)

```
APP_PORT=4000
DB_HOST=localhost
DB_USER=admin
DB_PASS=secret
DB_PORT=5432
DB_NAME=_97_23
RMQ_USER=guest
RMQ_PASS=guest
RMQ_HOST=localhost:5672
```
