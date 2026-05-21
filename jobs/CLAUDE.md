# CLAUDE.md — platform/services/jobs

Documentação técnica de referência para o assistente de IA. Leia este arquivo sempre que for trabalhar dentro de `services/jobs/`.

**Localização no repo:** `platform/services/jobs/`

---

## O que é este serviço

`platform-jobs` é um serviço de plataforma (não de cliente) que gerencia jobs assíncronos pesados para todos os tenants. Ele não executa os jobs — apenas os registra, expõe o status e notifica o frontend em tempo real.

**Responsabilidades:**
- Criar jobs com ID único e status inicial `CREATED`
- Receber atualizações de status dos workers
- Notificar o frontend via SSE quando o status muda
- Validar tokens de stream assinados pelas APIs dos clientes
- Listar jobs por tenant (para telas de acompanhamento global)

**O que ele NÃO faz:** não executa processamento, não lê filas RabbitMQ, não conhece o conteúdo dos jobs, não publica notificações no `platform-notifications`.

---

## Jobs pessoais vs. jobs globais

Todo job pertence a um tenant (`tenantId`), mas `userId` é opcional:

| `userId` | Significado |
|---|---|
| presente | Job pessoal — pertence a um usuário específico. O worker deve notificar esse usuário via `platform-notifications` ao terminar. |
| ausente | Job global do tenant — visível a todos. Sem notificação individual. Usuários acompanham pela tela de "em processamento" via `GET /jobs?tenantId=...`. |

**Quem decide se notifica:** o worker. Ao fazer `PATCH /jobs/:jobId`, o worker consulta `GET /jobs/:jobId`, verifica se há `userId` e, se houver, publica em `platform_exc-notifications` com `payload: { jobId }`.

---

## Fluxo completo

```
1. Frontend → POST /upload                 (API do cliente, autenticada)
2. API cliente → POST /jobs                (platform-jobs, rede interna)
                 body: { tenantId, userId?, type, payload? } → { jobId }
3. API cliente → RabbitMQ                  (publica tipo do job + jobId)
4. API cliente → assina JWT { jobId, tenantId, exp } com COGNITE_JOBS_SECRET
5. API cliente → Frontend                  (devolve { jobId, streamToken })

6. Frontend → GET /jobs/:jobId/stream?token=xxx   (platform-jobs, direto)
7. platform-jobs valida o token e abre SSE com Change Stream no MongoDB

8. Worker (consumer RabbitMQ) processa o job
9. Worker → PATCH /jobs/:jobId             (platform-jobs, rede interna, sem auth)
10. platform-jobs salva status no Mongo → Change Stream dispara → SSE entrega ao frontend
11. Worker → (se job.userId presente) publica notificação em platform_exc-notifications
```

### Tela de jobs globais (ex: "arquivos em processamento")

```
1. Frontend → GET /jobs?tenantId=_97_23&status=RUNNING   (platform-jobs, rede interna)
2. Para cada job da lista → GET /jobs/:jobId/stream?token=xxx   (SSE individual)
```

---

## Arquitetura e camadas

```
src/
├── domain/           # Enums, DTOs, read-models — zero dependências de framework
├── application/      # Módulo de jobs (controllers, handlers, repository)
└── infra/            # Framework NestJS, MongoDB, token, métricas
```

Regras de dependência:
- `application` importa de `domain` e `infra`
- `infra` não importa de `application`
- `domain` não importa de nenhuma camada interna

---

## Banco de dados — MongoDB com Change Streams

**Persistência:** todos os jobs são persistidos no MongoDB via Mongoose. Nenhum estado é mantido em memória.

**Tempo real (SSE):** usa **MongoDB Change Streams** para detectar mudanças de status e empurrar eventos para as conexões SSE abertas. Quando o worker faz `PATCH /jobs/:id`, o documento é atualizado no Mongo e o Change Stream dispara automaticamente para todos os consumers daquele `jobId`.

**Por que Change Streams:**
- Funciona com múltiplas instâncias sem coordenação adicional
- Não precisa de Redis ou outro barramento externo
- O MongoDB já é a fonte de verdade

### Requisito: replica set

Change Streams dependem do **oplog**, que só existe em modo replica set. Em produção (Atlas) já vem configurado. Para dev local, o `docker-compose.yml` sobe o MongoDB como replica set de um único nó (`rs0`).

---

## Autenticação

### Endpoints internos (sem auth)
`POST /jobs`, `PATCH /jobs/:jobId`, `GET /jobs/:jobId` e `GET /jobs` são chamados por serviços internos em rede privada. Não exigem token.

### Endpoint SSE (com token)
`GET /jobs/:jobId/stream` é chamado diretamente pelo frontend. Exige JWT assinado com `COGNITE_JOBS_SECRET`.

**Payload do token:**
```json
{ "jobId": "uuid-aqui", "tenantId": "_97_23", "exp": 1234567890 }
```

**A chave `COGNITE_JOBS_SECRET` deve ser a mesma em todos os serviços** (platform-jobs e todas as APIs de clientes).

---

## Status de um job

```
CREATED → RUNNING → DONE
                 ↘ FAILED
```

---

## Variáveis de ambiente (`.env.example`)

```
APP_PORT=3100
METRICS_TOKEN=change-me-in-production
COGNITE_JOBS_SECRET=change-me-in-production
MONGO_URI=mongodb://admin:secret@localhost:27017/cognite-jobs?authSource=admin&directConnection=true
```

Em Docker, `MONGO_URI` aponta para `platform-mongodb`. As demais variáveis vêm do `.env` carregado via `dotenv/config`.

## Docker

```bash
docker compose up -d --build platform-jobs
```

---

## Endpoints

| Método | Rota | Auth | Chamado por |
|---|---|---|---|
| `POST` | `/jobs` | nenhuma (rede interna) | API do cliente |
| `PATCH` | `/jobs/:jobId` | nenhuma (rede interna) | Worker |
| `GET` | `/jobs` | nenhuma (rede interna) | Frontend / API do cliente |
| `GET` | `/jobs/:jobId` | nenhuma (rede interna) | Worker / API do cliente |
| `GET` | `/jobs/:jobId/stream` | token JWT | Frontend |
| `GET` | `/metrics` | Bearer METRICS_TOKEN | Prometheus |

### GET /jobs — query params

| Param | Obrigatório | Descrição |
|---|---|---|
| `tenantId` | sim | Filtra pelo tenant |
| `status` | não | Filtra por status (`CREATED`, `RUNNING`, `DONE`, `FAILED`) |
