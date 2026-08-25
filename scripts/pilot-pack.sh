#!/usr/bin/env bash
# One-command org pilot: scan → apply → stage Prove (#100).
#
# Usage (from repo root):
#   npm run tokenforge:pilot -- fixtures/noisy-app --team payments-platform
#   npm run tokenforge:pilot -- fixtures/noisy-app --dry-run
#   npm run tokenforge:pilot -- fixtures/noisy-app --skip-apply
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TOKENFORGE=(node ./cli/bin/tokenforge.mjs)
DASHBOARD_PORT="${TOKENFORGE_DASHBOARD_PORT:-5173}"
STAGED="dashboard/public/last-scan.json"
PROVE_URL="http://127.0.0.1:${DASHBOARD_PORT}/board/combined?src=/last-scan.json&afterUsage=/sample-usage-after.csv"

usage() {
  cat <<'EOF'
Usage: pilot-pack.sh [root] [tokenforge pilot options...]

Runs tokenforge pilot (scan → local apply), copies the scan report to
dashboard/public/last-scan.json, starts the dashboard if needed, and opens Prove
with a sample after-period usage query for variance demos.

Environment:
  TOKENFORGE_DASHBOARD_PORT  dashboard port (default: 5173)
  TOKENFORGE_PILOT_NO_OPEN   set to 1 to skip opening the browser

Examples:
  pilot-pack.sh fixtures/noisy-app --team payments-platform
  pilot-pack.sh fixtures/noisy-app --dry-run
  pilot-pack.sh fixtures/noisy-app --skip-apply
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

args=("$@")
if [[ ${#args[@]} -eq 0 ]]; then
  args=(fixtures/noisy-app)
fi

pilot_root="$PWD"
if [[ ${#args[@]} -gt 0 && "${args[0]}" != -* ]]; then
  pilot_root="${args[0]}"
  args=("${args[@]:1}")
fi
if [[ "$pilot_root" != /* ]]; then
  pilot_root="$ROOT/$pilot_root"
fi
pilot_root="$(cd "$pilot_root" 2>/dev/null && pwd)" || {
  echo "pilot-pack: cannot resolve root" >&2
  exit 1
}

echo "pilot-pack: running tokenforge pilot $pilot_root ${args[*]:-}"
set +e
"${TOKENFORGE[@]}" pilot "$pilot_root" "${args[@]}"
tf_status=$?
set -e
if [[ "$tf_status" -ne 0 && "$tf_status" -ne 3 ]]; then
  exit "$tf_status"
fi

report="$pilot_root/.tokenforge/scan-report.json"
if [[ ! -f "$report" ]]; then
  echo "pilot-pack: missing report at $report" >&2
  exit 1
fi

mkdir -p "$(dirname "$STAGED")"
cp "$report" "$STAGED"
echo "pilot-pack: staged $STAGED"

if [[ -f "$pilot_root/.tokenforge/prove-change-latest.json" ]]; then
  echo "pilot-pack: Prove change marker present (Fix window tagged)"
fi

dashboard_up() {
  curl -sf -o /dev/null "http://127.0.0.1:${DASHBOARD_PORT}/" 2>/dev/null
}

if dashboard_up; then
  echo "pilot-pack: dashboard already on :${DASHBOARD_PORT}"
else
  echo "pilot-pack: starting dashboard on :${DASHBOARD_PORT}…"
  npm run tokenforge:dashboard >/tmp/tokenforge-dashboard.log 2>&1 &
  for _ in $(seq 1 60); do
    if dashboard_up; then
      break
    fi
    sleep 0.5
  done
  if ! dashboard_up; then
    echo "pilot-pack: dashboard did not become ready (see /tmp/tokenforge-dashboard.log)" >&2
    exit 1
  fi
fi

if [[ "${TOKENFORGE_PILOT_NO_OPEN:-0}" == "1" ]]; then
  echo "pilot-pack: open $PROVE_URL"
  exit 0
fi

open_browser() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  else
    echo "pilot-pack: open $url in your browser"
    return
  fi
  echo "pilot-pack: opened $url"
}

open_browser "$PROVE_URL"
exit 0
