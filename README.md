# Fiap SS — Pipeline de Análise de Arquitetura

Sistema SaaS para avaliação automática de diagramas de arquitetura de software. O usuário faz upload de um PDF ou imagem, e um pipeline de IA extrai os componentes, avalia a qualidade da arquitetura e gera um relatório com score, pontos fortes, pontos fracos e recomendações.

---

## Arquitetura geral

```
┌─────────────────────────────────────────────────────────────────┐
│  Monorepo _1_1/                                                 │
│                                                                 │
│  ┌──────────────┐   HTTP    ┌──────────────────────────────┐   │
│  │  web-admin   │◄─────────►│  api  :3000                  │   │
│  │  Vue 3/Vite  │           │  NestJS + Postgres + RabbitMQ│   │
│  │  :5173       │           └──────────────┬───────────────┘   │
│  └──────────────┘                          │ RabbitMQ           │
│                                            ▼                   │
│                              ┌─────────────────────────┐       │
│  ┌─────────────┐             │  ocr  :3201             │       │
│  │ jobs :3100  │◄────────────│  Python/FastAPI          │       │
│  │ SSE + steps │             │  pdfplumber + tesseract  │       │
│  └──────┬──────┘             └──────────┬──────────────┘       │
│         │ SSE                           │ RabbitMQ              │
│         │                              ▼                        │
│         │              ┌───────────────────────────────┐        │
│         └─────────────►│  analyzer  :3300              │        │
│                        │  NestJS + LangGraph           │        │
│                        │  Anthropic / OpenAI           │        │
│                        └───────────────────────────────┘        │
│                                                                 │
│  Infra: Postgres · RabbitMQ · MongoDB (no próprio compose)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Serviços

| Serviço | Pasta | Stack | Porta | Responsabilidade |
|---|---|---|---|---|
| API | `api/` | NestJS, TypeScript, Postgres | 3000 | IAM, autenticação, projetos, orquestração do pipeline |
| OCR | `ocr/` | Python, FastAPI, pdfplumber, pytesseract | 3201 | Extração de texto de PDFs e imagens |
| Analyzer | `analyzer/` | NestJS, LangGraph, LangChain | 3300 | Análise de arquitetura com LLM multimodal |
| Web Admin | `web-admin/` | Vue 3, Vite, Tailwind CSS v4 | 5173 | Interface do usuário |
| Jobs | `jobs/` | — | 3100 | Gerenciamento de jobs assíncronos e SSE |

---

## Pipeline de análise

```
1. Usuário faz upload do diagrama (PDF ou imagem)
        │
        ▼
2. API valida o arquivo (tipo + tamanho ≤ 5 MB),
   cria job, salva no S3 e publica na fila OCR
        │
        ▼
3. OCR extrai texto (pdfplumber para PDF, tesseract para imagens)
   salva resultado no S3 e publica na fila Analyzer
        │
        ▼
4. Analyzer executa grafo LangGraph:

   extractArchitecture
   ├── Tenta primeiro com texto OCR (mais barato)
   ├── Se components = 0: escala para chamada multimodal (PDF/imagem + texto)
   ├── Se ainda components = 0: falha com mensagem orientativa
   │
   ├── Se LLM tem dúvidas (e iterações < 3):
   │       waitForHuman ──► usuário responde ──► extractArchitecture (loop)
   │
   └── Sem dúvidas (ou limite de 3 iterações atingido):
           evaluateArchitecture ──► score 0–10 + relatório

        │
        ▼
5. Frontend acompanha em tempo real via SSE
   e exibe o resultado assim que o job finaliza
```

---

## Pré-requisitos

- Docker e Docker Compose
- Chave de API: [Anthropic](https://console.anthropic.com) **ou** OpenAI

---

## Como subir

### 1. Clonar e preparar os `.env`

```bash
cp api/.env.example      api/.env
cp analyzer/.env.example analyzer/.env
cp web-admin/.env.example web-admin/.env
```

Edite `analyzer/.env` e preencha a chave do LLM:

```env
# Anthropic (padrão)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-opus-4-5
ANTHROPIC_API_KEY=sk-ant-...

# OU OpenAI
# LLM_PROVIDER=openai
# LLM_MODEL=gpt-4o
# OPENAI_API_KEY=sk-...
```

> As demais variáveis já têm valores funcionais para desenvolvimento local. Veja a seção [Variáveis de ambiente](#variáveis-de-ambiente) para detalhes.

### 2. Subir tudo

```bash
docker compose up --build
```

O compose sobe em ordem correta: infra (Postgres, RabbitMQ, MongoDB) → jobs → api → ocr → analyzer → web-admin.

### 3. Acessar

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API (Swagger) | http://localhost:3000/api/docs |
| API (Scalar) | http://localhost:3000/api/reference |
| RabbitMQ Management | http://localhost:15672 (guest/guest) |

---

## Usuário padrão

Na primeira execução as migrations criam um usuário root:

| Campo | Valor |
|---|---|
| E-mail | `root@root.com` |
| Senha | `Root@1234` |

---

## Variáveis de ambiente

### `api/.env`

| Variável | Padrão | Descrição |
|---|---|---|
| `APP_PORT` | `3000` | Porta HTTP da API |
| `JWT_SECRET` | `change-me-in-production` | Segredo JWT — **trocar em produção** |
| `HASH_ID_KEY` | `change-me-in-production` | Chave HMAC para ofuscação de IDs — **trocar em produção** |
| `DB_HOST` | `infra-iadt-postgres` | Host do Postgres (nome do container) |
| `DB_NAME` | `_1_1` | Nome do banco |
| `RMQ_HOST` | `infra-iadt-rabbitmq:5672` | Host do RabbitMQ |

### `analyzer/.env`

| Variável | Padrão | Descrição |
|---|---|---|
| `APP_PORT` | `3300` | Porta HTTP do analyzer |
| `LLM_PROVIDER` | `anthropic` | `anthropic` ou `openai` |
| `LLM_MODEL` | `claude-opus-4-5` | Modelo a usar |
| `ANTHROPIC_API_KEY` | — | **Obrigatório** se provider = anthropic |
| `OPENAI_API_KEY` | — | Obrigatório se provider = openai |
| `OCR_SERVICE_URL` | `http://ocr:3201` | URL do serviço OCR (interna ao Docker) |

### `web-admin/.env`

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | URL da API (acessada pelo browser) |

---

## Comandos úteis

```bash
# Rebuild de um serviço específico
docker compose up fiap-analyzer --build -d

# Logs em tempo real
docker logs fiap-api      -f
docker logs fiap-ocr      -f
docker logs fiap-analyzer -f

# Buscar logs de um job específico
docker logs fiap-analyzer 2>&1 | grep "job=<jobId>"

# Inspecionar estado LangGraph no MongoDB
docker exec -it infra-iadt-mongodb mongosh
use analyzer
db.checkpoints.find({ thread_id: "<jobId>" }).sort({ ts: -1 }).limit(1)

# Testar analyzer diretamente (sem passar pela API)
curl -X POST http://localhost:3300/analysis \
  -F "file=@/caminho/para/diagrama.pdf"

curl -X POST http://localhost:3300/analysis/<sessionId>/reply \
  -H "Content-Type: application/json" \
  -d '{"answer": "O componente X é um gateway REST..."}'
```

---

## Guardrails de IA

| Tipo | Mecanismo | Onde |
|---|---|---|
| Entrada | Whitelist MIME type (PDF, PNG, JPEG, GIF, WEBP) | `api/` |
| Entrada | Limite de tamanho (5 MB) | `api/` |
| Saída | Structured Output via Zod (`withStructuredOutput`) | `analyzer/` |
| Saída | Score limitado 0–10 pelo schema | `analyzer/` |
| Alucinação | Bloqueio quando nenhum componente é identificado | `analyzer/` |
| Alucinação | Human-in-the-loop com limite de 3 iterações | `analyzer/` |
| Consistência | Validação de referências em relacionamentos | `analyzer/` |

---

## Erros comuns

| Sintoma | Causa | Solução |
|---|---|---|
| Analyzer não inicia | `ANTHROPIC_API_KEY` não preenchida | Editar `analyzer/.env` |
| `BadRequestError: top_p: -1` | `@langchain/anthropic` desatualizado | Não regredir abaixo de `1.4.0` |
| SSE sem atualizações | `COGNITE_JOBS_SECRET` divergente | Verificar `.env` da api e do jobs |
| Volume de node_modules stale | Cache Docker desatualizado | `docker rm -f fiap-analyzer && docker volume rm _1_1_analyzer_modules && docker compose up fiap-analyzer --build -d` |

---

## Documentação técnica

Para detalhes de cada serviço, fluxos completos, decisões de design, guardrails implementados e limitações do modelo, consulte [`DOCUMENTATION.md`](./DOCUMENTATION.md).
