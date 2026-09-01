# AGENTS.md — checkout-api

Guidance for AI coding agents working in this repository. Treat this file as the
**canonical** always-on policy for engineering work on the checkout service.

## Scope and architecture

This service owns HTTP checkout creation and validation for the payments platform.
Business logic lives under `src/`. OpenAPI descriptions live in `openapi.yaml` at
the repo root — read that file when changing routes or request shapes instead of
inferring contracts from call sites alone.

## Source of truth for standards

Human-facing engineering standards live in `docs/RULEBOOK.md`. Link to the relevant
section when you need a rule; do not paste the entire RULEBOOK into chat context
for every task. The RULEBOOK is load-bearing documentation, not disposable noise.

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

## Lockfiles and dependencies

`package-lock.json` pins dependency versions for reproducible installs. Do not paste
the lockfile into agent chat when debugging — summarize the dependency you suspect
and read `package.json` scripts instead.

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

## Database and migrations

This fixture has no database, but if migrations appear in forks, never run destructive
migration commands without explicit human approval.

## Review etiquette

Prefer actionable review comments. Style nits are suggestions unless they violate
documented standards.

## Security reports

If you notice a credential in history or a comment, flag it immediately. Removing
the line in a follow-up commit does not rotate the secret.

## Performance

Avoid unbounded loops and synchronous CPU-heavy work on the request path. Checkout
latency SLO is documented in `docs/RULEBOOK.md`.

## When unsure

Ask a clarifying question rather than guessing payment semantics. Wrong checkout
state is expensive to unwind in production.

## Documentation updates

When setup steps change, update `README.md` in the same PR. Stale onboarding wastes
every new contributor's first hour.

## Feature flags

If flag-gating checkout behavior, document the flag name and default in the RULEBOOK
feature-flag appendix so support can trace behavior.

## Observability

Prefer adding a metric or trace span at service boundaries over printf debugging.
Name spans after checkout operations (`checkout.create`, `checkout.validate`).

## Dependency upgrades

Upgrade one major dependency per PR when possible. Read changelogs for breaking HTTP
client or validation library changes.

## Agent context hygiene

Keep chat context lean: cite file paths and short excerpts instead of dumping whole
directories. TokenForge and FinOps reviewers will thank you.

## Stripe and webhooks (fixture note)

Webhook verification helpers belong in `src/` when added. Do not mock webhook secrets in
committed tests — use env vars documented in README.

## Pagination and list endpoints

If list endpoints are added, use cursor pagination per RULEBOOK API guidelines. Avoid
offset pagination on hot tables.

## Time zones and cutoffs

Settlement cutoffs are UTC internally. Display logic belongs in clients, not checkout
creation handlers.

## Retry storms

When calling downstream payment APIs, use the shared retry helper with jitter. Do not
implement ad-hoc retry loops in route handlers.

## Static analysis

ESLint warnings are errors in CI. Fix or explicitly suppress with a comment referencing
a RULEBOOK exception.

## Load testing artifacts

Do not commit k6 or Locust output directories. They are not source code.

## Container images

Dockerfiles belong in platform repos for real services. This fixture is Node-only.

## Branch naming

Use `feature/`, `fix/`, or `chore/` prefixes. Include ticket IDs when available.

## Release notes

User-visible HTTP changes need a line in the platform release doc — link the PR.

## Agent file overlap

This repository also contains `CLAUDE.md`, Copilot instructions, and Cursor rules.
Prefer editing **this file** for cross-provider guidance and trim duplicates elsewhere.
