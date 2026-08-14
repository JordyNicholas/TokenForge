# Project ↔ PR operating model

TokenForge uses **GitHub Issues + Projects** as the source of truth for delivery.
Branch names help humans and automation, but the **real link** is always an
issue reference on the pull request.

Board: [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2)

## Branch naming

```text
TF#<issue-number>
TF#<issue-number>-short-slug
```

Examples: `TF#12`, `TF#18-cli-scan`.

`TOKENFORGE#<n>` is also accepted by automation (case-insensitive).

The workflow `.github/workflows/project-pr-lifecycle.yml` parses this pattern and
appends `Closes #<n>` to the PR body when it is missing.

## Pull requests

Every task PR should:

1. Use a `TF#<n>` branch name when possible.
2. Include `Closes #<n>` (or `Fixes` / `Resolves`) in the PR body — this
   **auto-closes the issue when the PR merges**.
3. Prefer opening as **Ready for review** when you want peer review; use
   **Draft** while still implementing.
4. Map to **one existing Issue** (do not open orphan PRs).

## Board Status automation

Columns: **To-Do → In Progress → Ready for Review → Done** (+ **Epics Finished** for epics).

| Event | Board Status |
| --- | --- |
| Draft PR opened / converted to draft | In Progress |
| PR opened ready for review / marked ready | Ready for Review |
| Commits pushed to a non-draft PR | Ready for Review |
| PR merged / linked **story** issue closed | Done |
| **`[Epic]` issue closed** | **Epics Finished** |
| **`[Epic]` issue reopened** | To-Do |
| PR closed without merge | To-Do |

Epics are detected by title prefix `[Epic]` (e.g. `[Epic] E2 — …`). Story/task
issues use **Done**. The epic Action re-asserts **Epics Finished** after a short
delay so the built-in “closed → Done” project workflow does not win the race.

Also enable at the repository/project level (GitHub UI):

- **Automatically delete head branches** after merge — **enabled** on this repo
- Built-in Project workflows (Project → … → Workflows): item closed → Done,
  PR merged → Done, PR linked to issue, item added → To-Do
  (epics are corrected to **Epics Finished** by the Action above)

Issue map: [`docs/BOARD.md`](./BOARD.md).

## Secret required

Repository secret `PROJECT_TOKEN` must be a PAT (or GitHub App token) that can
update the user Project board. Recommended fine-grained scopes:
**Contents: read**, **Issues: write**, **Pull requests: write**, **Projects: write**.

Without it, issue linking still works with `GITHUB_TOKEN`; board Status sync is
skipped (workflows emit a warning).

If you already use `PROJECT_TOKEN` on Flux, reuse the same PAT on TokenForge
(Projects:write on user projects owned by JordyNicholas).

## Labels & Phase

- `epic` — epic container issues
- `phase:e0` … `phase:e5`, `phase:future` — mirror Project **Phase** field
- `type:extension` | `type:cli` | `type:dashboard` | `type:core` | `type:docs`
- `priority:p0` | `priority:p1` | `priority:p2`

Workflow files: `.github/workflows/project-pr-lifecycle.yml`,
`project-epic-lifecycle.yml`. Status option IDs and project identifiers live in
those workflows’ `env` blocks.
