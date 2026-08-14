#!/usr/bin/env bash
# Seed TokenForge epics, stories, project board links, and sub-issues.
set -euo pipefail

REPO=JordyNicholas/TokenForge
OWNER=JordyNicholas
NAME=TokenForge
PROJECT_ID=PVT_kwHOA1wxk84BgZKI
STATUS_FIELD=PVTSSF_lAHOA1wxk84BgZKIzhale0c
STATUS_TODO=f75ad846
PHASE_FIELD=PVTSSF_lAHOA1wxk84BgZKIzhale7s

declare -A PHASE=(
  [E0]=424c1c6f
  [E1]=92cea90a
  [E2]=3245763b
  [E3]=274f9ed2
  [E4]=b84fb19e
  [E5]=66387b04
  [Future]=b8dcd0a8
)

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

create_issue() {
  local title="$1" body_file="$2"
  shift 2
  local args=(issue create --repo "$REPO" --title "$title" --body-file "$body_file")
  local lab
  for lab in "$@"; do
    args+=(--label "$lab")
  done
  local url
  url=$(gh "${args[@]}")
  echo "${url##*/}"
}

add_to_project() {
  local issue_num="$1" phase_key="$2"
  local ISSUE_ID ITEM_ID
  ISSUE_ID=$(gh api graphql -f query='
    query($owner:String!, $name:String!, $number:Int!) {
      repository(owner:$owner, name:$name) { issue(number:$number) { id } }
    }' -f owner="$OWNER" -f name="$NAME" -F number="$issue_num" --jq '.data.repository.issue.id')

  ITEM_ID=$(gh api graphql -f query='
    mutation($projectId:ID!, $contentId:ID!) {
      addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) {
        item { id }
      }
    }' -f projectId="$PROJECT_ID" -f contentId="$ISSUE_ID" --jq '.data.addProjectV2ItemById.item.id')

  gh api graphql -f query='
    mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) {
      updateProjectV2ItemFieldValue(input:{
        projectId:$projectId itemId:$itemId fieldId:$fieldId
        value:{ singleSelectOptionId:$optionId }
      }) { projectV2Item { id } }
    }' -f projectId="$PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="$STATUS_FIELD" -f optionId="$STATUS_TODO" >/dev/null

  gh api graphql -f query='
    mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) {
      updateProjectV2ItemFieldValue(input:{
        projectId:$projectId itemId:$itemId fieldId:$fieldId
        value:{ singleSelectOptionId:$optionId }
      }) { projectV2Item { id } }
    }' -f projectId="$PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="$PHASE_FIELD" -f optionId="${PHASE[$phase_key]}" >/dev/null
}

link_subissue() {
  local parent="$1" child="$2"
  local PARENT_ID CHILD_ID
  PARENT_ID=$(gh api graphql -f query='
    query($o:String!,$n:String!,$num:Int!){
      repository(owner:$o,name:$n){ issue(number:$num){ id } }
    }' -f o="$OWNER" -f n="$NAME" -F num="$parent" --jq '.data.repository.issue.id')
  CHILD_ID=$(gh api graphql -f query='
    query($o:String!,$n:String!,$num:Int!){
      repository(owner:$o,name:$n){ issue(number:$num){ id } }
    }' -f o="$OWNER" -f n="$NAME" -F num="$child" --jq '.data.repository.issue.id')
  gh api graphql -f query='
    mutation($parent:ID!, $child:ID!) {
      addSubIssue(input:{ issueId:$parent, subIssueId:$child }) {
        issue { number }
      }
    }' -f parent="$PARENT_ID" -f child="$CHILD_ID" >/dev/null \
    || echo "warn: sub-issue link #$parent ← #$child failed" >&2
}

write_body() {
  local file="$1"
  shift
  printf '%s\n' "$@" >"$file"
}

# --- Epics ---
write_body "$tmpdir/e0.md" \
  "## Goal" \
  "Stand up the monorepo, tooling, and delivery docs so CLI / dashboard / extension can land in parallel." \
  "" \
  "## Success" \
  "npm workspaces boot; packages exist; collaborators follow TF# PR workflow." \
  "" \
  "## Stories" \
  "Child issues labeled \`phase:e0\`." \
  "" \
  "## Estimate (roll-up)" \
  "~0.5–1 day"

write_body "$tmpdir/e1.md" \
  "## Goal" \
  "Shared Token Risk helpers + a noisy demo fixture that drives the 30% savings story." \
  "" \
  "## Success" \
  "\`packages/risk-core\` estimates tokens/scores risk; \`fixtures/noisy-app\` has lockfiles/fat configs; JSON contract documented." \
  "" \
  "## Stories" \
  "Child issues labeled \`phase:e1\`." \
  "" \
  "## Estimate (roll-up)" \
  "~1 day"

write_body "$tmpdir/e2.md" \
  "## Goal" \
  "One-click TypeScript CLI that scans a repo and writes lean Copilot instructions + exclusion candidates with before/after token estimate." \
  "" \
  "## Success" \
  "\`tokenforge init|scan|apply\` works on \`fixtures/noisy-app\` and emits \`.tokenforge/scan-report.json\`." \
  "" \
  "## Stories" \
  "Child issues labeled \`phase:e2\`." \
  "" \
  "## Estimate (roll-up)" \
  "~1–2 days"

write_body "$tmpdir/e3.md" \
  "## Goal" \
  "Manager-facing React dashboard proving tokens/\$ saved across a business unit (seeded + CLI JSON)." \
  "" \
  "## Success" \
  "Assumptions panel + BU overview + team heatmap + top offenders; can show ~30% on the demo scenario." \
  "" \
  "## Stories" \
  "Child issues labeled \`phase:e3\`." \
  "" \
  "## Estimate (roll-up)" \
  "~1–2 days"

write_body "$tmpdir/e4.md" \
  "## Goal" \
  "Prototype extension that scores open tabs and filters/recommends excluding inactive (≥15 min) / high-risk background tabs." \
  "" \
  "## Success" \
  "Status bar + panel show token risk; Filter drops estimate; exports JSON for dashboard." \
  "" \
  "## Stories" \
  "Child issues labeled \`phase:e4\`." \
  "" \
  "## Estimate (roll-up)" \
  "~1–2 days"

write_body "$tmpdir/e5.md" \
  "## Goal" \
  "End-to-end demo script and pitch materials that keep FinOps positioning clear (not Auto Memory)." \
  "" \
  "## Success" \
  "≤5 min demo path works; README/pitch FAQ ready; seeded dataset hits scripted ~30%." \
  "" \
  "## Stories" \
  "Child issues labeled \`phase:e5\`." \
  "" \
  "## Estimate (roll-up)" \
  "~0.5–1 day"

write_body "$tmpdir/ef.md" \
  "## Goal" \
  "Post-MVP roadmap: chat compaction, model routing, live billing metrics, org exclusion API apply." \
  "" \
  "## Success" \
  "Documented issues only — do not lead hackathon pitch with these." \
  "" \
  "## Stories" \
  "Child issues labeled \`phase:future\`."

E0=$(create_issue "[Epic] E0 — Foundation" "$tmpdir/e0.md" epic phase:e0 priority:p0)
E1=$(create_issue "[Epic] E1 — Risk core & fixtures" "$tmpdir/e1.md" epic phase:e1 priority:p0 type:core)
E2=$(create_issue "[Epic] E2 — CLI policy pack" "$tmpdir/e2.md" epic phase:e2 priority:p0 type:cli)
E3=$(create_issue "[Epic] E3 — ROI dashboard (React)" "$tmpdir/e3.md" epic phase:e3 priority:p0 type:dashboard)
E4=$(create_issue "[Epic] E4 — VS Code extension (Context Guard)" "$tmpdir/e4.md" epic phase:e4 priority:p0 type:extension)
E5=$(create_issue "[Epic] E5 — Demo polish & pitch" "$tmpdir/e5.md" epic phase:e5 priority:p0 type:docs)
EF=$(create_issue "[Epic] Future — Phase 2 capabilities" "$tmpdir/ef.md" epic phase:future priority:p2)

echo "Epics: E0=$E0 E1=$E1 E2=$E2 E3=$E3 E4=$E4 E5=$E5 Future=$EF"

for pair in "$E0:E0" "$E1:E1" "$E2:E2" "$E3:E3" "$E4:E4" "$E5:E5" "$EF:Future"; do
  add_to_project "${pair%%:*}" "${pair##*:}"
done

story() {
  local key="$1" title="$2" epic="$3" phase="$4"
  shift 4
  local body="$tmpdir/${key}.md"
  write_body "$body" \
    "## Parent" \
    "Epic #$epic" \
    "" \
    "$@"
  local num
  num=$(create_issue "$title" "$body" "$@")
  # labels are passed wrong - fix below
}

# Create stories with explicit labels
mk_story() {
  local outvar="$1" title="$2" epic="$3" phase_key="$4"
  shift 4
  # remaining until -- are body lines, then -- then labels
  local body_lines=()
  while [[ $# -gt 0 && "$1" != "--" ]]; do
    body_lines+=("$1")
    shift
  done
  shift || true # --
  local body="$tmpdir/story-$outvar.md"
  write_body "$body" "## Parent" "Epic #$epic" "" "${body_lines[@]}"
  local num
  num=$(create_issue "$title" "$body" "$@")
  printf -v "$outvar" '%s' "$num"
  add_to_project "$num" "$phase_key"
  link_subissue "$epic" "$num"
  echo "Story #$num ($title)"
}

mk_story S01 "[E0] Scaffold npm workspaces monorepo" "$E0" E0 \
  "## Scope" \
  "- Root package.json workspaces: packages/*, cli, dashboard, extension" \
  "- Shared tsconfig.base.json" \
  "- Placeholder package entries so installs succeed" \
  "" \
  "## Acceptance" \
  "\`npm install\` at root works; workspace packages resolve." \
  -- phase:e0 priority:p0 type:core estimate:0.5d

mk_story S02 "[E0] Document PROJECT_TOKEN + GitHub project UI toggles" "$E0" E0 \
  "## Scope" \
  "- Document required GitHub UI toggles (delete head branches, built-in project workflows)" \
  "- README note for PROJECT_TOKEN secret (same pattern as Flux)" \
  "" \
  "## Acceptance" \
  "docs/PROJECT_PR_WORKFLOW.md lists exact setup steps collaborators need." \
  -- phase:e0 priority:p0 type:docs estimate:0.5d

mk_story S03 "[E1] Implement packages/risk-core (estimate + score)" "$E1" E1 \
  "## Scope" \
  "- estimateTokens(bytes) (bytes/4 default)" \
  "- Filetype risk classes + scoreRisk({ path, bytes, inactiveMs })" \
  "- Exported TypeScript types matching JSON contract in SOLUTION_DESIGN" \
  "" \
  "## Acceptance" \
  "Unit-tested helpers; importable from cli/extension/dashboard." \
  -- phase:e1 priority:p0 type:core estimate:1d

mk_story S04 "[E1] Create fixtures/noisy-app demo repository" "$E1" E1 \
  "## Scope" \
  "- Synthetic Node app with large package-lock.json, fat JSON/XML configs, dist/ junk paths" \
  "- README explaining how it drives the demo savings %" \
  "" \
  "## Acceptance" \
  "CLI scan on fixture reports material before-token baseline." \
  -- phase:e1 priority:p0 type:core estimate:0.5d

mk_story S05 "[E1] Formalize .tokenforge JSON schema (v0)" "$E1" E1 \
  "## Scope" \
  "- docs/schemas/risk-event.schema.json (or zod schema in risk-core)" \
  "- Align extension export + CLI scan-report + dashboard loader" \
  "" \
  "## Acceptance" \
  "Single schema referenced by all three MVP components." \
  -- phase:e1 priority:p1 type:core estimate:0.5d

mk_story S06 "[E2] CLI: tokenforge scan command" "$E2" E2 \
  "## Scope" \
  "- Glob high-risk paths; score with risk-core" \
  "- Print table + write .tokenforge/scan-report.json" \
  "" \
  "## Acceptance" \
  "Works on fixtures/noisy-app; non-zero beforeTokens." \
  -- phase:e2 priority:p0 type:cli estimate:1d

mk_story S07 "[E2] CLI: apply lean copilot-instructions + exclusions" "$E2" E2 \
  "## Scope" \
  "- Templates for lean .github/copilot-instructions.md" \
  "- Exclusion candidate YAML/markdown for org/repo owners" \
  "- apply / init with --dry-run" \
  "" \
  "## Acceptance" \
  "After apply, afterTokens < beforeTokens on fixture; files stay short (no instruction bloat)." \
  -- phase:e2 priority:p0 type:cli estimate:1d

mk_story S08 "[E2] CLI: before/after savings report output" "$E2" E2 \
  "## Scope" \
  "- Human-readable % saved + machine JSON totals" \
  "- Exit codes suitable for demo scripting" \
  "" \
  "## Acceptance" \
  "Report numbers match dashboard seed expectations (± documented rounding)." \
  -- phase:e2 priority:p1 type:cli estimate:0.5d

mk_story S09 "[E3] Scaffold React (Vite) dashboard app" "$E3" E3 \
  "## Scope" \
  "- Vite + React + TS in dashboard/" \
  "- Basic routing/layout shell for FinOps views" \
  "" \
  "## Acceptance" \
  "npm run dev in dashboard serves empty shell." \
  -- phase:e3 priority:p0 type:dashboard estimate:0.5d

mk_story S10 "[E3] Assumptions panel + tokens-to-dollar calculator" "$E3" E3 \
  "## Scope" \
  "- Editable rate, team size, msgs/day, model mix knobs" \
  "- Compute \$ saved from token totals" \
  "- Make 30% claim scenario-transparent" \
  "" \
  "## Acceptance" \
  "Changing assumptions updates \$ figures live." \
  -- phase:e3 priority:p0 type:dashboard estimate:1d

mk_story S11 "[E3] BU overview, team heatmap, top offenders views" "$E3" E3 \
  "## Scope" \
  "- Overview KPI cards (tokens saved, \$, %)" \
  "- Team heatmap" \
  "- Top waste paths/filetypes" \
  "" \
  "## Acceptance" \
  "Seeded dataset renders all three views without errors." \
  -- phase:e3 priority:p0 type:dashboard estimate:1d

mk_story S12 "[E3] Load seeded demo data + optional scan JSON" "$E3" E3 \
  "## Scope" \
  "- Ship dashboard/public/demo-seed.json hitting ~30% on default assumptions" \
  "- Optional file/URL load of CLI/extension JSON" \
  "" \
  "## Acceptance" \
  "Demo path works offline from seed alone." \
  -- phase:e3 priority:p0 type:dashboard estimate:0.5d

mk_story S13 "[E4] Scaffold VS Code extension (TypeScript)" "$E4" E4 \
  "## Scope" \
  "- Extension manifest, activate command, packaging scripts" \
  "- Workspace dependency on risk-core (or bundled build)" \
  "" \
  "## Acceptance" \
  "Extension launches in Extension Development Host." \
  -- phase:e4 priority:p0 type:extension estimate:0.5d

mk_story S14 "[E4] Track tabs + 15-minute inactive / high-risk rule" "$E4" E4 \
  "## Scope" \
  "- Watch open documents; last focus/edit timestamps" \
  "- Mark at-risk when inactive ≥15m or high-risk filetype/size" \
  "" \
  "## Acceptance" \
  "Leaving a fat lockfile idle flips it to at-risk in the panel." \
  -- phase:e4 priority:p0 type:extension estimate:1d

mk_story S15 "[E4] Status bar + risk panel (Keep / Filter) + JSON export" "$E4" E4 \
  "## Scope" \
  "- Status bar token-at-risk readout" \
  "- Side panel actions Keep / Filter" \
  "- Export .tokenforge/last-scan.json" \
  "" \
  "## Acceptance" \
  "Filtering reduces displayed at-risk tokens; JSON validates against schema." \
  -- phase:e4 priority:p0 type:extension estimate:1d

mk_story S16 "[E5] Write 5-min demo script + runbook" "$E5" E5 \
  "## Scope" \
  "- Step-by-step demo: noisy tabs → extension → CLI → dashboard" \
  "- Include Auto Memory differentiator sound bite" \
  "" \
  "## Acceptance" \
  "New teammate can run the demo from the runbook alone." \
  -- phase:e5 priority:p0 type:docs estimate:0.5d

mk_story S17 "[E5] Pitch FAQ: FinOps vs Auto Memory / honesty limits" "$E5" E5 \
  "## Scope" \
  "- Short FAQ in docs for judges/board" \
  "- Billing nuance (credits vs completions) + no-intercept claim" \
  "" \
  "## Acceptance" \
  "Linked from README; aligns with CONCEPT_BRIEF." \
  -- phase:e5 priority:p1 type:docs estimate:0.5d

mk_story S18 "[Future] Chat history compaction assistant" "$EF" Future \
  "## Scope" \
  "Roadmap only: monitor chat token thresholds; suggest/summarize before resubmit." \
  -- phase:future priority:p2

mk_story S19 "[Future] Intelligent model routing recommendations" "$EF" Future \
  "## Scope" \
  "Roadmap only: classify prompt complexity; recommend standard vs premium models." \
  -- phase:future priority:p2

mk_story S20 "[Future] Live Copilot usage metrics / billing sync" "$EF" Future \
  "## Scope" \
  "Roadmap only: replace simulated ROI with org usage metrics API data." \
  -- phase:future priority:p2

mk_story S21 "[Future] Apply org content exclusions via GitHub API" "$EF" Future \
  "## Scope" \
  "Roadmap only: CLI/API path to push exclusion rules for org owners." \
  -- phase:future priority:p2

cat > /home/jordy-silva/TokenForge/docs/BOARD.md <<EOF
# TokenForge board map

Project: [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2)

Columns: **To-Do**, **In Progress**, **Ready for Review**, **Done**, **Epics Finished**.

## Epics

| Epic | Issue | Phase |
| --- | --- | --- |
| Foundation | #$E0 | E0 |
| Risk core & fixtures | #$E1 | E1 |
| CLI policy pack | #$E2 | E2 |
| ROI dashboard (React) | #$E3 | E3 |
| VS Code extension | #$E4 | E4 |
| Demo polish & pitch | #$E5 | E5 |
| Future / Phase 2 | #$EF | Future |

## Stories

| Issue | Title | Epic |
| --- | --- | --- |
| #$S01 | Scaffold npm workspaces monorepo | E0 |
| #$S02 | Document PROJECT_TOKEN + GitHub UI toggles | E0 |
| #$S03 | Implement packages/risk-core | E1 |
| #$S04 | Create fixtures/noisy-app | E1 |
| #$S05 | Formalize .tokenforge JSON schema | E1 |
| #$S06 | CLI: scan command | E2 |
| #$S07 | CLI: apply instructions + exclusions | E2 |
| #$S08 | CLI: before/after savings report | E2 |
| #$S09 | Scaffold React dashboard | E3 |
| #$S10 | Assumptions panel + calculator | E3 |
| #$S11 | BU overview / heatmap / offenders | E3 |
| #$S12 | Seeded demo data + JSON load | E3 |
| #$S13 | Scaffold VS Code extension | E4 |
| #$S14 | Tabs + 15-min / high-risk rule | E4 |
| #$S15 | Status bar + panel + JSON export | E4 |
| #$S16 | Demo script + runbook | E5 |
| #$S17 | Pitch FAQ (vs Auto Memory) | E5 |
| #$S18 | Future: chat compaction | Future |
| #$S19 | Future: model routing | Future |
| #$S20 | Future: live usage metrics | Future |
| #$S21 | Future: org exclusion API apply | Future |

## Build order

E0 → E1 → E2 → E3 → E4 → E5 (Future deferred).
EOF

echo "BOARD.md written"
gh issue list --repo "$REPO" --limit 40
