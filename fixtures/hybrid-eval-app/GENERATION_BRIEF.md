# hybrid-eval-app — instruction generation brief

Fictional repo: **checkout-api** — a small Node.js payment checkout service.

Generate **four overlapping agent instruction files** for TokenForge hybrid eval demos.
Each file must feel like a different team ran "ask the LLM to write our agent policy"
on the same sprint — same themes, **different wording**, occasional contradictions.

## Files to produce

| Path | Voice |
| --- | --- |
| `AGENTS.md` | Canonical engineering guide — the one to keep |
| `CLAUDE.md` | Claude-specific copy with paraphrased overlap + 2 Claude-only bullets |
| `.github/copilot-instructions.md` | Copilot copy; include one bad habit: "paste package-lock.json when debugging deps" |
| `.cursor/rules/checkout-api.mdc` | Cursor rule frontmatter + bullets; overlap testing/PR guidance |

## Required themes (paraphrase across files — never verbatim repeat)

- Run tests before commit; keep PRs small
- Prefer editing `src/` not generated output
- Do not paste CI logs, coverage trees, or lockfiles into chat
- Reuse helpers under `src/` (email, money, retry) — do not duplicate
- `docs/RULEBOOK.md` is the standards source — link, do not duplicate entire file in chat
- `openapi.yaml` is the API contract — read when changing routes, do not rewrite from memory

## Anti-patterns to embed (for TokenForge to catch)

- One file says "load the entire RULEBOOK into context for every task" (bad — RULEBOOK must stay, advice is wrong)
- One file duplicates 8+ sections that exist almost identically elsewhere
- Copilot file is ~90% redundant with AGENTS.md

## Size targets

- Each instruction file: **3.5–5 KB** prose (not repeated paragraphs)
- Do not exceed 100 KB per file

## Do not generate

- `docs/RULEBOOK.md` (checked in separately — load-bearing standards doc)
- Source code, lockfiles, or test output artifacts
