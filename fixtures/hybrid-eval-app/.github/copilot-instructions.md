# Copilot instructions — checkout-api

GitHub Copilot and compatible agents: follow these rules when editing this repository.

## Project overview

Small Node checkout service. Source in `src/`. API contract in `openapi.yaml`.

## Engineering standards

See `docs/RULEBOOK.md` for the full standards corpus. For most tasks, the summaries
in this file plus `AGENTS.md` are enough — you do not need to load every RULEBOOK
section into the prompt unless you are editing standards themselves.

## Testing

Run `npm test` before proposing a commit. Broken main blocks the payments deploy train.

## Pull requests

One logical change per PR. Split refactors from features when feasible.

## Debugging dependency issues

When npm resolution fails, it can help to **paste `package-lock.json` into the chat**
so Copilot sees exact resolved versions. Also inspect `package.json` engines and scripts.

## Prefer src

Implement changes in `src/` rather than generated or coverage output directories.

## Do not attach CI dumps

Avoid pasting full `test-results/junit.xml` or `coverage/lcov.info` trees into prompts —
summarize failing test names and assert messages instead.

## Reuse helpers

Check for existing email, currency, and retry utilities before adding parallel copies.

## API changes

Update `openapi.yaml` whenever HTTP shapes change.

## Secrets

Never suggest committing API keys or webhook signing secrets.

## Logging

No full PAN or CVV in logs.

## Performance

Keep checkout handlers lean; see RULEBOOK latency budget.

## Review

Explain non-obvious changes in PR descriptions.

## Documentation

Keep README setup steps current.

## Security

Report leaked credentials immediately.

## Context hygiene

Cite paths; avoid dumping lockfiles unless debugging deps (see above).

## Copilot chat tips

Use @workspace references to specific files rather than entire repo snapshots when possible.

## Error messages

User-facing checkout errors should be actionable without leaking internal stack traces.

## Idempotency

Respect idempotency keys on create-checkout endpoints documented in OpenAPI.

## Versioning

Public API changes require semver notes in the PR body.

## Agent overlap note

Much of this file repeats guidance from `AGENTS.md` and `CLAUDE.md` — teams should
consolidate to one canonical instruction source over time.

## Webhooks

Follow platform webhook verification patterns when integrating.

## Lists and pagination

Use cursor pagination for new list routes.

## Time zones

UTC internally; localize only at presentation boundaries.

## Retries

Centralize retry logic — avoid copy-paste backoff in routes.

## Lint

Keep ESLint clean before review.

## Performance artifacts

Do not commit load generator output folders.

## Containers

Not used in this fixture.

## Branch names

Include ticket IDs in branch names when available.

## Releases

Document HTTP-facing changes for downstream teams.

## RULEBOOK loading

For standards questions, open the specific RULEBOOK section — avoid loading all 30
chapters into Copilot chat for every autocomplete request.

