#!/usr/bin/env bash
# Guided presentation: Act 1 (extension checklist) → Act 2 (heuristic) → Act 3 (hybrid).
#
# Usage (from repo root):
#   npm run tokenforge:presentation-full
#   npm run tokenforge:presentation-full -- fixtures/hybrid-eval-app
#
# Act 1 is manual in VS Code; Acts 2–3 delegate to presentation-heuristic / presentation-hybrid.
# Skip Enter prompts: TOKENFORGE_PRESENTATION_NO_PROMPT=1
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEMO_ROOT="${1:-fixtures/hybrid-eval-app}"
DASHBOARD_PORT="${TOKENFORGE_DASHBOARD_PORT:-5173}"
RUNBOOK="docs/runbooks/PRESENTATION_HYBRID_EVAL.md"

if [[ "$DEMO_ROOT" != /* ]]; then
  DEMO_ROOT="$ROOT/$DEMO_ROOT"
fi
DEMO_ROOT="$(cd "$DEMO_ROOT" && pwd)"
FIXTURE_REL="${DEMO_ROOT#"$ROOT"/}"

wait_for_enter() {
  if [[ "${TOKENFORGE_PRESENTATION_NO_PROMPT:-0}" == "1" ]]; then
    return 0
  fi
  read -r -p "Press Enter when ready to continue… "
}

echo "═══════════════════════════════════════════════════════════════"
echo " TokenForge presentation — full script"
echo " Fixture: $FIXTURE_REL"
echo " Runbook: $RUNBOOK"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Pre-flight (do once if not done):"
echo "  npm install"
echo "  npm run tokenforge:extension"
echo "  npm run tokenforge:dashboard     → http://127.0.0.1:${DASHBOARD_PORT}"
echo "  agent login                      → required before Act 3"
echo ""
wait_for_enter

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ACT 1 — VS Code Context Guard (manual, ~2–3 min)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Repo root → F5 (Run Extension) → Extension Development Host"
echo "2. Pre-open tabs under $FIXTURE_REL:"
echo "     • package-lock.json          (immediate at-risk — Filter this live)"
echo "     • test-results/junit.xml     (immediate at-risk)"
echo "     • coverage/lcov.info         (optional)"
echo "   Optional narrative tabs: AGENTS.md, .github/copilot-instructions.md,"
echo "     docs/RULEBOOK.md, openapi.yaml"
echo "3. TokenForge sidebar → Filter package-lock.json → Risk pulse before/after/saved"
echo "4. Optional: Reveal last-scan.json"
echo ""
echo "Say: Detect is heuristic on open tabs; Filter is your call; no agent interception."
echo ""
wait_for_enter

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ACT 2 — Heuristic scan + apply + dashboard (~4–5 min)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
npm run tokenforge:presentation-heuristic -- "$DEMO_ROOT"

echo ""
echo "Dashboard (heuristic pass):"
echo "  http://127.0.0.1:${DASHBOARD_PORT}/board/heuristic?src=/last-scan.json"
echo "  http://127.0.0.1:${DASHBOARD_PORT}/board/combined/assumptions?src=/last-scan.json"
echo "Show: ~84% scan delta, Heuristic board (2 findings), Assumptions waste share 0.3."
echo ""
wait_for_enter

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ACT 3 — Hybrid scan + apply + dashboard (~6–8 min + LLM)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
npm run tokenforge:presentation-hybrid -- "$DEMO_ROOT"

echo ""
echo "Dashboard (hybrid pass):"
echo "  http://127.0.0.1:${DASHBOARD_PORT}/board/llm?src=/last-scan.json"
echo "  http://127.0.0.1:${DASHBOARD_PORT}/board/llm/findings?src=/last-scan.json"
echo "Show: LLM board unlock, hybrid delta, instruction sprawl findings,"
echo "      managed Copilot section in .github/copilot-instructions.md"
echo ""
echo "presentation-full: done. Reset: npm run tokenforge:reset-hybrid-eval"
