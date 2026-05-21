# Roteiro de Apresentação — Hackathon Integrado IADT + SOAT

## Avaliação de cobertura dos requisitos

| Requisito | Status | Onde |
|---|---|---|
| **Fluxo MVP completo** | ✅ | upload → RabbitMQ → OCR → analyzer → jobs steps |
| **Status: Recebido / Em processamento / Analisado / Erro** | ✅ | PENDING→RUNNING→DONE/FAILED no platform-jobs |
| **Relatório: componentes, riscos, recomendações** | ✅ | `architecture_json` + `evaluation` no step `analyzer-result` |
| **Microsserviços** | ✅ | api, ocr, analyzer, platform-jobs, platform-notifications, web-admin |
| **REST + fluxo assíncrono** | ✅ | REST entre serviços + RabbitMQ para disparo da análise |
| **Clean Architecture** | ✅ | domain / application / infra em todos os serviços Node |
| **Banco de dados por serviço** | ✅ | api→PostgreSQL, analyzer→MongoDB, jobs→MongoDB |
| **Testes automatizados** | ✅ | 30 suites / 114 testes unitários na api |
| **LLM + guardrails** | ✅ | Claude/OpenAI via LangGraph, Zod structured output |
| **Guardrail de entrada** | ✅ | whitelist MIME + limite 10MB |
| **Guardrail de saída** | ✅ | `withStructuredOutput(ZodSchema)` |
| **Mitigação de alucinações** | ✅ | human-in-the-loop + MAX_ITERATIONS = 3 |
| **Avaliação de consistência** | ✅ | `validateConsistency` — valida referências nos relacionamentos |
| **Pipeline de IA explícito** | ✅ | LangGraph: extractArchitecture → waitForHuman → evaluateArchitecture |
| **Justificativa da abordagem** | ✅ | DOCUMENTATION.md — seção "Justificativa da abordagem LLM" |
| **Limitações do modelo** | ✅ | DOCUMENTATION.md — seção "Limitações conhecidas" |
| **Como a IA é acionada** | ✅ | Consumer RabbitMQ → `graphService.start()` |
| **Como falhas da IA são tratadas** | ✅ | step `analyzer-error` + status FAILED + requeue |
| **Como resultado é persistido** | ✅ | MongoDB (checkpoints LangGraph) + step `analyzer-result` |
| **Docker + Docker Compose** | ✅ | Dockerfile em cada serviço + docker-compose.yml |
| **CI/CD: build + test + deploy** | ✅ | `.github/workflows/ci.yml` rodando via `act` (local) |
| **Logs estruturados** | ✅ | NestJS Logger em todos os serviços |
| **Métricas** | ✅ | endpoint `/metrics` Prometheus na api |
| **Tratamento de erros** | ✅ | exception filters globais |
| **README completo** | ✅ | problema, arquitetura, fluxo, instruções |
| **Diagrama de arquitetura** | ✅ | ASCII no README |
| **Seção Segurança (6 tópicos)** | ✅ | README + DOCUMENTATION.md |

**Cobertura: 100%.** Nenhum requisito em aberto.

> **Notas para mencionar verbalmente:**
> - O "Serviço de Relatórios" sugerido é coberto pelo `platform-jobs`, que armazena os steps estruturados incluindo o `analyzer-result` — escolha arquitetural mais enxuta e igualmente válida.
> - O CI/CD deploy é local via `act`, atendendo o critério "local ou cloud".

---

## Roteiro (~15 min)

---

### Bloco 1 — Abertura *(~1 min)*

> "O problema é conhecido: toda empresa com sistemas distribuídos tem dezenas de diagramas de arquitetura que são analisados manualmente, dependem de especialistas e não escalam. A proposta foi construir um MVP que recebe um diagrama — imagem ou PDF — e devolve automaticamente uma análise técnica estruturada: componentes identificados, riscos e recomendações. Fiz isso sozinho, cobrindo as responsabilidades tanto de SOAT quanto de IADT."

---

### Bloco 2 — Arquitetura geral *(~2 min)*

**Abra o README no browser ou terminal. Mostre o diagrama ASCII.**

> "O sistema tem 6 serviços independentes. A `api` é o BFF — recebe o upload, valida, publica no RabbitMQ e devolve um `jobId` e um `streamToken` pro frontend. O `ocr` extrai texto do arquivo. O `analyzer` é o coração — roda o pipeline de IA. O `platform-jobs` é o barramento de status e steps. O `platform-notifications` entrega eventos em tempo real via SSE. Cada serviço tem banco próprio: api usa PostgreSQL, analyzer e jobs usam MongoDB."

> "A comunicação é REST onde faz sentido — e assíncrona via RabbitMQ para o disparo da análise, que é a operação mais pesada."

> "Todos os serviços Node seguem Clean Architecture: domain sem dependências de framework, application com os casos de uso, infra com o NestJS, banco e integrações."

---

### Bloco 3 — Pipeline de IA *(~3 min)*

**Abra o DOCUMENTATION.md ou o arquivo `analyzer/src/infra/graph/analysis.graph.ts`. Mostre o fluxo do grafo.**

> "O pipeline de IA usa LangGraph — uma biblioteca que permite construir grafos de estado com persistência. O grafo tem três nós."

> "Primeiro: `extractArchitecture`. Aqui tem uma otimização importante — a estratégia de **economia de tokens**. O sistema primeiro tenta extrair só com o texto do OCR, que é mais barato. Só escala para multimodal — mandando a imagem ou PDF direto pro modelo — se a extração textual não encontrou nenhum componente."

> "Segundo: `waitForHuman`. Se o modelo levantou dúvidas específicas sobre partes ambíguas do diagrama, o grafo **interrompe** e aguarda resposta do usuário. Isso é o human-in-the-loop. Tem um limite de 3 iterações — o `MAX_ITERATIONS` — que é o guardrail anti-loop infinito."

> "Terceiro: `evaluateArchitecture`. Com o JSON estruturado confirmado, o modelo gera o score de 0 a 10, pontos fortes, fracos e recomendações."

> "O estado do grafo é persistido no MongoDB via `MongoDBSaver`. Se o container reiniciar no meio de uma análise, a sessão sobrevive."

> "Os guardrails: **entrada** — whitelist de MIME type e limite de 10MB. **Saída** — `withStructuredOutput` com schema Zod, então o modelo é forçado a retornar o formato exato. **Consistência** — uma função valida que todos os `from`/`to` nos relacionamentos referenciam componentes que realmente existem no JSON."

---

### Bloco 4 — Demonstração prática *(~5 min)*

**Suba o sistema antes da apresentação. Tenha um PDF de diagrama pronto (use `samples/`).**

```bash
./init.sh
```

> "Sistema no ar. Vou fazer o fluxo completo."

**Passo 1 — Upload via Swagger (`http://localhost:4000/api/docs`) ou curl:**

```bash
curl -X POST http://localhost:4000/projects/{id}/analysis \
  -F "file=@samples/arquitetura_sistema.pdf"
```

> "Recebo de volta um `jobId` e um `streamToken`. O job foi criado, a mensagem entrou no RabbitMQ."

**Passo 2 — Acompanhar status:**

```bash
curl http://localhost:4000/projects/{id}/analysis/status
```

> "Status `RUNNING`. O analyzer está processando. Posso acompanhar os steps à medida que chegam."

**Passo 3 — Resultado:**

> "Quando conclui, o status vai para `DONE` e aparece o step `analyzer-result` com o JSON completo: componentes, relacionamentos, padrões, tecnologias, score, pontos fortes, fracos e recomendações."

**Opcional — human-in-the-loop (se surgir):**

> "Se o modelo tiver dúvidas, o status fica `awaiting_user` e aparecem as perguntas. Respondo via `POST /analysis/{id}/reply` e o grafo continua de onde parou."

---

### Bloco 5 — Segurança *(~1 min 30s)*

**Abra a seção Segurança do README.**

> "A seção de segurança cobre os 6 tópicos obrigatórios. Autenticação com JWT de curta duração e refresh token. RBAC por grupo. HashId para ofuscar IDs numéricos e prevenir IDOR. Validação de entrada em três camadas — upload, body/query, e saída do LLM. Comunicação entre serviços autenticada com secrets compartilhados. E uma tabela de riscos conhecidos — como o score não-determinístico e a ausência de rate limiting no upload em produção."

---

### Bloco 6 — DevOps e Qualidade *(~1 min)*

**Mostre o `docker-compose.yml` rapidamente e rode os testes:**

```bash
cd api && npx jest --coverage 2>&1 | tail -8
```

> "30 suites, 114 testes unitários, cobrindo todos os handlers de negócio da API. O CI roda localmente via `act` — que executa os workflows do GitHub Actions em Docker — com jobs separados para cada serviço: lint, teste e build. A API expõe um endpoint `/metrics` no formato Prometheus."

---

### Bloco 7 — Fechamento *(~30s)*

> "Todos os requisitos do hackathon estão cobertos — os de SOAT e os de IADT. Microsserviços com Clean Architecture, comunicação síncrona e assíncrona, banco por serviço, pipeline de IA com guardrails explícitos, human-in-the-loop, testes automatizados, observabilidade e documentação de segurança completa. Feito individualmente."

---

## Dica para a gravação

Deixe o comando abaixo rodando numa janela ao lado durante a demo — os logs estruturados do pipeline aparecem em tempo real e deixam a análise mais viva visualmente:

```bash
docker logs fiap-analyzer -f
```
