# CLAUDE.md — api/

Documentação técnica de referência para o assistente de IA. Leia este arquivo sempre que for trabalhar dentro de `api/`.

---

## Documentação por módulo

Cada módulo tem sua própria documentação em `api/docs/`:

| Arquivo | Módulo |
|---|---|
| `docs/iam.md` | IAM — Users, Groups, Permissions |

---

## HashId — Ofuscação de IDs

IDs numéricos são mantidos no banco, mas convertidos para tokens curtos na borda da API (ex: `A1B2-C3D4-E5F6`) para esconder sequencialidade.

**Funcionamento:**
- **Encode (output):** `HashIdInterceptor` (global) percorre recursivamente o response e encoda todo campo `id` numérico antes da resposta sair.
- **Decode (input):** `HashIdPipe` decodifica o token recebido no `@Param`. Usar no lugar do `ParseIntPipe`.

```typescript
// controller
@Get(':id')
findOne(@Param('id', HashIdPipe) id: number) {
    return this.getHandler.execute(id); // id já é number
}
```

**Variável de ambiente obrigatória:** `HASH_ID_KEY` — chave HMAC-SHA256. Mudar essa chave invalida todos os tokens existentes.

**Limite:** ~2.1 bilhões de IDs únicos por entidade (36^6 = 2.176.782.336).

**O que é codificado:** somente campos com nome exato `id`. Campos como `module_id`, `group_id` etc. NÃO são codificados automaticamente pelo interceptor.

**Decodificando IDs em DTOs de entrada (body):** usar `@TransformId()` para campos singulares e `@TransformIds()` para arrays. O campo mantém o tipo `number`/`number[]` — o transform converte o token recebido antes da validação rodar.

```typescript
import { TransformId, TransformIds } from '@/infra/hash-id/transform-id.decorator';

export class ExampleCommand {
    @TransformId()  @IsInt()              resourceId: number;
    @TransformIds() @IsArray() @IsInt({ each: true }) relatedIds: number[];
}
```

**Regra geral:**
| Origem do ID | Mecanismo |
|---|---|
| `@Param('id')` na URL | `HashIdPipe` no lugar do `ParseIntPipe` |
| Campo singular no body | `@TransformId()` no DTO |
| Array de IDs no body | `@TransformIds()` no DTO |
| Response (qualquer campo `id`) | Automático via `HashIdInterceptor` |

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
- Faz o mapeamento `ReadModel → Output` via `XOutput.from(readModel)`
- Nunca usar `Omit<>`, `Pick<>` ou `Partial<>` em outputs

DTOs de entrada de commands: `src/domain/dtos/<módulo>/commands/`
DTOs de entrada de queries: `src/domain/dtos/<módulo>/queries/`
DTOs de saída: `src/domain/dtos/<módulo>/outputs/`

---

### Repository e ReadModel

O repository tem dois tipos de retorno:
- **`Model`** — espelho exato da tabela. Usado em mutations (insert/update) e lookups por ID. Localizado em `application/<módulo>/infra/db/postgres/models/`.
- **`ReadModel`** — resultado de queries SELECT (com JOINs se necessário). **Independente do Model** — não estende nem importa o Model. Localizado em `domain/read-models/<módulo>/`.

```typescript
// application/<módulo>/infra/db/postgres/models/model-user.ts — espelho da tabela
export type ModelUser = { id: number; name: string; email: string; password: string; ... }

// domain/read-models/<módulo>/user.read-model.ts — shape do resultado da query
export type UserReadModel = {
    id: number; name: string; email: string; active: boolean; ...
    // group_count?: number  ← campos de JOINs entram aqui
}
```

O Repository usa `ModelCols<ReadModel>` para tipar as colunas selecionadas no `getBy()` e `applyFilters()` para aplicar filtros dinamicamente:

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
import { FooReadModel } from '@/domain/read-models/foo/foo.read-model';

export class FooOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;

    static from(this: void, readModel: FooReadModel): FooOutput {
        const output = new FooOutput();
        output.id = readModel.id;
        output.name = readModel.name;
        return output;
    }
}
```

- Usar `class` com `@ApiProperty` para documentação Swagger automática
- Nunca usar `Omit<>`, `Pick<>` ou `Partial<>` — declarar os campos explicitamente
- Nunca usar tipos inline em `static from()` — sempre referenciar o `ReadModel` pelo nome
- Sempre assinar `static from(this: void, ...)` — permite passar como callback (`.map(FooOutput.from)`) sem violar `@typescript-eslint/unbound-method`
- Reutilizar o mesmo Output quando o shape for idêntico entre handlers
- Se o List precisar de campos extras, criar um output específico (ex: `FooListItemOutput`)
- O método `static from(readModel: FooReadModel): FooOutput` centraliza o mapeamento `ReadModel → Output`

---

### Migration

**Criar:** `npm run mgt:make -- <nome>` (executar dentro de `api/`)

**Atenção ao criar múltiplas migrations em sequência:** o Knex usa o timestamp do nome do arquivo como chave de ordenação. Quando a IA gera várias migrations rapidamente, todas saem com o mesmo timestamp e são ordenadas **alfabeticamente** — o que pode quebrar dependências entre tabelas (ex: `_permissions` antes de `_system_modules`).

Ao criar um conjunto de migrations que têm dependências entre si, garanta timestamps distintos nos nomes dos arquivos. A forma mais simples é incrementar os últimos dígitos manualmente após gerar:

```
20260516123331_create-system-modules-table.ts   ← sem dependências, roda primeiro
20260516123332_create-permissions-table.ts       ← depende de system-modules
20260516123333_create-group-permissions-table.ts ← depende de ambas
```

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
