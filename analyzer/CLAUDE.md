# CLAUDE.md — analyzer/

Documentação técnica de referência para o assistente de IA. Leia este arquivo sempre que for trabalhar dentro de `analyzer/`.

---

## O que é

Serviço NestJS que orquestra a análise de qualidade de arquitetura de software. Recebe um PDF ou imagem, extrai texto via `ocr/`, e usa um grafo LangGraph para:
1. Mapear a arquitetura para JSON estruturado via LLM multimodal
2. Pausar e perguntar ao usuário se houver ambiguidades (human-in-the-loop)
3. Avaliar a arquitetura e gerar score + relatório

- **Porta:** 3300
- **LLM:** configurável via env (`anthropic` ou `openai`)

---

## Arquitetura e camadas (`src/`)

```
src/
├── domain/
│   ├── dtos/analysis/
│   │   ├── commands/    # StartAnalysisCommand, ReplyAnalysisCommand
│   │   └── outputs/     # AnalysisSessionOutput, EvaluationOutput
│   └── read-models/analysis/
│       ├── analysis-session.read-model.ts  # AnalysisStatus, AnalysisSessionReadModel
│       └── evaluation.read-model.ts
├── application/
│   └── analysis/
│       ├── analysis.mapper.ts          # AnalysisState (infra) → AnalysisSessionReadModel (domain)
│       ├── controllers/analysis.controller.ts
│       └── domain/
│           ├── commands/               # StartAnalysisHandler, ReplyAnalysisHandler
│           └── queries/                # GetAnalysisHandler
└── infra/
    ├── config.ts                       # config object tipado (llm, ocrServiceUrl, port)
    ├── infra.module.ts                 # @Global() — exporta LlmModule, OcrModule, GraphModule
    ├── framework/
    │   ├── handler.ts                  # interface Handler<I, O>
    │   ├── http/                       # GlobalInterceptor, HttpExceptionFilter
    │   └── swagger/swagger-setup.ts    # Scalar + Swagger UI em /api/reference e /api/docs
    ├── llm/
    │   └── llm.service.ts              # LlmService — cria ChatAnthropic ou ChatOpenAI por env
    ├── ocr/
    │   └── ocr.service.ts              # OcrService — HTTP client para o serviço ocr/
    └── graph/
        ├── analysis.state.ts           # AnalysisAnnotation (LangGraph state)
        └── analysis.graph.ts           # AnalysisGraphService — grafo compilado com MemorySaver
```

**Regras de dependência** (igual ao `api/`):
- `domain` não importa de `application` nem de `infra`
- `application` pode importar de `domain` e `infra`
- `infra` não importa de `application`
- `analysis.mapper.ts` fica em `application/` pois precisa importar de ambas as camadas

Imports sempre via alias `@/` (mapeia para `src/`).

---

## Grafo LangGraph (`infra/graph/analysis.graph.ts`)

```
START
  │
  ▼
analyzeDocument          ← LLM multimodal (PDF + OCR text) → ArchitectureJson ou questions[]
  │
  ├── pendingQuestions.length > 0 ──► waitForHuman   ← interrupt(questions)
  │                                        │
  │                                   POST /analysis/:id/reply
  │                                        │
  │                                   Command({ resume: answer })
  │                                        │
  │                                   ◄────┘ (loop)
  │
  └── sem dúvidas ──► evaluateArchitecture  ← LLM avalia JSON → score + relatório
                              │
                             END
```

- **`MemorySaver`** persiste o estado entre chamadas HTTP por `thread_id` (= `sessionId`)
- **`interrupt()`** pausa o grafo; retomado via `graph.invoke(new Command({ resume }))`
- **`getState(sessionId)`** lê o snapshot atual sem avançar o grafo

### Status derivado do estado

| Condição | Status |
|---|---|
| `state.evaluation !== null` | `completed` |
| `state.pendingQuestions.length > 0` | `awaiting_user` |
| caso contrário | `analyzing` |

---

## LLM Service (`infra/llm/llm.service.ts`)

Cria o modelo baseado em `config.llm.provider`:
- `anthropic` → `ChatAnthropic` (default: `claude-opus-4-5`)
- `openai` → `ChatOpenAI`

O `ChatOpenAI` usa `as unknown as BaseChatModel` para contornar inferência TypeScript excessivamente profunda dos tipos do LangChain — comportamento esperado, não um bug.

---

## OCR Service (`infra/ocr/ocr.service.ts`)

Faz `POST` multipart para `config.ocrServiceUrl/ocr/extract`. Usa `new Uint8Array(fileBuffer)` ao criar o `Blob` para compatibilidade de tipos (`Buffer` → `ArrayBufferView<ArrayBuffer>`).

Em Docker, a env `OCR_SERVICE_URL` é sobrescrita pelo compose para `http://ocr:3201`.

---

## Endpoints

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/analysis` | Inicia análise — `multipart/form-data` com campo `file` |
| `POST` | `/analysis/:id/reply` | Responde dúvidas da IA — body `{ answer: string }` |
| `GET` | `/analysis/:id` | Lê estado atual da sessão |

Response sempre envolto em `{ data: ... }` pelo `GlobalInterceptor`.

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `APP_PORT` | 3300 | Porta HTTP |
| `OCR_SERVICE_URL` | `http://localhost:3201` | URL do serviço OCR |
| `LLM_PROVIDER` | `anthropic` | `anthropic` ou `openai` |
| `LLM_MODEL` | `claude-opus-4-5` | Modelo a usar |
| `ANTHROPIC_API_KEY` | — | Obrigatório se provider = anthropic |
| `OPENAI_API_KEY` | — | Obrigatório se provider = openai |

---

## Scripts

```bash
npm run start:dev   # watch mode
npm run build       # compila para dist/
npm run lint        # ESLint + autofix
```

---

## Estado atual (maio 2026)

- Build Docker funcional ✅
- Dependências instaladas (`npm install`) ✅
- `.env` criado a partir do `.env.example` — **falta preencher as API keys**
- `MemorySaver` é in-memory: reiniciar o container apaga todas as sessões ativas
