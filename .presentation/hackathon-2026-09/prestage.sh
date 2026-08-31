#!/usr/bin/env bash
# Pre-stage artifacts for the Sep 2026 hackathon presentation.
# Usage: bash .presentation/hackathon-2026-09/prestage.sh [--hybrid-live]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

HYBRID_LIVE=false
if [[ "${1:-}" == "--hybrid-live" ]]; then
  HYBRID_LIVE=true
fi

echo "==> npm install + build"
npm install
npm run build

echo "==> typecheck + test"
npm run typecheck
npm test

echo "==> extension build"
npm run tokenforge:extension

OUT_JSON="dashboard/public/demo-hybrid-cursor-report.json"
INSTRUCTIONS_FIXTURE="fixtures/instructions-app"

if $HYBRID_LIVE; then
  echo "==> hybrid scan (live cursor-cli:composer-2.5) — requires agent login"
  if ! command -v agent >/dev/null 2>&1; then
    echo "WARN: Cursor CLI (agent) not on PATH; skip live hybrid. Run agent login, then re-run with --hybrid-live"
  else
    npm run tokenforge -- scan "$INSTRUCTIONS_FIXTURE" \
      --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
    if [[ -f "$INSTRUCTIONS_FIXTURE/.tokenforge/scan-report.json" ]]; then
      cp "$INSTRUCTIONS_FIXTURE/.tokenforge/scan-report.json" "$OUT_JSON"
      echo "==> wrote $OUT_JSON"
    fi
  fi
else
  echo "==> hybrid backup: run with --hybrid-live after 'agent login' to refresh $OUT_JSON"
  if [[ ! -f "$OUT_JSON" ]]; then
    echo "WARN: $OUT_JSON missing — run: bash .presentation/hackathon-2026-09/prestage.sh --hybrid-live"
  else
    echo "==> $OUT_JSON present"
  fi
fi

echo ""
echo "==> Pre-demo reminders"
echo "  Extension tabs: fixtures/noisy-app/package-lock.json, dist/bundle.js, config/app-settings.json"
echo "  Dashboard Tab 1 (Prove):"
echo "    http://localhost:5173/board/combined/team/payments-platform?afterUsage=/sample-usage-after.csv"
echo "  Dashboard Tab 2 (Hybrid backup):"
echo "    http://localhost:5173/?src=/demo-hybrid-cursor-report.json"
echo "  Reset fixtures before rehearsal:"
echo "    rm -rf fixtures/noisy-app/.tokenforge fixtures/noisy-app/.github/copilot-instructions.md \\"
echo "      fixtures/noisy-app/.cursor/rules/tokenforge.mdc fixtures/noisy-app/.cursor/tokenforge-exclusion-candidates.yml"
echo "  See: .presentation/hackathon-2026-09/PRESENTER_RUNBOOK.md"
