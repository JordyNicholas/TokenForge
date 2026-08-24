#!/usr/bin/env bash
# Pull billed usage via UsageProvider, stage for dashboard, open Prove variance.
#
# Usage (from repo root):
#   npm run tokenforge:usage-sync -- --usage-provider fixture --file docs/schemas/examples/usage-metrics.v0.json --period 2026-08
#   npm run tokenforge:usage-sync -- --usage-provider copilot --org YOUR_ORG --period 2026-08
#   npm run tokenforge:usage-sync -- fixtures/noisy-app --usage-provider copilot --org YOUR_ORG
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TOKENFORGE=(node ./cli/bin/tokenforge.mjs)
DASHBOARD_PORT="${TOKENFORGE_DASHBOARD_PORT:-5173}"
SLOT="${TOKENFORGE_USAGE_SLOT:-after}"

usage() {
  cat <<'EOF'
Usage: prove-usage-sync.sh [root] [tokenforge usage-sync options...]

Runs tokenforge usage-sync, copies .tokenforge/usage-YYYY-MM.json to
dashboard/public/, starts the dashboard if needed, and opens Prove.

Environment:
  TOKENFORGE_USAGE_SLOT   baseline | after (default: after)
  TOKENFORGE_DASHBOARD_PORT  dashboard port (default: 5173)

Examples:
  prove-usage-sync.sh --usage-provider fixture --file docs/schemas/examples/usage-metrics.v0.json --period 2026-08
  prove-usage-sync.sh fixtures/noisy-app --usage-provider copilot --org acme --period 2026-08
  TOKENFORGE_USAGE_SLOT=baseline prove-usage-sync.sh --usage-provider copilot --org acme --period 2026-08
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$SLOT" != "baseline" && "$SLOT" != "after" ]]; then
  echo "prove-usage-sync: TOKENFORGE_USAGE_SLOT must be baseline or after" >&2
  exit 2
fi

args=("$@")
sync_root="$PWD"
if [[ ${#args[@]} -gt 0 && "${args[0]}" != -* ]]; then
  sync_root="${args[0]}"
  args=("${args[@]:1}")
fi
if [[ "$sync_root" != /* ]]; then
  sync_root="$ROOT/$sync_root"
fi
sync_root="$(cd "$sync_root" 2>/dev/null && pwd)" || {
  echo "prove-usage-sync: cannot resolve sync root" >&2
  exit 1
}

echo "prove-usage-sync: running tokenforge usage-sync ${args[*]:-<defaults>}"
set +e
output="$("${TOKENFORGE[@]}" usage-sync "$sync_root" "${args[@]}" 2>&1)"
tf_status=$?
set -e
printf '%s\n' "$output"
if [[ "$tf_status" -ne 0 ]]; then
  exit "$tf_status"
fi

period="$(printf '%s\n' "$output" | sed -n 's/^usage-sync .* · \([0-9]\{4\}-[0-9]\{2\}\) · .*/\1/p' | tail -1)"
if [[ -z "$period" ]]; then
  echo "prove-usage-sync: could not parse billing period from CLI output" >&2
  exit 1
fi

source_json="$sync_root/.tokenforge/usage-${period}.json"
if [[ ! -f "$source_json" ]]; then
  echo "prove-usage-sync: missing synced usage at $source_json" >&2
  exit 1
fi

staged="dashboard/public/usage-${period}.json"
mkdir -p "$(dirname "$staged")"
cp "$source_json" "$staged"
echo "prove-usage-sync: staged $staged"

dashboard_up() {
  curl -sf -o /dev/null "http://127.0.0.1:${DASHBOARD_PORT}/" 2>/dev/null
}

if dashboard_up; then
  echo "prove-usage-sync: dashboard already on :${DASHBOARD_PORT}"
else
  echo "prove-usage-sync: starting dashboard on :${DASHBOARD_PORT}…"
  npm run tokenforge:dashboard >/tmp/tokenforge-dashboard.log 2>&1 &
  for _ in $(seq 1 60); do
    if dashboard_up; then
      break
    fi
    sleep 0.5
  done
  if ! dashboard_up; then
    echo "prove-usage-sync: dashboard did not become ready (see /tmp/tokenforge-dashboard.log)" >&2
    exit 1
  fi
fi

if [[ "$SLOT" == "baseline" ]]; then
  prove_url="http://127.0.0.1:${DASHBOARD_PORT}/board/combined/variance?usage=/usage-${period}.json"
else
  prove_url="http://127.0.0.1:${DASHBOARD_PORT}/board/combined/variance?afterUsage=/usage-${period}.json"
fi

open_browser() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  else
    echo "prove-usage-sync: open $url in your browser"
    return
  fi
  echo "prove-usage-sync: opened $url"
}

open_browser "$prove_url"
exit 0
