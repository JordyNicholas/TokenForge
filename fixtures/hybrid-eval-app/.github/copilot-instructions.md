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

## Scope and architecture

This service owns HTTP checkout creation and validation for the payments platform.
Business logic lives under `src/`. OpenAPI descriptions live in `openapi.yaml` at
the repo root — read that file when changing routes or request shapes instead of
inferring contracts from call sites alone.

## Tests before commit

Run `npm test` locally before every commit. CI failures on trivial changes still
cost the team a full pipeline slot. Snapshot and contract tests here are small but
real — a one-line change can break them.

## Pull request discipline

Keep each pull request focused on a single concern. If you need to refactor helpers
and add a feature, split the work unless the refactor is a strict prerequisite with
no behavior change.

## Commit messages

Explain **what** changed and **why** in the subject and body. Reviewers should not
need to reverse-engineer intent from a diff titled "fix stuff".

## Prefer live source over artifacts

When implementing or debugging, read `src/**/*.js` and `openapi.yaml`. Do not treat
`coverage/`, `test-results/`, or lockfiles as primary context — they are outputs or
install graphs, not the product.

## Reuse existing helpers

Before adding another email validator, money formatter, or retry wrapper, search
under `src/`. Duplicate helpers drift apart and double maintenance cost.

## Error handling

Never swallow errors in checkout paths. Log with enough context to trace `checkoutId`
and propagate or map to HTTP errors at the boundary.

## API contract changes

Any change to public request or response fields requires updating `openapi.yaml` in
the same pull request. Do not document APIs only in comments.

## Logging and PII

Do not log full card numbers, CVV, or raw auth tokens. Structured logs may include
checkout IDs and coarse error codes only.

## Configuration

Runtime configuration is environment-driven. Do not hard-code secrets or per-environment
URLs in `src/` — use the patterns documented in the RULEBOOK configuration chapter.

## When unsure

Ask a clarifying question rather than guessing payment semantics. Wrong checkout
state is expensive to unwind in production.

## Observability

Prefer adding a metric or trace span at service boundaries over printf debugging.
Name spans after checkout operations (`checkout.create`, `checkout.validate`).

## Retry storms

When calling downstream payment APIs, use the shared retry helper with jitter. Do not
implement ad-hoc retry loops in route handlers.
