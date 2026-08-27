# End-to-end test — Active session paths (Extension → CLI)

Runbook for the **extension → CLI** session signal (#137). **~5 minutes**, no
model and no network required — every rule here is deterministic.

Related: [`EXTENSION_CONTEXT_GUARD.md`](../adapters/EXTENSION_CONTEXT_GUARD.md),
[`HEURISTICS_AUDIT.md`](../design/HEURISTICS_AUDIT.md).

## Why this path exists

Every other TokenForge signal is a property of the **file**: its name, its
size, its class. Whether a 250 KB locale file is waste is a property of the
**session** — it depends on whether someone is fixing a translation right now.
A scan running once, offline, cannot know that. Only the editor can, so the
editor has to say.

This is the first integration point between the extension and the CLI. Until
now each wrote its own `.tokenforge/*.json` and neither read the other's.

## Prerequisites

| Requirement | Check |
| --- | --- |
| Node.js 20+ | `node -v` |
| Dependencies | `npm install` (repo root) |

Nothing else — no Ollama, no credentials, no VS Code for the CLI half.

## 1. Baseline — no session signal

```bash
npm run tokenforge -- scan fixtures/active-session-app
```

**Expected**

```
locales/en.json    oversized            64351  excluded
package-lock.json  high_risk_filetype   43988  excluded

savedTokens   108339
savedPercent  99.3%
```

Both are proposed for exclusion. For a repo nobody is currently editing, that
is the correct answer — and it stays the default.

## 2. With the session signal

`fixtures/expected/active-session-last-scan.json` is shaped exactly like the
extension's `.tokenforge/last-scan.json` and lists `locales/en.json` under
`activePaths`.

```bash
npm run tokenforge -- scan fixtures/active-session-app \
  --active-paths-file fixtures/expected/active-session-last-scan.json
```

**Expected**

```
locales/en.json    oversized            64351  kept
package-lock.json  high_risk_filetype   43988  excluded

savedTokens    43988
savedPercent  40.3%
```

Three things to call out, in this order:

1. **The locale file is `kept`, not gone.** The size risk is still reported;
   only the recommendation changed. A developer who wants to exclude it anyway
   still sees it.
2. **`savedTokens` dropped by exactly the locale file's tokens.** That is the
   feature working. Counting it as saved would mean Prove claiming a reduction
   the policy pack never applies.
3. **The lockfile is untouched.** The signal protects what is open without
   blunting the tool on everything else.

## 3. The policy artifact refuses it too

```bash
npm run tokenforge -- apply fixtures/active-session-app --dry-run \
  --active-paths-file fixtures/expected/active-session-last-scan.json
```

Inspect the rendered exclusion candidates: `package-lock.json` is listed,
`locales/en.json` is not — and neither is it a "Do not load" bullet in the
synthesized instruction file.

The guard runs at both consumers of `action: "excluded"`, not only at scan
time. A report can arrive from an older CLI or be hand-edited; the cost of one
stale `excluded` slipping through is a durable policy file telling the agent to
ignore the file its author is editing.

## 4. Real extension export (optional)

```bash
npm run tokenforge:extension
```

Open the repo in VS Code, press **F5**, open a few files in the Extension
Development Host, then point the CLI at the real export:

```bash
npm run tokenforge -- scan . --active-paths-file .tokenforge/last-scan.json
```

Every open tab appears in `activePaths` — at risk or not, idle or not. Idle
tabs are included on purpose: idleness is what makes a tab a candidate for the
reversible in-editor Keep/Filter hint, not grounds for writing "never load
this" into a repo-wide policy file a whole team inherits.

## Not auto-detected, on purpose

`.tokenforge/last-scan.json` is **not** picked up automatically even when it is
sitting right there. A stale export from last week would silently protect paths
nobody has open any more, weakening the policy pack with nothing in the output
to show why. Passing the flag makes the signal's freshness the caller's
explicit claim.

Practical consequence for Platform: **do not** add this flag to the monthly
Prove Action ([`prove-monthly.yml`](../.github/workflows/prove-monthly.yml)).
CI has no session, and pointing it at a checked-in export would protect
whatever some developer happened to have open on the day it was committed.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Cannot read --active-paths-file` | Path is relative to the working directory, not the scan root. |
| `neither a Token Risk report nor an array of paths` | The file parsed as JSON but is neither shape. A bare `["a.json"]` array is accepted. |
| Flag has no effect | Paths must be repo-relative and match the scan root's view (`locales/en.json`, not an absolute path). |
| Everything still excluded | Check the report actually has `activePaths` — a CLI-written report has none unless the flag was used to produce it. |
