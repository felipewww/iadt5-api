# Fiap SS — Pipeline de Análise de Arquitetura

Trabalho de conclusão de curso (pós-graduação FIAP) que implementa um sistema SaaS para **avaliação automática de diagramas de arquitetura de software**.

O usuário cria um projeto, faz upload de um diagrama (PDF ou imagem) e o sistema conduz uma análise em três etapas: extração de texto via OCR, mapeamento dos componentes e relacionamentos por um LLM multimodal, e geração de um relatório com **score 0–10**, pontos fortes, pontos fracos e recomendações de melhoria.

O diferencial técnico está no pipeline construído com **LangGraph**: o grafo pode pausar a execução e fazer perguntas ao usuário quando encontra ambiguidades no diagrama (_human-in-the-loop_), retomando automaticamente após a resposta. Todo o progresso é transmitido em tempo real para o frontend via SSE.

O design do pipeline segue três princípios:

- **Fail fast** — validações ocorrem o mais cedo possível: tipo e tamanho do arquivo são rejeitados na API antes de qualquer I/O; arquivos sem componentes identificáveis falham no grafo antes de gerar perguntas ou consumir mais tokens.
- **Economia de tokens** — a análise tenta primeiro extrair a arquitetura só com o texto do OCR (chamada mais barata); só escala para chamada multimodal (imagem + texto) se nenhum componente for encontrado na primeira tentativa.
- **Segurança da saída** — o LLM nunca retorna JSON livre: o schema é validado via Zod com `withStructuredOutput`, e uma etapa pós-geração verifica a consistência dos relacionamentos (origens e destinos devem referenciar componentes existentes).

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

> Para detalhes de cada serviço, fluxos completos, decisões de design, guardrails e limitações do modelo, consulte [`DOCUMENTATION.md`](./DOCUMENTATION.md).

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

## ⚙️ Pipeline de análise

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

## 🚀 Rodando localmente

### Opção rápida — `init.sh`

```bash
./init.sh
```

O script copia os `.env.example` (se ainda não existirem), sobe todos os containers e aguarda cada serviço ficar disponível. Ao final exibe as URLs de acesso e lembra quais chaves de API precisam ser preenchidas.

### Opção manual

#### 1. Preparar os `.env`

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

#### 2. Subir tudo

```bash
docker compose up --build
```

O compose sobe em ordem correta: infra (Postgres, RabbitMQ, MongoDB) → jobs → api → ocr → analyzer → web-admin.

### Acessar

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API (Swagger) | http://localhost:3000/api/docs |
| API (Scalar) | http://localhost:3000/api/reference |
| RabbitMQ Management | http://localhost:15672 (guest/guest) |

---

## Usuário padrão

Na primeira execução as migrations criam um usuário administrador:

| Campo | Valor |
|---|---|
| E-mail | `admin` |
| Senha | `secret` |

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

## 🛡️ Guardrails de IA

| Tipo | Mecanismo | Onde |
|---|---|---|
| Entrada | Whitelist MIME type (PDF, PNG, JPEG, GIF, WEBP) | `api/` |
| Entrada | Limite de tamanho (5 MB) | `api/` |
| Saída | Structured Output via Zod (`withStructuredOutput`) | `analyzer/` |
| Saída | Score limitado 0–10 pelo schema | `analyzer/` |
| Alucinação | Bloqueio quando nenhum componente é identificado | `analyzer/` |
| Alucinação | Human-in-the-loop com limite de 3 iterações | `analyzer/` |
| Consistência | Validação de referências em relacionamentos | `analyzer/` |
