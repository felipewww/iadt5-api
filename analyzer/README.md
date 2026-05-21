# Analyzer Service

Serviço de análise de qualidade de arquitetura de software. Recebe um PDF ou imagem de diagrama, extrai a estrutura arquitetural via LLM multimodal e gera um relatório de avaliação com score e recomendações.

**Stack:** NestJS · TypeScript · LangGraph.js · LangChain · Anthropic / OpenAI

---

## Variáveis de ambiente

```bash
cp .env.example .env
```

| Variável | Descrição | Padrão |
|---|---|---|
| `APP_PORT` | Porta HTTP | 3300 |
| `OCR_SERVICE_URL` | URL do serviço OCR | `http://localhost:3201` |
| `LLM_PROVIDER` | Provider de IA: `anthropic` ou `openai` | `anthropic` |
| `LLM_MODEL` | Modelo a usar | `claude-opus-4-5` |
| `ANTHROPIC_API_KEY` | API key da Anthropic | — |
| `OPENAI_API_KEY` | API key da OpenAI | — |

> Em Docker, `OCR_SERVICE_URL` é sobrescrito automaticamente para `http://ocr:3201`.

---

## Rodando localmente

```bash
npm install
npm run start:dev
```

Ou via Docker (a partir da raiz do projeto):

```bash
docker compose up ocr analyzer --build
```

---

## Endpoints

### `POST /analysis`

Inicia uma nova análise. Recebe o arquivo e retorna o `sessionId`.

**Request:** `multipart/form-data`

| Campo | Tipo |
|---|---|
| `file` | PDF ou imagem da arquitetura |

**Response:**

```json
{
    "data": {
        "sessionId": "uuid",
        "status": "completed" | "awaiting_user",
        "filename": "arch.pdf",
        "pendingQuestions": [],
        "evaluation": { ... } | null
    }
}
```

Se `status === "awaiting_user"`, o LLM teve dúvidas — `pendingQuestions` contém as perguntas a exibir ao usuário.

---

### `POST /analysis/:id/reply`

Responde às dúvidas do LLM e retoma o fluxo.

**Body:**

```json
{ "answer": "O componente A é um API Gateway que roteia para os microsserviços B e C." }
```

**Response:** mesmo formato do `POST /analysis`.

---

### `GET /analysis/:id`

Retorna o estado atual da sessão.

---

## Fluxo do grafo (LangGraph)

```
POST /analysis
    │
    ▼
[OCR Service] → extrai texto
    │
    ▼
[analyzeDocument] — LLM multimodal (PDF + texto OCR)
    │
    ├── tem dúvidas? ──► status: awaiting_user
    │                         │
    │                    POST /reply
    │                         │
    │                    [waitForHuman] ──► volta para analyzeDocument
    │
    └── sem dúvidas ──► architectureJson extraído
                              │
                              ▼
                    [evaluateArchitecture] — LLM avalia JSON
                              │
                              ▼
                      status: completed
                      evaluation: { score, summary, strengths, weaknesses, recommendations }
```

O grafo usa `MemorySaver` do LangGraph para persistir estado entre as chamadas HTTP. Cada `sessionId` é um `thread_id` isolado.

---

## Documentação interativa

Com o serviço rodando:
- Swagger UI: `http://localhost:3300/api/docs`
- Scalar Reference: `http://localhost:3300/api/reference`

---

## Arquitetura

```
src/
├── domain/
│   ├── dtos/analysis/        # Commands (start, reply) e Outputs
│   └── read-models/analysis/ # AnalysisSessionReadModel, EvaluationReadModel
├── application/
│   └── analysis/
│       ├── analysis.mapper.ts          # AnalysisState → ReadModel
│       ├── controllers/                # POST /analysis, POST /:id/reply, GET /:id
│       └── domain/commands+queries/    # Handlers: start, reply, get
└── infra/
    ├── config.ts              # Configuração tipada via env
    ├── llm/                   # LlmService: Anthropic ou OpenAI configurável
    ├── ocr/                   # OcrService: HTTP client para o serviço OCR
    └── graph/
        ├── analysis.state.ts  # AnalysisAnnotation (estado do LangGraph)
        └── analysis.graph.ts  # AnalysisGraphService: nós, arestas e lógica do grafo
```
