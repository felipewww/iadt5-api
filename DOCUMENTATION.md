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
│  │  web-admin   │◄───────────►│  api/  :3000                    │   │
│  │  Vue 3/Vite  │             │  NestJS + Postgres + S3         │   │
│  │  :5173       │             └──────────────┬──────────────────┘   │
│  └──────▲───────┘                            │ RabbitMQ             │
│    SSE  │                                    ▼                     │
│  ┌──────┴──────┐◄─HTTP steps─┌───────────────────────────────────┐  │
│  │ jobs :3100  │             │  ocr/  :3201                      │  │
│  │ steps + SSE │             │  Python/FastAPI                   │  │
│  └─────────────┘             │  pdfplumber + tesseract           │  │
│                              └─────────────────┬─────────────────┘  │
│                                                │ RabbitMQ           │
│                                                ▼                    │
│                              ┌───────────────────────────────────┐  │
│                              │  analyzer/  :3300                 │  │
│                              │  NestJS + LangGraph               │  │
│                              │  MongoDBSaver (MongoDB)           │  │
│                              └───────────────────────────────────┘  │
│                                                                     │
│  Infra: Postgres · RabbitMQ · MongoDB · S3  (no próprio compose)   │
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
- `JobsModule` (`infra/jobs/`) — client HTTP para `infra-iadt-jobs`, geração de `streamToken` JWT
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
2. `JobsService.create()` → cria job no `infra-iadt-jobs`, assina JWT `{ jobId, tenantId }` como `streamToken`
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

O grafo tem três nós e state persistido via `MongoDBSaver` (db `analyzer` em `infra-iadt-mongodb`):

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

Traduz o estado do grafo em operações no `infra-iadt-jobs`:

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

## Infraestrutura

Toda a infraestrutura está declarada no `docker-compose.yml` do próprio monorepo — não há dependência de repositório externo.

| Container | Endereço interno | Papel |
|---|---|---|
| `infra-iadt-jobs` | `http://infra-iadt-jobs:3100` | Jobs assíncronos + SSE |
| `infra-iadt-rabbitmq` | `amqp://guest:guest@infra-iadt-rabbitmq:5672` | Mensageria |
| `infra-iadt-mongodb` | `mongodb://infra-iadt-mongodb:27017` | Threads LangGraph |
| `infra-iadt-postgres` | `postgres://admin:secret@infra-iadt-postgres:5432` | Banco de dados da API |

### infra-iadt-jobs

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
- `analyzer/.env` — preencher `ANTHROPIC_API_KEY` (ou `OPENAI_API_KEY`)
- `api/.env` — demais variáveis já têm valores funcionais para dev local
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

### Por que o S3 é usado como bus de arquivos entre serviços

Os serviços do pipeline (OCR, Analyzer) são assíncronos e se comunicam via RabbitMQ. Colocar o conteúdo binário do arquivo diretamente na mensagem seria inviável: RabbitMQ não foi projetado para payloads grandes e isso saturaria a memória do broker rapidamente para arquivos de 5–10 MB.

**Estratégia adotada:** a `api` faz o único upload do arquivo para o S3 e gera uma **presigned URL** com validade de 3 dias. A partir daí, todos os serviços trafegam apenas essa URL — nunca o binário.

```
Usuário → api → S3 (upload original)
                 └─ presigned URL → RabbitMQ → ocr (baixa, processa)
                                                └─ salva OCR JSON no S3
                                                └─ presigned URL do OCR → RabbitMQ → analyzer (baixa JSON + arquivo)
```

**Benefícios:**

| Benefício | Detalhe |
|---|---|
| Mensagens leves no broker | RabbitMQ trafega apenas strings de URL, independente do tamanho do arquivo |
| Serviços desacoplados | Nenhum serviço conhece o endereço do outro; apenas consomem a URL da mensagem |
| Resiliência a retries | Se OCR ou Analyzer falharem e a mensagem for reenfileirada, a URL ainda é válida (3 dias) |
| Rastreabilidade | Arquivo original e resultado OCR ficam acessíveis para inspeção manual durante esse período |

**O que vai para o S3:**

| Arquivo | Caminho | Quem grava | Quem lê |
|---|---|---|---|
| Diagrama original | `projects/{projectId}/analysis/{jobId}_original.{ext}` | `api` | `ocr`, `analyzer` |
| Resultado OCR (JSON) | `projects/{projectId}/analysis/{jobId}_ocr.json` | `ocr` | `analyzer` |
| Thumbnail do projeto | `projects/{projectId}/thumbnail.{ext}` | `api` (upload de capa) | `api` (presigned GET) |

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
docker exec -it infra-iadt-mongodb mongosh
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
| Panel SSE sem updates | `COGNITE_JOBS_SECRET` diferente entre `api/` e `jobs/` | Verificar `.env` dos dois serviços |
| Analyzer não recebe mensagem | Exchange/queue mal declaradas | Verificar `exchanges.ts` e `queues.ts` no analyzer |

---

## Justificativa da abordagem de IA

### Por que LLM multimodal com grafo explícito (LangGraph)

Diagramas de arquitetura de software não seguem um schema fixo: cada equipe usa notações diferentes (UML, C4, caixas livres, setas coloridas, etc.). Abordagens baseadas em regras ou parsers deterministicos falham quando a notação muda. Um LLM multimodal consegue inferir intenção mesmo com notação inconsistente, nomes ambíguos ou texto parcialmente legível.

O uso do **LangGraph** em vez de uma chamada única ao LLM traz três vantagens:

1. **Controle explícito do fluxo** — cada nó tem responsabilidade única (extrair, perguntar, avaliar). O pipeline não é uma caixa-preta; cada transição é auditável.
2. **Human-in-the-loop estruturado** — o `interrupt()` pausa o grafo de forma determinística, persiste o estado no MongoDB e retoma exatamente do ponto correto após a resposta do usuário. Isso é impossível com chamadas LLM stateless.
3. **Separação entre extração e avaliação** — o nó `extractArchitecture` produz um JSON estruturado que o nó `evaluateArchitecture` avalia de forma independente. Isso reduz o risco de o LLM "inventar" uma avaliação sem base em dados concretos.

A combinação **OCR + LLM** é adotada porque: (a) o OCR extrai texto embutido de forma barata e determinística; (b) o LLM recebe esse texto junto com o arquivo original como contexto multimodal, o que melhora a extração de componentes cujos nomes aparecem nas labels visuais.

### Por que a extração de texto precede a chamada multimodal

A primeira passagem usa **somente o texto OCR** (mais barato). A chamada multimodal (com o arquivo completo em base64) só é feita se nenhum componente for identificado na passagem de texto. Para diagramas com labels textuais ricas — a maioria dos casos — isso evita o custo adicional da entrada multimodal.

---

## Segurança

### Autenticação e autorização

- **JWT (JSON Web Token)** — access token com expiração de 15 minutos; refresh token de 7 dias. Implementado em `api/src/application/auth/`.
- **RBAC por grupo** — permissões são definidas em `permissions.config.ts` como código, não como dados. Cada endpoint protegido declara `@Roles(SysModules.X, [PermissionsContracts.Y])`. Grupos recebem permissões explícitas; sem permissão, a request é rejeitada com `403 Forbidden`.
- **HashId (ofuscação de IDs)** — todos os IDs numéricos são convertidos para tokens HMAC-SHA256 na borda da API, prevenindo enumeração de recursos (IDOR). IDs internos nunca são expostos ao frontend.

### Validação e tratamento de entradas não confiáveis

A validação segue o princípio de **fail fast na borda mais próxima da origem**:

1. **Upload de arquivo** — tipo MIME validado contra whitelist (PDF, PNG, JPEG, GIF, WEBP) e tamanho limitado a 5 MB no handler `UploadProjectAnalysisHandler`, antes de qualquer I/O (S3, RabbitMQ, banco). Rejeita com `400 Bad Request`.
2. **Body e query string** — `ValidationPipe` global com `class-validator` valida todos os DTOs. Campos desconhecidos são descartados (`whitelist: true`).
3. **Saída do LLM** — `withStructuredOutput(AnalysisOutputSchema)` força o modelo a retornar JSON válido conforme o schema Zod. Se o schema não for satisfeito, a chamada lança exceção antes de propagar dados inválidos. Ver seção [Guardrails implementados](#guardrails-implementados).

### Uso controlado de modelos de IA

- **Escopo restrito** — o LLM é invocado exclusivamente para duas tarefas bem definidas: extração de componentes/relacionamentos e avaliação de qualidade. O prompt de sistema delimita explicitamente o domínio (arquitetura de software).
- **Saída estruturada e previsível** — o modelo nunca retorna texto livre: `withStructuredOutput` força JSON com tipos conhecidos. Campos array têm default `[]`; nunca `null`.
- **Limite de iterações** — `MAX_ITERATIONS = 3` no grafo impede que o LLM gere perguntas indefinidamente. Após o limite, o grafo prossegue para avaliação com o que foi extraído.
- **Separação de responsabilidades** — extração e avaliação são nós separados no grafo. O nó de avaliação recebe o JSON estruturado como entrada, não o arquivo original, reduzindo o espaço para alucinações narrativas.

### Tratamento seguro de falhas da IA

- Qualquer exceção no grafo LangGraph é capturada no `AnalysisRequestConsumer`: um step `analyzer-error` é adicionado ao job com a mensagem descritiva, e o status é marcado como `FAILED`.
- O frontend lê o step `analyzer-error` via SSE e exibe a mensagem ao usuário com opção de reenviar o arquivo.
- Mensagens RabbitMQ rejeitadas são reenfileiradas automaticamente pelo broker se ainda não foram reentregues (`!redelivered`), evitando perda silenciosa de trabalho.
- Arquivos sem componentes identificáveis falham com erro orientativo antes de gerar perguntas ao usuário ou consumir tokens de avaliação.

### Comunicação segura entre serviços

| Canal | Mecanismo | Observação |
|---|---|---|
| Frontend → Jobs (stream SSE) | JWT assinado com `COGNITE_JOBS_SECRET` | Expira em 2h; gerado pela API após criar o job |
| API → Notifications | JWT assinado com `NOTIFICATIONS_SECRET` | Token de canal por usuário, expira em 1h |
| Serviços → RabbitMQ | Autenticação por usuário/senha | `guest/guest` em dev — **trocar em produção** |
| Serviços → S3 | AWS Access Key + Secret via variáveis de ambiente | Credenciais não commitadas (`.env` no `.gitignore`) |
| Inter-serviços (HTTP) | Rede Docker interna | Serviços não são expostos fora do compose |

### Riscos e limitações de segurança identificados

| Risco | Impacto | Mitigação atual |
|---|---|---|
| Credenciais padrão em dev (`guest/guest`, `change-me-in-production`) | Alto em produção | Documentadas; devem ser substituídas no deploy |
| Alucinação sutil do LLM (relacionamentos inferidos) | Médio | `consistency_issues` captura referências inválidas; alucinações semanticamente coerentes não são detectadas |
| Score não-determinístico | Baixo | Documentado como orientação, não métrica absoluta |
| Ausência de rate limiting no upload | Médio | Não implementado; recomendado em produção |
| Rastreabilidade limitada das chamadas ao LLM | Baixo | Rastreável por `jobId`; sem audit log dedicado |

---

## Guardrails implementados

Guardrails são mecanismos de controle que limitam entradas inválidas, forçam saídas estruturadas e evitam que o modelo produza resultados inutilizáveis ou entre em loops.

### Controle de entrada

| Guardrail | Onde | Comportamento |
|---|---|---|
| Whitelist de MIME type | `api/` — `UploadProjectAnalysisHandler` | Rejeita arquivos que não sejam PDF, PNG, JPEG, GIF ou WEBP com `400 Bad Request` antes do upload para S3 |
| Limite de tamanho (5 MB) | `api/` — `UploadProjectAnalysisHandler` | Rejeita arquivos maiores com `400 Bad Request` antes de criar o job ou fazer upload |

### Controle de saída

| Guardrail | Onde | Comportamento |
|---|---|---|
| Structured Output (Zod) | `analyzer/` — `analysis.graph.ts` | `withStructuredOutput(AnalysisOutputSchema)` força o LLM a retornar JSON válido. Se o schema não for satisfeito, a chamada lança exceção antes de propagar dados inválidos |
| Score limitado 0–10 | `analyzer/` — `EvaluationSchema` (Zod) | `z.number().min(0).max(10)` impede scores fora da escala |
| Arrays com default `[]` | `analyzer/` — `AnalysisOutputSchema` (Zod) | Campos como `components`, `relationships`, `patterns` e `technologies` nunca são `null` ou `undefined` |

### Mitigação de alucinações

| Mecanismo | Onde | Comportamento |
|---|---|---|
| Validação de conteúdo mínimo | `analyzer/` — `extractArchitecture` (grafo) | Se `components.length === 0` após texto E multimodal, lança erro com mensagem orientativa — evita que o LLM gere um relatório sobre um arquivo que não é um diagrama |
| Human-in-the-loop | `analyzer/` — `waitForHuman` (grafo) | Quando o LLM identifica ambiguidades, lista dúvidas específicas e aguarda resposta do usuário antes de prosseguir. A resposta é incorporada ao histórico e usada para refinar o JSON extraído |
| Limite de iterações (`MAX_ITERATIONS = 3`) | `analyzer/` — `extractArchitecture` (grafo) | Após 3 ciclos de perguntas/respostas, o grafo força a continuação para avaliação mesmo que o LLM ainda queira perguntar — evita loops infinitos |
| Validação de consistência | `analyzer/` — `AnalysisPipelineService` | Verifica se todos os `from`/`to` dos relacionamentos referenciam componentes existentes. Inconsistências são registradas em `consistency_issues` no step `analyzer-result` |

### Tratamento de falhas

| Mecanismo | Onde | Comportamento |
|---|---|---|
| Try-catch com step de erro | `analyzer/` — `AnalysisRequestConsumer` | Qualquer falha no pipeline adiciona o step `analyzer-error` com a mensagem descritiva e marca o job como `FAILED` |
| Requeue automático | `analyzer/` — `Consumer` base | Mensagem rejeitada é reenfileirada pelo RabbitMQ se ainda não foi reentregue (`!redelivered`) |

---

## Limitações conhecidas do modelo

1. **OCR falha em diagramas de alta densidade visual** — imagens com muitos componentes sobrepostos, fontes pequenas ou baixa resolução produzem texto OCR incompleto. O LLM recebe o arquivo original via multimodal, mas a qualidade da extração depende da legibilidade visual.

2. **O LLM pode inferir relacionamentos não explícitos** — se o diagrama sugere uma conexão mas não a desenha explicitamente, o modelo pode incluí-la no JSON com base em padrões arquiteturais conhecidos. Isso é detectável pelo campo `consistency_issues` apenas quando o nome do componente está errado; inferências sutis não são capturadas.

3. **Score subjetivo e não-determinístico** — a nota de 0 a 10 varia entre chamadas para o mesmo diagrama. Dois usuários que analisam o mesmo arquivo podem receber scores diferentes. O score deve ser interpretado como orientação, não como métrica absoluta.

4. **Componentes implícitos não detectados** — elementos de infraestrutura comuns não desenhados (CDN, load balancer, firewall) não aparecem no JSON extraído, mesmo que sejam pressupostos pela arquitetura descrita.

5. **Limite de contexto em diagramas complexos** — PDFs com muitas páginas ou imagens de alta resolução consomem grande parte da janela de contexto do LLM. Arquiteturas muito grandes podem ter componentes ignorados ou descrições truncadas.

6. **Dependência de qualidade do OCR para a passagem barata** — a estratégia de text-first só funciona bem quando o diagrama contém labels textuais legíveis. Diagramas puramente visuais (sem texto nas caixas) sempre caem no caminho multimodal, que é mais caro e mais lento.

7. **Human-in-the-loop não garante convergência** — mesmo com o limite de 3 iterações, o LLM pode não incorporar adequadamente uma resposta do usuário se ela contradiz fortemente o que foi extraído visualmente. O histórico de mensagens mitiga isso, mas não elimina o problema.
