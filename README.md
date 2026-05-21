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

## 🧪 CI local com `act`

O pipeline de CI roda **somente localmente** via [`act`](https://github.com/nektos/act), que executa os workflows do GitHub Actions dentro de containers Docker. Os workflows nunca executam no GitHub (guard `vars.RUN_CI == 'true'`).

### Instalação

```bash
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Uso

```bash
act              # roda todos os jobs em paralelo
act -j api       # roda só o job da API
act -j analyzer  # roda só o analyzer
act -j jobs-service
act -j web
act -j ocr
```

Na primeira execução o `act` baixa a imagem base (~700MB). As execuções seguintes usam o cache local.

### Jobs disponíveis

| Job | Serviço | Etapas |
|---|---|---|
| `api` | `api/` | lint → test → build |
| `analyzer` | `analyzer/` | lint → build |
| `jobs-service` | `jobs/` | lint → test → build |
| `web` | `web-admin/` | type-check → test:unit → build |
| `ocr` | `ocr/` | ruff (lint) → mypy (type check) |

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

## 🔒 Segurança

### Autenticação e autorização

- **JWT** — access token de 15 min + refresh de 7 dias
- **RBAC por grupo** — cada endpoint declara o módulo e a operação exigidos; sem permissão explícita, a request é rejeitada com `403`
- **HashId (HMAC-SHA256)** — IDs numéricos nunca são expostos ao frontend, prevenindo enumeração de recursos (IDOR)

### Validação de entradas não confiáveis

| Camada | O que é validado | Comportamento |
|---|---|---|
| API — upload | MIME type (whitelist) + tamanho ≤ 5 MB | `400 Bad Request` antes de qualquer I/O |
| API — body/query | Formato via `class-validator` + `ValidationPipe` global | `400` com lista de erros |
| Analyzer — saída do LLM | Schema Zod via `withStructuredOutput` | Exceção se o modelo retornar JSON fora do schema |

### Uso controlado da IA

O LLM é invocado com prompt de sistema fixo, escopo restrito à análise de arquitetura e resposta forçada a um schema Zod conhecido — o modelo nunca retorna texto livre nem executa ações fora do grafo. O limite de 3 iterações previne loops de perguntas indefinidos. Extração e avaliação são nós separados no grafo, reduzindo o espaço para alucinações narrativas.

### Tratamento de falhas da IA

Qualquer exceção no grafo LangGraph é capturada no consumer RabbitMQ: um step `analyzer-error` é registrado com a mensagem descritiva, o job é marcado como `FAILED` e o frontend exibe a mensagem com opção de reenvio. Mensagens RabbitMQ rejeitadas são reenfileiradas automaticamente se ainda não foram reentregues.

### Comunicação entre serviços

| Canal | Mecanismo |
|---|---|
| Frontend → Jobs (stream SSE) | JWT assinado com `COGNITE_JOBS_SECRET` (expira em 2h) |
| API → Notifications | JWT assinado com `NOTIFICATIONS_SECRET` (expira em 1h) |
| Serviços → RabbitMQ | Autenticação por usuário/senha |
| Serviços → S3 | AWS credentials via variáveis de ambiente (não commitadas) |
| Inter-serviços (HTTP) | Rede Docker interna — serviços não expostos fora do compose |

### Riscos e limitações identificados

| Risco | Mitigação atual |
|---|---|
| Credenciais padrão (`guest/guest`, `change-me-in-production`) | Adequadas só em dev — **trocar em produção** |
| Alucinação sutil do LLM (relacionamentos inferidos) | `consistency_issues` captura referências inválidas; alucinações semanticamente coerentes não são detectadas |
| Score não-determinístico | Documentado como orientação, não métrica absoluta |
| Ausência de rate limiting no upload | Recomendado adicionar em produção |

> Para detalhes de implementação de cada controle, consulte a seção **Segurança** em [`DOCUMENTATION.md`](./DOCUMENTATION.md).
