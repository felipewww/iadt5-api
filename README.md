# Fiap Systems — Main API Fiap

Monorepo do projeto. Contém quatro serviços: API principal, OCR, analisador de arquitetura com IA e frontend.

| Campo | Valor |
|---|---|
| clientId | 1 |
| projectId | 1 |
| uid | `_1_1` |
| clientName | Fiap Systems |
| projectName | Main API Fiap |

---

## Serviços

| Serviço | Pasta | Stack | Porta | Responsabilidade |
|---|---|---|---|---|
| API | `api/` | NestJS + TypeScript | 4000 | IAM, autenticação, regras de negócio |
| OCR | `ocr/` | FastAPI + Python | 3201 | Extração de texto de PDFs e imagens |
| Analyzer | `analyzer/` | NestJS + LangGraph | 3300 | Análise de arquitetura com IA |
| Web Admin | `web-admin/` | Vue + Vite | 5173 | Interface administrativa |

---

## Arquitetura geral

```
web-admin (5173)
    │
    ▼
api (4000) ──── PostgreSQL / RabbitMQ / MongoDB
                        (../platform)

PDF/Imagem
    │
    ▼
ocr (3201)  ◄──── analyzer (3300)
                       │
                       ▼
               LLM (Anthropic / OpenAI)
```

O fluxo de análise de arquitetura:
1. `analyzer` recebe o arquivo e chama `ocr` para extrair o texto
2. Envia arquivo + texto extraído para o LLM (multimodal)
3. Se o LLM tiver dúvidas, pausa e aguarda resposta do usuário (LangGraph human-in-the-loop)
4. Com a arquitetura mapeada em JSON, um segundo LLM avalia e gera score + relatório

---

## Pré-requisitos

Infra compartilhada (Postgres, RabbitMQ, MongoDB) gerenciada pelo repositório `platform`:

```bash
cd ../platform
docker compose up -d
```

---

## Desenvolvimento local

Cada serviço pode ser rodado individualmente:

```bash
# API
cd api && npm install && npm run start:dev

# OCR
cd ocr && uv pip install . && uvicorn main:app --reload   # requer tesseract-ocr no SO

# Analyzer
cd analyzer && npm install && npm run start:dev

# Web Admin
cd web-admin && npm install && npm run dev
```

---

## Docker — subir tudo junto

Crie os arquivos `.env` a partir dos exemplos antes do primeiro `up`:

```bash
cp api/.env.example     api/.env
cp ocr/.env.example     ocr/.env
cp analyzer/.env.example analyzer/.env
# edite analyzer/.env e adicione a API key do LLM
```

Depois:

```bash
docker compose up --build
```

Variáveis de porta customizáveis via ambiente:

| Variável | Padrão |
|---|---|
| `API_PORT` | 4000 |
| `OCR_PORT` | 3201 |
| `ANALYZER_PORT` | 3300 |
| `WEB_PORT` | 5173 |

> Quando rodando em Docker, substitua `localhost` por `host.docker.internal` nos `.env`
> de `api/` e `analyzer/` para alcançar os serviços do `platform`.

---

## Deploy — GitHub Actions

Workflows em `.github/workflows/`:

| Arquivo | Trigger | O que faz |
|---|---|---|
| `deploy-api.yml` | push em `main` (`api/**`) | Build e deploy da API |
| `deploy-web.yml` | push em `main` (`web-admin/**`) | Build e deploy do frontend |

Secrets necessárias (Settings → Secrets → Actions):
- `COGNITE_JOBS_SECRET`
- Credenciais do provedor de cloud
- `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY`
