# CLAUDE.md — ocr/

Documentação técnica de referência para o assistente de IA. Leia este arquivo sempre que for trabalhar dentro de `ocr/`.

---

## O que é

Serviço Python/FastAPI de extração de texto de PDFs e imagens. É chamado pelo `analyzer/` como etapa de pré-processamento multimodal antes de enviar o documento ao LLM.

- **Porta:** 3201
- **Único endpoint:** `POST /ocr/extract` — recebe `multipart/form-data` com campo `file`

---

## Stack e dependências-chave

| Lib | Papel |
|---|---|
| `fastapi` | Framework HTTP |
| `pydantic v2` | Schemas tipados (`frozen=True` em todos) |
| `pydantic-settings` | Leitura de env vars com tipagem |
| `pdfplumber` | Extração de texto de PDFs (sem OCR — usa texto embutido) |
| `pytesseract` | OCR em imagens (wrapper do binário `tesseract-ocr`) |
| `pillow` | Abertura e manipulação de imagens |

**Atenção:** `pytesseract` requer o binário `tesseract-ocr` instalado no SO. O `Dockerfile` já instala `tesseract-ocr-por` e `tesseract-ocr-eng`. Para dev local: `sudo apt install tesseract-ocr tesseract-ocr-por`.

---

## Arquitetura e camadas (`src/`)

```
src/
├── domain/
│   ├── schemas/           # OcrPage, OcrResult — Pydantic v2, frozen
│   └── protocols/         # OcrExtractorProtocol — Protocol (interface)
├── application/
│   └── use_cases/         # ExtractTextUseCase — seleciona extractor por tipo
├── infra/
│   ├── config.py          # Settings via pydantic-settings
│   ├── http/
│   │   ├── app.py         # FastAPI factory + /health
│   │   └── routers/       # ocr_router.py — POST /ocr/extract
│   └── ocr/
│       ├── pdf_extractor.py   # usa pdfplumber
│       └── image_extractor.py # usa pytesseract + Pillow
└── utils/
    └── file_type.py       # detecção por magic bytes (%PDF) + extensão
```

**Regras de dependência:**
- `domain` não importa de `application` nem de `infra`
- `application` pode importar de `domain`
- `infra` implementa os `Protocol` de `domain`
- `PYTHONPATH=/app/src` — imports sempre a partir de `src/` (ex: `from domain.schemas.ocr_result import OcrResult`)

---

## Tipagem

O projeto usa **mypy strict**. Configurado em `pyproject.toml`:
- `strict = true`
- `explicit_package_bases = true`
- `mypy_path = "src"`

Todos os schemas Pydantic usam `ConfigDict(frozen=True)` e `from __future__ import annotations` para lazy evaluation.

---

## Detecção de tipo de arquivo

`utils/file_type.py` detecta por **magic bytes** primeiro:
- `%PDF` nos primeiros 4 bytes → `FileType.PDF` → `PdfExtractor`
- Extensão do filename → `FileType.IMAGE` → `ImageExtractor`

PDFs não passam pelo Tesseract — `pdfplumber` extrai o texto diretamente do PDF.

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `APP_PORT` | 3201 | Porta HTTP |
| `LOG_LEVEL` | `info` | Nível de log do uvicorn |

---

## Docker

```bash
# build e run isolado
docker compose up --build

# como parte do projeto completo
cd .. && docker compose up ocr --build
```

A rede `platform_default` é referenciada como `external: true` no `docker-compose.yml` do serviço.
