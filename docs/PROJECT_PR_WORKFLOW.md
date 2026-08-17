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

Issue map: [`docs/BOARD.md`](./BOARD.md).

## Collaborator setup (GitHub UI)

These toggles are **not** settable from the Actions YAML. A repo admin / project
admin must do them once. After that, story PRs only need a `TF#<n>` branch and
`Closes #<n>` in the body.

### 1. Repository secret `PROJECT_TOKEN`

Board Status sync (In Progress / Ready for Review / Epics Finished) needs a token
that can write the user Project. Issue auto-close via `Closes #` still works
with `GITHUB_TOKEN` if this secret is missing (workflows emit a warning).

If you already use `PROJECT_TOKEN` on Flux, reuse the same PAT here
(Projects:write on user projects owned by JordyNicholas).

**Create or reuse a PAT**

Fine-grained PAT (preferred):

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**.
2. Resource owner: **JordyNicholas**. Repository access: **Only select
   repositories** → `TokenForge` (or the org/user repos that need board sync).
3. Permissions:
   - **Contents:** Read
   - **Issues:** Read and write
   - **Pull requests:** Read and write
   - **Projects:** Read and write (account permission — required for
     [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2))
4. Generate and copy the token.

Classic PAT alternative: `repo` + `project` scopes.

**Add it to this repo**

1. Open [JordyNicholas/TokenForge](https://github.com/JordyNicholas/TokenForge).
2. **Settings** → **Secrets and variables** → **Actions**.
3. **New repository secret**.
4. Name: `PROJECT_TOKEN` (exact).
5. Value: the PAT. **Add secret**.

### 2. Automatically delete head branches

Already **enabled** on this repo. To confirm or re-enable:

1. Repo → **Settings** → **General**.
2. Scroll to **Pull Requests**.
3. Check **Automatically delete head branches**.

Needs repo **admin**. After a PR merges, GitHub deletes the head branch
(`TF#<n>-…`). Restore it from the merged PR page if needed.

### 3. Built-in Project workflows

Open [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2)
→ **⋯** (top right) → **Workflows**. For each row below: open it → **Edit** →
set **Status** as listed → **Save and turn on workflow**.

| Built-in workflow | Status to set | Why |
| --- | --- | --- |
| **Item added to project** | **To-Do** | New issues land in the backlog column. |
| **Item closed** | **Done** | Linked story issues close on merge. `[Epic]` titles are then moved to **Epics Finished** by `.github/workflows/project-epic-lifecycle.yml`. |
| **Pull request merged** | **Done** | Merged PRs that are on the board leave Ready for Review. |

Optional (same **Workflows** list): **Auto-add to project** if you want new
`TokenForge` issues/PRs added without `scripts/seed-board.sh`. Filter on this
repository; set added items to **To-Do**.

GitHub already links a PR to issues when the body contains `Closes #<n>` /
`Fixes #<n>` / `Resolves #<n>` (or when the `TF#<n>` workflow appends it).
There is no extra Project toggle named “PR linked to issue”.

GitHub docs: [built-in automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations),
[auto-delete head branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches).

## Labels & Phase

- `epic` — epic container issues
- `phase:e0` … `phase:e5`, `phase:future` — mirror Project **Phase** field
- `type:extension` | `type:cli` | `type:dashboard` | `type:core` | `type:docs`
- `priority:p0` | `priority:p1` | `priority:p2`

Workflow files: `.github/workflows/project-pr-lifecycle.yml`,
`project-epic-lifecycle.yml`. Status option IDs and project identifiers live in
those workflows’ `env` blocks.
