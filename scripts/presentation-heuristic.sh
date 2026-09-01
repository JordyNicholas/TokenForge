#!/usr/bin/env bash
# Presentation backup: heuristic scan → heuristic apply → dashboard.
#
# Usage (from repo root):
#   npm run tokenforge:presentation-heuristic
#   npm run tokenforge:presentation-heuristic -- fixtures/hybrid-eval-app
#
# No LLM, no network, no --allow-external. Fast and CI-safe path.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DASHBOARD_PORT="${TOKENFORGE_DASHBOARD_PORT:-5173}"
DEMO_ROOT="${1:-fixtures/hybrid-eval-app}"

if [[ "$DEMO_ROOT" != /* ]]; then
  DEMO_ROOT="$ROOT/$DEMO_ROOT"
fi
DEMO_ROOT="$(cd "$DEMO_ROOT" && pwd)"

echo "presentation-heuristic: scan (heuristic) → apply (heuristic) → dashboard"
echo "  root: $DEMO_ROOT"
echo "  mode: heuristic (default — no LLM)"

echo ""
echo "== Step 1: heuristic scan =="
npm run tokenforge -- scan "$DEMO_ROOT" \
  --mode heuristic \
  --team tokenforge-demo \
  --repo "$(basename "$DEMO_ROOT")"

echo ""
echo "== Step 2: heuristic apply =="
npm run tokenforge -- apply "$DEMO_ROOT" \
  --mode heuristic \
  --provider copilot

echo ""
echo "== Step 3: stage for dashboard =="
TOKENFORGE_PROVE_NO_OPEN=1 TOKENFORGE_PROVE_NO_DASHBOARD=1 npm run tokenforge:prove -- stage "$DEMO_ROOT"

dashboard_up() {
  curl -sf -o /dev/null "http://127.0.0.1:${DASHBOARD_PORT}/" 2>/dev/null
}

if dashboard_up; then
  echo "presentation-heuristic: dashboard already on :${DASHBOARD_PORT}"
else
  echo "presentation-heuristic: starting dashboard on :${DASHBOARD_PORT}…"
  npm run tokenforge:dashboard >/tmp/tokenforge-dashboard.log 2>&1 &
  for _ in $(seq 1 60); do
    if dashboard_up; then
      break
    fi
    sleep 0.5
  done
  if ! dashboard_up; then
    echo "presentation-heuristic: dashboard did not become ready (see /tmp/tokenforge-dashboard.log)" >&2
    exit 1
  fi
fi

PROVE_URL="http://127.0.0.1:${DASHBOARD_PORT}/board/combined?src=/last-scan.json"
echo ""
echo "presentation-heuristic: open $PROVE_URL"

if [[ "${TOKENFORGE_PRESENTATION_NO_OPEN:-0}" != "1" ]]; then
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$PROVE_URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$PROVE_URL" >/dev/null 2>&1 || true
  fi
fi
