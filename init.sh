#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Cores ─────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}══════════════════════════════════════════════${RESET}"
echo -e "${BOLD}   Fiap SS — Inicialização do ambiente         ${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════${RESET}"
echo ""

# ── 1. Copiar .env ─────────────────────────────────────────────────────────────
echo -e "${BOLD}Configurando arquivos .env...${RESET}"

copy_env() {
    local dir="$1"
    if [ -f "$dir/.env.example" ]; then
        if [ ! -f "$dir/.env" ]; then
            cp "$dir/.env.example" "$dir/.env"
            echo -e "  ${GREEN}✓${RESET} ${BOLD}$dir/.env${RESET} criado a partir do exemplo"
        else
            echo -e "  ${DIM}· $dir/.env já existe, mantido sem alteração${RESET}"
        fi
    fi
}

copy_env "api"
copy_env "analyzer"
copy_env "web-admin"
copy_env "jobs"
echo ""

# ── 2. Subir containers ────────────────────────────────────────────────────────
echo -e "${BOLD}Subindo containers...${RESET}"
docker compose up -d --build 2>&1 | grep -E "^(#|✔|✗| =>|Container|Network)" || true
echo ""

# ── 3. Aguardar containers ─────────────────────────────────────────────────────
echo -e "${BOLD}Aguardando serviços ficarem disponíveis...${RESET}"
echo ""

wait_for() {
    local container="$1"
    local label="$2"
    local timeout="${3:-120}"
    local elapsed=0

    while [ "$elapsed" -lt "$timeout" ]; do
        local status health exit_code

        status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "absent")

        if [ "$status" = "absent" ]; then
            sleep 2; elapsed=$((elapsed + 2)); continue
        fi

        # Container one-shot (init jobs)
        if [ "$status" = "exited" ]; then
            exit_code=$(docker inspect --format='{{.State.ExitCode}}' "$container" 2>/dev/null || echo "1")
            if [ "$exit_code" = "0" ]; then
                echo -e "  ${GREEN}✓${RESET} $label"
                return 0
            else
                echo -e "  ${RED}✗${RESET} $label ${DIM}(exit $exit_code)${RESET}"
                return 1
            fi
        fi

        # Container com healthcheck
        health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container" 2>/dev/null || echo "none")

        if [ "$health" = "healthy" ]; then
            echo -e "  ${GREEN}✓${RESET} $label"
            return 0
        fi

        # Container sem healthcheck — basta estar running
        if [ "$health" = "none" ] && [ "$status" = "running" ]; then
            echo -e "  ${GREEN}✓${RESET} $label"
            return 0
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo -e "  ${YELLOW}⚠${RESET}  $label ${DIM}(timeout após ${timeout}s — verifique com: docker logs $container)${RESET}"
    return 1
}

wait_for "infra-iadt-postgres"     "Postgres"
wait_for "infra-iadt-rabbitmq"     "RabbitMQ"
wait_for "infra-iadt-mongodb"      "MongoDB"
wait_for "infra-iadt-mongodb-init" "MongoDB init (replica set)"     30
wait_for "infra-iadt-jobs"         "Jobs service                :3100"
wait_for "fiap-api"                "API                         :3000"
wait_for "fiap-ocr"                "OCR                         :3201"
wait_for "fiap-analyzer"           "Analyzer                    :3300"  180
wait_for "fiap-web-admin"          "Web Admin                   :5173"

# ── 4. Resumo ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  Ambiente pronto!${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}Frontend${RESET}       →  ${BLUE}http://localhost:5173${RESET}"
echo -e "  ${BOLD}API (Scalar)${RESET}   →  ${BLUE}http://localhost:3000/api/reference${RESET}"
echo -e "  ${BOLD}API (Swagger)${RESET}  →  ${BLUE}http://localhost:3000/api/docs${RESET}"
echo -e "  ${BOLD}RabbitMQ${RESET}       →  ${BLUE}http://localhost:15672${RESET}  ${DIM}guest / guest${RESET}"
echo ""
echo -e "${YELLOW}${BOLD}⚠  Verifique se as chaves de API estão preenchidas nos .env:${RESET}"
echo ""
echo -e "  ${BOLD}analyzer/.env${RESET}"
echo -e "  └── ${YELLOW}ANTHROPIC_API_KEY${RESET}  ${DIM}(ou OPENAI_API_KEY se LLM_PROVIDER=openai)${RESET}"
echo ""
echo -e "  ${BOLD}api/.env${RESET}"
echo -e "  ├── ${YELLOW}AWS_ACCESS_KEY_ID${RESET}"
echo -e "  └── ${YELLOW}AWS_SECRET_ACCESS_KEY${RESET}  ${DIM}(necessário para upload de arquivos para S3)${RESET}"
echo ""
