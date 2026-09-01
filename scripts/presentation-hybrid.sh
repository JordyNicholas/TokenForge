#!/usr/bin/env bash
# Presentation backup: hybrid scan → hybrid apply → dashboard (#221).
#
# Usage (from repo root):
#   npm run tokenforge:presentation-hybrid
#   npm run tokenforge:presentation-hybrid -- fixtures/hybrid-eval-app
#
# Requires: Cursor CLI (`agent`) logged in; uses composer-2.5 via cursor-cli backend.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DASHBOARD_PORT="${TOKENFORGE_DASHBOARD_PORT:-5173}"
DEMO_ROOT="${1:-fixtures/hybrid-eval-app}"
LLM="${TOKENFORGE_PRESENTATION_LLM:-cursor-cli:composer-2.5}"

if [[ "$DEMO_ROOT" != /* ]]; then
  DEMO_ROOT="$ROOT/$DEMO_ROOT"
fi
DEMO_ROOT="$(cd "$DEMO_ROOT" && pwd)"

echo "presentation-hybrid: scan (hybrid) → apply (hybrid) → dashboard"
echo "  root: $DEMO_ROOT"
echo "  llm:  $LLM"

echo ""
echo "== Step 1: hybrid scan =="
npm run tokenforge -- scan "$DEMO_ROOT" \
  --mode hybrid \
  --llm "$LLM" \
  --allow-external \
  --team tokenforge-demo \
  --repo "$(basename "$DEMO_ROOT")"

echo ""
echo "== Step 2: hybrid apply =="
npm run tokenforge -- apply "$DEMO_ROOT" \
  --mode hybrid \
  --llm "$LLM" \
  --allow-external \
  --provider copilot

echo ""
echo "== Step 3: stage for dashboard =="
TOKENFORGE_PROVE_NO_OPEN=1 TOKENFORGE_PROVE_NO_DASHBOARD=1 npm run tokenforge:prove -- stage "$DEMO_ROOT"

dashboard_up() {
  curl -sf -o /dev/null "http://127.0.0.1:${DASHBOARD_PORT}/" 2>/dev/null
}

if dashboard_up; then
  echo "presentation-hybrid: dashboard already on :${DASHBOARD_PORT}"
else
  echo "presentation-hybrid: starting dashboard on :${DASHBOARD_PORT}…"
  npm run tokenforge:dashboard >/tmp/tokenforge-dashboard.log 2>&1 &
  for _ in $(seq 1 60); do
    if dashboard_up; then
      break
    fi
    sleep 0.5
  done
  if ! dashboard_up; then
    echo "presentation-hybrid: dashboard did not become ready (see /tmp/tokenforge-dashboard.log)" >&2
    exit 1
  fi
fi

PROVE_URL="http://127.0.0.1:${DASHBOARD_PORT}/board/combined?src=/last-scan.json"
echo ""
echo "presentation-hybrid: open $PROVE_URL"

if [[ "${TOKENFORGE_PRESENTATION_NO_OPEN:-0}" != "1" ]]; then
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$PROVE_URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$PROVE_URL" >/dev/null 2>&1 || true
  fi
fi
