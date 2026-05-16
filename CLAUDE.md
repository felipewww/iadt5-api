# CLAUDE.md — api/

Documentação técnica de referência para o assistente de IA. Leia este arquivo sempre que for trabalhar dentro de `api/`.

---

## Documentação por módulo

Cada módulo tem sua própria documentação em `api/docs/`:

| Arquivo | Módulo |
|---|---|
| `docs/iam.md` | IAM — Users, Groups, Permissions |

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

### Handlers — Commands vs Queries

Handlers são separados em duas pastas conforme o verbo HTTP:

| Pasta | Verbo HTTP | Input |
|---|---|---|
| `domain/commands/` | POST, PUT, PATCH, DELETE | `Command` (body) |
| `domain/queries/` | GET | `Query` (query string) |

**Command handler** (`src/application/<módulo>/domain/commands/<sub>/<nome>.handler.ts`):
```typescript
import { Handler } from '@/infra/framework/handler';
import { CreateFooCommand } from '@/domain/dtos/foo/commands/create-foo.command';
import { FooOutput } from '@/domain/dtos/foo/outputs/foo.output';

export class CreateFooHandler implements Handler<CreateFooCommand, FooOutput> {
    constructor(private readonly fooRepository: FooRepository) {}

    async execute(input: CreateFooCommand): Promise<FooOutput> {
        const model = await this.fooRepository.transaction((trx) =>
            this.fooRepository.create(input, trx)
        );
        return FooOutput.from(model);
    }
}
```

**Query handler** (`src/application/<módulo>/domain/queries/<sub>/<nome>.handler.ts`):
```typescript
import { Handler } from '@/infra/framework/handler';
import { ListFoosQuery } from '@/domain/dtos/foo/queries/list-foos.query';
import { FooOutput } from '@/domain/dtos/foo/outputs/foo.output';

export class ListFoosHandler implements Handler<ListFoosQuery, FooOutput[]> {
    constructor(private readonly fooRepository: FooRepository) {}

    async execute(query: ListFoosQuery): Promise<FooOutput[]> {
        const rows = await this.fooRepository.getBy(query);
        return rows.map(FooOutput.from);
    }
}
```

**Regras do Handler:**
- Sempre retorna um `Output`, nunca um `Model` ou `ReadModel`
- Faz o mapeamento `ReadModel → Output` via `XOutput.from(model)`
- Nunca usar `Omit<>`, `Pick<>` ou `Partial<>` em outputs

DTOs de entrada de commands: `src/domain/dtos/<módulo>/commands/`
DTOs de entrada de queries: `src/domain/dtos/<módulo>/queries/`
DTOs de saída: `src/domain/dtos/<módulo>/outputs/`

---

### Repository e ReadModel

O repository tem dois tipos de retorno:
- **`Model`** — espelho exato da tabela. Usado em mutations (insert/update) e lookups por ID.
- **`ReadModel`** — resultado de queries com JOINs. Estende o Model com campos extras. Localizado em `infra/db/postgres/models/<nome>.read-model.ts`.

```typescript
// model-user.ts — espelho da tabela
export type ModelUser = { id: number; name: string; email: string; ... }

// user.read-model.ts — resultado da query (com JOINs futuros)
export type UserReadModel = ModelUser & {
    // group_count?: number  ← campos de JOINs entram aqui
}
```

O método `getBy()` usa `ModelCols<ReadModel>` para tipar as colunas selecionadas e `applyFilters()` para aplicar filtros dinamicamente:

```typescript
import { ModelCols } from '@/infra/db/model-cols';
import { applyFilters } from '@/infra/db/utils/apply-filters';
import { applyPagination } from '@/infra/db/utils/apply-pagination';

export class FooRepository extends PgRepository {
    tableName = 'foos';
    protected alias = 'f';

    async getBy(filters: ListFoosQuery): Promise<FooReadModel[]> {
        const cols: ModelCols<FooReadModel> = {
            id: 'f.id',
            name: 'f.name',
            // campos de JOIN: partner_name: 'p.name'
        };

        const query = this.reader().select(cols);

        applyFilters<ListFoosQuery>(
            { name: 'f.name', page: null, pageSize: null },
            filters,
            query,
        );

        applyPagination(filters, query);
        return query;
    }

    async findById(id: number): Promise<ModelFoo | null> {
        return this.reader().select('f.*').where('f.id', id).first() ?? null;
    }

    async create(data: Omit<ModelFoo, 'id' | 'created_at' | 'updated_at'>, trx: Knex.Transaction): Promise<ModelFoo> {
        const [row] = await this.writer(trx).insert(data).returning('*');
        return row;
    }

    async update(id: number, data: Partial<ModelFoo>, trx: Knex.Transaction): Promise<ModelFoo> {
        const [row] = await this.writer(trx).where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
        return row;
    }
}
```

- `getBy()` — para listagens filtráveis (GET); retorna `ReadModel[]`
- `findById()` — lookup por PK; retorna `Model | null`
- `writer()` WHERE sem alias — PostgreSQL não suporta alias em UPDATE/DELETE
- Utilitários em `src/infra/db/utils/`: `apply-filters.ts`, `apply-pagination.ts`, `apply-date-filters.ts`

---

### Output

Localização: `src/domain/dtos/<módulo>/outputs/<nome>.output.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class FooOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;

    static from(model: { id: number; name: string }): FooOutput {
        const output = new FooOutput();
        output.id = model.id;
        output.name = model.name;
        return output;
    }
}
```

- Usar `class` com `@ApiProperty` para documentação Swagger automática
- Nunca usar `Omit<>`, `Pick<>` ou `Partial<>` — declarar os campos explicitamente
- Reutilizar o mesmo Output quando o shape for idêntico entre handlers
- Se o List precisar de campos extras, criar um output específico (ex: `FooListItemOutput`)
- O método `static from()` centraliza o mapeamento `Model → Output`

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
