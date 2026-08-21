#!/usr/bin/env bash
# Run tokenforge scan|init, stage the report for the dashboard, open Prove.
# Mode-agnostic (heuristic or hybrid) — same Token Risk JSON.
#
# Usage (from repo root):
#   npm run tokenforge:prove -- scan fixtures/noisy-app
#   npm run tokenforge:prove -- scan /path/to/repo --mode hybrid --llm ollama:qwen2.5-coder:7b
#   npm run tokenforge:prove -- init fixtures/noisy-app --mode hybrid
#   npm run tokenforge:prove -- fixtures/noisy-app   # implies scan
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TOKENFORGE=(node ./cli/bin/tokenforge.mjs)
DASHBOARD_PORT="${TOKENFORGE_DASHBOARD_PORT:-5173}"
STAGED="dashboard/public/last-scan.json"
PROVE_URL="http://127.0.0.1:${DASHBOARD_PORT}/board/combined?src=/last-scan.json"

usage() {
  cat <<'EOF'
Usage: prove-scan.sh [scan|init] [root] [tokenforge options...]

Runs tokenforge, copies <root>/.tokenforge/scan-report.json to
dashboard/public/last-scan.json, starts the dashboard if needed, and opens Prove.

Examples:
  prove-scan.sh scan fixtures/noisy-app
  prove-scan.sh scan /path/to/repo --mode hybrid --llm ollama:qwen2.5-coder:7b
  prove-scan.sh init fixtures/noisy-app --provider generic
  prove-scan.sh fixtures/noisy-app
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

args=("$@")
if [[ ${#args[@]} -eq 0 ]]; then
  args=(scan)
fi

cmd="${args[0]}"
if [[ "$cmd" != "scan" && "$cmd" != "init" && "$cmd" != "apply" ]]; then
  args=(scan "${args[@]}")
  cmd=scan
fi

# Positional root: first non-option after the command (mirrors CLI).
scan_root="$PWD"
i=1
while [[ $i -lt ${#args[@]} ]]; do
  arg="${args[$i]}"
  if [[ "$arg" == -* ]]; then
    case "$arg" in
      --team|--repo|--provider|--mode|--llm|--llm-endpoint|--llm-timeout)
        i=$((i + 2))
        continue
        ;;
      --allow-external|--dry-run|--json|-h|--help)
        i=$((i + 1))
        continue
        ;;
      --*=*)
        i=$((i + 1))
        continue
        ;;
      *)
        i=$((i + 1))
        continue
        ;;
    esac
  fi
  scan_root="$arg"
  break
done

if [[ "$scan_root" != /* ]]; then
  scan_root="$ROOT/$scan_root"
fi
# Resolve without requiring GNU readlink -f everywhere.
scan_root="$(cd "$scan_root" 2>/dev/null && pwd)" || {
  echo "prove-scan: cannot resolve scan root" >&2
  exit 1
}

echo "prove-scan: running tokenforge ${args[*]}"
set +e
"${TOKENFORGE[@]}" "${args[@]}"
tf_status=$?
set -e
# 0 = savings, 3 = success with zero savings — both OK for Prove.
if [[ "$tf_status" -ne 0 && "$tf_status" -ne 3 ]]; then
  exit "$tf_status"
fi

report="$scan_root/.tokenforge/scan-report.json"
if [[ ! -f "$report" ]]; then
  echo "prove-scan: missing report at $report" >&2
  exit 1
fi

mkdir -p "$(dirname "$STAGED")"
cp "$report" "$STAGED"
echo "prove-scan: staged $STAGED"

dashboard_up() {
  curl -sf -o /dev/null "http://127.0.0.1:${DASHBOARD_PORT}/" 2>/dev/null
}

if dashboard_up; then
  echo "prove-scan: dashboard already on :${DASHBOARD_PORT}"
else
  echo "prove-scan: starting dashboard on :${DASHBOARD_PORT}…"
  npm run tokenforge:dashboard >/tmp/tokenforge-dashboard.log 2>&1 &
  for _ in $(seq 1 60); do
    if dashboard_up; then
      break
    fi
    sleep 0.5
  done
  if ! dashboard_up; then
    echo "prove-scan: dashboard did not become ready (see /tmp/tokenforge-dashboard.log)" >&2
    exit 1
  fi
fi

open_browser() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  else
    echo "prove-scan: open $url in your browser"
    return
  fi
  echo "prove-scan: opened $url"
}

open_browser "$PROVE_URL"
exit 0
