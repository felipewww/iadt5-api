# Documentação — Fiap SS / Pipeline de Análise de Arquitetura
_Versão: 1.0 — 2026-05-20_

## Visão geral

O projeto `_1_1/` é um sistema SaaS (tenant `fiap-ss`, uid `_1_1`) que permite a usuários enviarem diagramas de arquitetura de software (PDF ou imagem) e receberem uma **avaliação automática via IA**: score de qualidade, pontos fortes, pontos fracos e recomendações de melhoria.

A análise é feita por um pipeline assíncrono de três etapas (API → OCR → Analyzer) monitoradas em tempo real pelo frontend via SSE.

---

## Arquitetura geral do sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│  Monorepo _1_1/                                                     │
│                                                                     │
│  ┌──────────────┐    HTTP     ┌─────────────────────────────────┐   │
│  │  web-admin   │◄──────────►│           api/                  │   │
│  │  Vue 3/Vite  │             │  NestJS  :3000                  │   │
│  │  :5173       │             │  Postgres + S3 + RabbitMQ       │   │
│  └──────────────┘             └──────┬──────────────────────────┘   │
│                                      │ RabbitMQ                     │
│  ┌───────────────────────────────────▼──────────────────────────┐   │
│  │  platform (rede Docker compartilhada)                        │   │
│  │                                                              │   │
│  │  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │   │
│  │  │ platform-   │   │ platform-    │   │  platform-       │  │   │
│  │  │ rabbitmq    │   │ jobs :3100   │   │  mongodb :27017  │  │   │
│  │  │ :5672       │   │ SSE + steps  │   │  threads LGraph  │  │   │
│  │  └──────┬──────┘   └──────┬───────┘   └──────────────────┘  │   │
│  └─────────┼────────────────┼─────────────────────────────────┘   │
│            │                 │ SSE                                  │
│  ┌─────────▼──────┐          │                                      │
│  │  ocr/ :3201    │          └─────────────────────────────────┐    │
│  │  Python/FastAPI│                                            │    │
│  └─────────┬──────┘          ┌───────────────────────────────┐ │   │
│            │ RabbitMQ        │  analyzer/ :3300              │ │   │
│            └────────────────►│  NestJS + LangGraph           │ │   │
│                              │  MongoDBSaver (threads)       │◄┘   │
│                              └───────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Serviços

### `api/` — NestJS :3000

API principal da aplicação. Gerencia projetos, usuários, permissões e orquestra o início do pipeline de análise.

**Stack:** NestJS, TypeScript, Postgres (Knex), AWS S3, RabbitMQ, JWT  
**Container:** `fiap-api`

**Módulos relevantes para análise:**
- `ProjectsModule` — CRUD de projetos + endpoints de análise
- `JobsModule` (`infra/jobs/`) — client HTTP para `platform-jobs`, geração de `streamToken` JWT
- `DocumentsModule` (`infra/documents/`) — upload para S3 com geração de thumbnail
- `AwsModule` (`infra/aws/`) — S3Service com presigned URLs

**Endpoints de análise:**

| Método | Path | Handler | Descrição |
|---|---|---|---|
| `POST` | `/projects/:id/analysis` | `UploadProjectAnalysisHandler` | Upload do diagrama, cria job, publica na fila OCR |
| `POST` | `/projects/:id/analysis/reply` | `ReplyProjectAnalysisHandler` | Proxy da resposta para o analyzer |
| `GET` | `/projects/:id/analysis/token` | `GetAnalysisTokenHandler` | Gera novo streamToken para job existente |

**Fluxo de `POST /projects/:id/analysis`:**
1. Verifica se o projeto existe
2. `JobsService.create()` → cria job no platform-jobs, assina JWT `{ jobId, tenantId }` como `streamToken`
3. `DocumentsService.upload()` → salva arquivo no S3 com `namePrefix = jobId`
4. Atualiza projeto: `analysis_document_id`, `analysis_job_id`
5. Gera presigned URL do arquivo (3 dias)
6. Adiciona step `api-upload`
7. Publica na exchange `_1_1_exc-ocr`: `{ jobId, projectId, fileUrl, fileName }`
8. Retorna `{ jobId, streamToken }`

---

### `ocr/` — Python/FastAPI :3201

Serviço de extração de texto de PDFs e imagens. Recebe mensagens da fila, processa e publica para o analyzer.

**Stack:** Python, FastAPI, aio-pika, pdfplumber, pytesseract, boto3, httpx  
**Container:** `fiap-ocr`

**Processamento de mensagem (consumer `_1_1_queue-ocr`):**
1. Marca job como `RUNNING`
2. Baixa arquivo via presigned URL
3. Detecta tipo: PDF → `PdfExtractor` (pdfplumber); imagem → `ImageExtractor` (pytesseract)
4. `OcrResult`: `{ file_type, total_pages, pages: [{ page_number, text }], full_text }`
5. Serializa como JSON e salva no S3: `projects/{projectId}/analysis/{jobId}_ocr.json`
6. Gera presigned URL do JSON OCR (3 dias)
7. Adiciona step `ocr-extract`: `{ file_type, total_pages, chars, ocr_result_url }`
8. Publica na exchange `_1_1_exc-analyzer`: `{ jobId, projectId, fileUrl, fileName, ocrResultUrl }`

**Nota:** pdfplumber extrai texto embutido sem OCR. pytesseract usa o binário `tesseract-ocr` instalado no sistema (`tesseract-ocr-por` e `tesseract-ocr-eng` para português e inglês).

---

### `analyzer/` — NestJS/LangGraph :3300

Coração da análise. Orquestra um grafo LangGraph multimodal com human-in-the-loop e persistência MongoDB.

**Stack:** NestJS, TypeScript, LangChain, LangGraph, MongoDBSaver, amqplib  
**Container:** `fiap-analyzer`

#### LangGraph — `infra/graph/analysis.graph.ts`

O grafo tem três nós e state persistido via `MongoDBSaver` (db `analyzer` em `platform-mongodb`):

```
START
  │
  ▼
extractArchitecture
  │  LLM recebe: SystemMessage(ANALYZE_PROMPT) + messages history + HumanMessage(multimodal)
  │  Retorna: { architecture_json: {...}, questions: [...] }
  │
  ├── questions.length > 0 ──► waitForHuman
  │                                │  interrupt(pendingQuestions)
  │                                │  Aguarda: graphService.resume(sessionId, answer)
  │                                │  Adiciona HumanMessage(answer) ao histórico
  │                                └──► extractArchitecture  (loop)
  │
  └── sem dúvidas ──► evaluateArchitecture
                            │  LLM avalia o JSON extraído
                            │  Retorna: { score, summary, strengths, weaknesses, recommendations }
                            ▼
                           END
```

**State (`AnalysisAnnotation`):**
```typescript
{
    messages: BaseMessage[]          // histórico de mensagens (LangChain MessagesAnnotation)
    sessionId: string                // = jobId
    filename: string
    fileContentBase64: string        // arquivo original em base64
    fileMimeType: string             // 'application/pdf' | 'image/*'
    ocrText: string                  // texto completo extraído pelo OCR
    architectureJson: ArchitectureJson | null
    pendingQuestions: string[]       // perguntas do LLM (vazio = nenhuma dúvida)
    evaluation: EvaluationResult | null
}
```

**Conteúdo multimodal enviado ao LLM:**
- Se PDF + provider Anthropic: bloco `document` (base64) + texto OCR
- Se imagem: bloco `image_url` (base64) + texto OCR
- Outros: só texto OCR

**Prompts:**
- `ANALYZE_PROMPT`: instrui a sempre extrair JSON mesmo que parcial; listar dúvidas separadamente; refinar JSON quando há respostas no histórico
- `EVALUATE_PROMPT`: avalia o JSON extraído e retorna nota + relatório

#### Consumer RabbitMQ — `infra/rabbitmq/consumers/analysis-request.consumer.ts`

Consome `_1_1_queue-analyzer`:
1. Baixa arquivo original via URL (axios, converte para base64)
2. Baixa OcrResult JSON via URL (axios)
3. Chama `AnalysisGraphService.start()` com todos os dados
4. Delega tratamento do estado para `AnalysisPipelineService`
5. Em caso de erro: marca job como `FAILED`

#### AnalysisPipelineService — `infra/jobs/analysis-pipeline.service.ts`

Traduz o estado do grafo em operações no `platform-jobs`:

```
state.pendingQuestions.length > 0
  → addStep "analyzer-awaiting-reply" { questions }
  → job permanece RUNNING (usuário precisa responder)

state.evaluation !== null
  → addStep "analyzer-result" { score, summary, strengths, weaknesses, recommendations, components_count }
  → patchStatus "DONE"
```

#### Endpoints HTTP do Analyzer

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/analysis` | Inicia análise direta (sem pipeline; usado em testes) |
| `POST` | `/analysis/:id/reply` | Retoma grafo com resposta; chama `AnalysisPipelineService` |
| `GET` | `/analysis/:id` | Lê estado atual da sessão LangGraph |

---

### `web-admin/` — Vue 3/Vite :5173

Frontend SPA com Tailwind CSS v4, Radix Vue e Lucide Vue.

**Fluxo de análise no frontend:**

1. Usuário clica em "Upload de análise" no menu do card → `ProjectsView.vue` abre file picker
2. Arquivo selecionado → `store.uploadAnalysis()` → `POST /projects/:id/analysis`
3. API retorna `{ jobId, streamToken }` → `activeAnalysis` é preenchido → `ProjectAnalysisPanel` monta
4. Panel conecta ao SSE via `useJobStream(jobId, streamToken)`
5. Eventos SSE atualizam `job.value` reativamente → UI atualiza em tempo real

**Para projetos com análise existente:**
1. Usuário clica "Ver análise" → `store.getAnalysisToken(id)` → `GET /projects/:id/analysis/token`
2. API gera novo JWT para o job existente → retorna `{ jobId, streamToken }`
3. Panel abre com conexão SSE ao job (já DONE → exibe resultado imediatamente)

#### `composables/useJobStream.ts`

```typescript
// Conecta ao SSE e expõe job reativo
const { job, error } = useJobStream(jobId, streamToken)

// job.value é JobOutput:
// { id, status: 'CREATED'|'RUNNING'|'DONE'|'FAILED', steps: JobStep[], ... }

// Conexão abortada automaticamente no onUnmounted
```

#### `components/projects/ProjectAnalysisPanel.vue`

Drawer deslizando da direita. Estados visuais baseados nos steps e status do job:

| Condição | Visual |
|---|---|
| `job === null` | Spinner "Conectando..." |
| `status === 'RUNNING'` sem steps significativos | "Processando o arquivo..." |
| Step `ocr-extract` presente | Etapa OCR marcada como ✓ |
| Step `analyzer-awaiting-reply` presente | Formulário de resposta às perguntas |
| `status === 'DONE'` + step `analyzer-result` | Score + resumo + pontos fortes/fracos + recomendações |
| `status === 'FAILED'` | Mensagem de erro |

**Etapas do pipeline (indicador visual):**
1. Upload recebido — sempre ✓
2. Extração de texto (OCR) — ✓ quando `ocr-extract` existe
3. Análise de arquitetura — ⏸ quando aguardando resposta, ✓ quando há questions ou result
4. Avaliação final — ✓ quando DONE

---

## Tipos de dados

### `AnalysisUploadOutput` (retorno do upload)
```typescript
{ jobId: string; streamToken: string }
```

### `JobOutput` (estado do job via SSE)
```typescript
{
    id: string
    status: 'CREATED' | 'RUNNING' | 'DONE' | 'FAILED'
    steps: JobStep[]
    createdAt: string
    updatedAt: string
}
```

### `JobStep`
```typescript
{ name: string; data: Record<string, any>; status: number; createdAt: string }
```

### `ArchitectureJson` (extraído pelo LLM)
```typescript
{
    components: Array<{ name, type, description, responsibilities: string[] }>
    relationships: Array<{ from, to, type, description }>
    patterns: string[]
    technologies: string[]
}
```

### `EvaluationResult` (avaliação do LLM)
```typescript
{
    score: number            // 0-10
    summary: string          // resumo executivo
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
}
```

---

## Infraestrutura compartilhada (platform)

Os serviços de cliente (`api/`, `ocr/`, `analyzer/`) se conectam à rede Docker `platform_default` para acessar:

| Serviço | Endereço interno | Papel |
|---|---|---|
| `platform-jobs` | `http://platform-jobs:3100` | Jobs assíncronos + SSE |
| `platform-rabbitmq` | `amqp://guest:guest@platform-rabbitmq:5672` | Mensageria |
| `platform-mongodb` | `mongodb://admin:secret@platform-mongodb:27017` | Threads LangGraph |
| `platform-postgres` | — | Banco de dados da API |

### platform-jobs

Gerencia jobs assíncronos e SSE. API simples:

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/jobs` | Cria job: `{ tenantId, type, payload? }` → `{ jobId }` |
| `POST` | `/jobs/:id/steps` | Adiciona step (mantém RUNNING): `{ name, data, status }` |
| `PATCH` | `/jobs/:id` | Altera status: `{ status: 'DONE'|'FAILED', error? }` |
| `GET` | `/jobs/:id/stream?token=…` | SSE stream do job (token JWT obrigatório) |

O `streamToken` é um JWT assinado com `COGNITE_JOBS_SECRET`:
```json
{ "jobId": "...", "tenantId": "_1_1", "iat": ..., "exp": ... }
```

---

## Como rodar em desenvolvimento

```bash
# Na raiz do monorepo _1_1/
docker compose up --build

# Subir só o analyzer (útil ao atualizar LangChain)
docker compose up fiap-analyzer --build

# Forçar reinstalação de dependências do analyzer
docker exec fiap-analyzer npm install --legacy-peer-deps
docker restart fiap-analyzer
```

**Arquivos `.env` necessários (copiar de `.env.example`):**
- `analyzer/.env` — preencher `ANTHROPIC_API_KEY`
- `api/.env` — preencher `COGNITE_JOBS_SECRET` (mesmo valor do platform-jobs)
- `web-admin/.env` — já tem valores default para dev local

---

## Decisões de design relevantes

### Por que o LLM sempre extrai JSON antes de perguntar

O fluxo original avaliava primeiro se havia dúvidas. Mudado para: **extrair JSON primeiro, perguntar depois**. Motivo: o JSON precisará ser salvo no banco futuramente. Mesmo que incompleto, é mais útil ter uma extração parcial do que nada. As perguntas refinam o JSON já extraído.

### Por que MongoDBSaver em vez de MemorySaver

`MemorySaver` é in-memory: reiniciar o container apaga todas as sessões ativas. No caso de human-in-the-loop, o usuário pode demorar minutos ou horas para responder — neste intervalo o container pode ser reiniciado. `MongoDBSaver` persiste o estado no MongoDB compartilhado.

### Por que o `streamToken` expira em 2h

O SSE é uma conexão de longa duração. 2h é suficiente para uma análise completa (incluindo múltiplos ciclos de perguntas/respostas). O endpoint `GET /projects/:id/analysis/token` gera um novo token para retomar a visualização de análises já concluídas.

### Por que `--legacy-peer-deps` no Dockerfile do analyzer

`@langchain/anthropic@1.4.0` (necessário para corrigir o bug `top_p: -1` da versão anterior) tem conflitos de peer dependencies com outras libs do LangChain. A flag resolve sem forçar resoluções incorretas.

### Nomenclatura de arquivos no S3

Antes: PDF e JSON OCR tinham timestamps diferentes, dificultando correlação manual. Agora: ambos usam `{jobId}` como prefixo — `{jobId}_original.{ext}` e `{jobId}_ocr.json`.

---

## Guia de debugging

### Verificar pipeline completo

```bash
# Logs em tempo real de todos os serviços
docker logs fiap-api -f
docker logs fiap-ocr -f
docker logs fiap-analyzer -f

# Buscar logs de um job específico
docker logs fiap-analyzer 2>&1 | grep "job=<jobId>"
```

### Verificar estado do LangGraph no MongoDB

```bash
docker exec -it platform-mongodb mongosh -u admin -p secret
use analyzer
db.checkpoints.find({ thread_id: "<jobId>" }).sort({ ts: -1 }).limit(1)
```

### Testar analyzer diretamente (sem pipeline)

```bash
# Iniciar análise
curl -X POST http://localhost:3300/analysis \
  -F "file=@/caminho/para/diagrama.pdf"

# Responder perguntas
curl -X POST http://localhost:3300/analysis/<sessionId>/reply \
  -H "Content-Type: application/json" \
  -d '{"answer": "O componente X é um microserviço REST..."}'

# Ver estado
curl http://localhost:3300/analysis/<sessionId>
```

### Erros comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `BadRequestError: top_p: -1` | `@langchain/anthropic` desatualizado | Não regredir abaixo de `1.4.0` |
| `TS2307: Cannot find module 'amqplib'` | Volume `analyzer_modules` stale | `docker rm -f fiap-analyzer && docker volume rm 1_1_analyzer_modules && docker compose up fiap-analyzer --build -d` |
| Panel SSE sem updates | `COGNITE_JOBS_SECRET` diferente entre API e platform-jobs | Verificar `.env` dos dois serviços |
| Analyzer não recebe mensagem | Exchange/queue mal declaradas | Verificar `exchanges.ts` e `queues.ts` no analyzer |
