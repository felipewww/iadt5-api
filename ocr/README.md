# OCR Service

Serviço de extração de texto de PDFs e imagens. Usado pelo `analyzer` como etapa de pré-processamento multimodal.

**Stack:** FastAPI · Python 3.12 · pdfplumber · pytesseract · Pydantic v2

---

## Variáveis de ambiente

```bash
cp .env.example .env
```

| Variável | Descrição | Padrão |
|---|---|---|
| `APP_PORT` | Porta HTTP | 3201 |
| `LOG_LEVEL` | Nível de log (`debug`, `info`, `warning`, `error`) | `info` |

---

## Rodando localmente

**Pré-requisito:** Tesseract instalado no sistema (necessário apenas para imagens):

```bash
sudo apt install tesseract-ocr tesseract-ocr-por
```

```bash
uv pip install .
uvicorn main:app --reload --port 3201
```

Ou via Docker:

```bash
docker compose up --build
```

---

## Endpoint

### `POST /ocr/extract`

Recebe um arquivo PDF ou imagem e retorna o texto extraído por página.

**Request:** `multipart/form-data`

| Campo | Tipo | Descrição |
|---|---|---|
| `file` | `File` | PDF ou imagem (PNG, JPG, TIFF, BMP, WEBP) |

**Response:**

```json
{
    "filename": "diagrama.pdf",
    "file_type": "pdf",
    "total_pages": 3,
    "pages": [
        { "page_number": 1, "text": "..." },
        { "page_number": 2, "text": "..." }
    ],
    "full_text": "texto completo concatenado"
}
```

### `GET /health`

Retorna `{ "status": "ok" }`. Usado para healthcheck.

---

## Documentação interativa

Com o serviço rodando:
- Swagger UI: `http://localhost:3201/docs`
- ReDoc: `http://localhost:3201/redoc`

---

## Arquitetura

```
src/
├── domain/
│   ├── schemas/       # OcrPage, OcrResult (Pydantic v2, frozen)
│   └── protocols/     # OcrExtractorProtocol (Protocol)
├── application/
│   └── use_cases/     # ExtractTextUseCase — seleciona extractor pelo tipo do arquivo
├── infra/
│   ├── config.py      # Settings (pydantic-settings)
│   ├── http/          # FastAPI app factory + router
│   └── ocr/
│       ├── pdf_extractor.py    # pdfplumber — extrai texto de PDFs
│       └── image_extractor.py  # pytesseract — OCR em imagens
└── utils/
    └── file_type.py   # detecção por magic bytes + extensão
```

### Detecção de tipo de arquivo

A detecção usa **magic bytes** (`%PDF` no início do arquivo) como fonte primária, e a extensão como fallback para imagens. Isso evita dependência exclusiva do MIME type informado pelo cliente.

### Por que enviar texto + imagem juntos ao LLM?

O `analyzer` usa o texto extraído pelo OCR **e** o arquivo original. Isso cria dois canais complementares para o LLM:
- **Texto (OCR):** garante que nenhuma string seja perdida por baixa qualidade de imagem
- **Visual:** preserva layout, setas, diagramas e estrutura espacial
