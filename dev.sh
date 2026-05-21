#!/usr/bin/env bash
# Sobe todos os serviços localmente (sem Docker), cada um em uma aba tmux.
# Requisito: tmux  →  sudo apt install tmux
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="fiap-dev"

# ── cores ─────────────────────────────────────────────────────────────────────

R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' C='\033[0;36m' N='\033[0m'

die()  { echo -e "${R}✗  $*${N}" >&2; exit 1; }
ok()   { echo -e "${G}✓  $*${N}"; }
warn() { echo -e "${Y}⚠  $*${N}"; }
info() { echo -e "${C}→  $*${N}"; }

# ── tmux ──────────────────────────────────────────────────────────────────────

if ! command -v tmux &>/dev/null; then
    die "tmux não encontrado.
   Instale com:  sudo apt install tmux
   Ou via brew:  brew install tmux"
fi

# ── node_modules ──────────────────────────────────────────────────────────────

for svc in api analyzer web-admin; do
    if [[ ! -d "$ROOT/$svc/node_modules" ]]; then
        warn "$svc: node_modules ausente — executando npm install..."
        (cd "$ROOT/$svc" && npm install)
        ok "$svc: dependências instaladas"
    fi
done

# ── Python / uvicorn (OCR) ────────────────────────────────────────────────────

OCR_CMD=""

if [[ -x "$ROOT/ocr/.venv/bin/uvicorn" ]]; then
    UVICORN="$ROOT/ocr/.venv/bin/uvicorn"
    OCR_CMD="cd '$ROOT/ocr' && PYTHONPATH=src '$UVICORN' main:app --host 0.0.0.0 --port 3201 --reload"
elif command -v uvicorn &>/dev/null; then
    UVICORN="$(command -v uvicorn)"
    OCR_CMD="cd '$ROOT/ocr' && PYTHONPATH=src '$UVICORN' main:app --host 0.0.0.0 --port 3201 --reload"
else
    warn "uvicorn não encontrado — OCR ficará em modo de aviso."
    warn "Para configurar o ambiente Python:"
    warn "  cd ocr && uv venv && uv pip install '.[dev]'"
    OCR_CMD="echo -e '\033[1;33muvicorn não configurado.\nExecute: cd ocr && uv venv && uv pip install \".[dev]\"\033[0m' && bash"
fi

# ── sessão tmux ───────────────────────────────────────────────────────────────

if tmux has-session -t "$SESSION" 2>/dev/null; then
    warn "Sessão '$SESSION' já existe — encerrando..."
    tmux kill-session -t "$SESSION"
fi

info "Criando sessão '$SESSION'..."

# Janela 0 — api (NestJS · porta 3000)
tmux new-session  -d -s "$SESSION" -n "api"
tmux send-keys    -t "$SESSION:api" \
    "cd '$ROOT/api' && npm run start:dev" Enter

# Janela 1 — ocr (FastAPI · porta 3201)
tmux new-window   -t "$SESSION" -n "ocr"
tmux send-keys    -t "$SESSION:ocr" "$OCR_CMD" Enter

# Janela 2 — analyzer (NestJS · porta 3300)
tmux new-window   -t "$SESSION" -n "analyzer"
tmux send-keys    -t "$SESSION:analyzer" \
    "cd '$ROOT/analyzer' && npm run start:dev" Enter

# Janela 3 — web-admin (Vite · porta 5173)
tmux new-window   -t "$SESSION" -n "web"
tmux send-keys    -t "$SESSION:web" \
    "cd '$ROOT/web-admin' && npm run dev" Enter

tmux select-window -t "$SESSION:api"

# ── resumo ────────────────────────────────────────────────────────────────────

echo ""
ok "Sessão '$SESSION' iniciada com 4 serviços"
echo ""
printf "  %-10s →  %s\n" "api"      "http://localhost:3000"
printf "  %-10s →  %s\n" "ocr"      "http://localhost:3201"
printf "  %-10s →  %s\n" "analyzer" "http://localhost:3300"
printf "  %-10s →  %s\n" "web"      "http://localhost:5173"
echo ""
echo "  Navegar entre abas   Ctrl-b 0/1/2/3   ou   Ctrl-b n / Ctrl-b p"
echo "  Desconectar          Ctrl-b d"
echo "  Encerrar tudo        tmux kill-session -t $SESSION"
echo ""

# ── attach ────────────────────────────────────────────────────────────────────

if [[ -n "${TMUX:-}" ]]; then
    # já dentro de uma sessão tmux — troca para a nova
    tmux switch-client -t "$SESSION"
else
    tmux attach-session -t "$SESSION"
fi
