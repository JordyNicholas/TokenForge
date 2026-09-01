# CLAUDE.md — checkout-api

Working agreements for Claude and other assistants in this repo. These mirror the
team norms documented in `AGENTS.md`, expressed in Claude-friendly language.

## What this service does

The checkout-api package implements HTTP checkout flows for the payments platform.
Implementation code is under `src/`. Treat `openapi.yaml` as the authoritative
description of external HTTP shapes.

## Standards documentation

Engineering policy is centralized in `docs/RULEBOOK.md`. Reference the specific
chapter you need. Loading the entire RULEBOOK into every conversation wastes tokens
and duplicates content already summarized here and in `AGENTS.md`.

## Testing expectations

Execute the full unit suite with `npm test` before you commit. A green local run
is the minimum bar — waiting for CI to fail first slows everyone down.

## Pull requests

Ship incremental changes. Wide refactors mixed with feature work are hard to review
and easy to rubber-stamp incorrectly.

## Commits

Write messages that stand alone: a reviewer should understand intent without opening
the patch. Avoid placeholders like "address feedback" without saying what changed.

## Where to read code

Start with `src/` and the OpenAPI file. Coverage reports and CI XML exports are
downstream artifacts — useful for humans debugging CI, not as primary agent reading
material.

## Dependencies

Use `package.json` to understand scripts and direct dependencies. The lockfile is
for install reproducibility, not for pasting into prompts when something fails to
resolve.

## Helper reuse

Search for existing validators and formatters before writing new ones. Parallel
implementations of the same checkout validation rules diverge quickly.

## Failures and errors

Checkout code must surface failures clearly. Silent catches hide production incidents
behind vague 500 responses.

## Contract discipline

When you alter an endpoint, update `openapi.yaml` concurrently. Comments are not a
substitute for the published contract.

## Sensitive data

Never echo payment card data or auth secrets into logs, tests, or example snippets.

## Configuration patterns

Follow the RULEBOOK's configuration section for environment-specific values. Do not
embed staging URLs in source as constants.

## Review tone

Be direct and kind in review threads. Block on correctness and security, not personal
style preferences.

## Security hygiene

Treat accidental secret commits as incidents. Rotation is required even if the
offending line is removed later.

## Latency awareness

Keep request-path work bounded. Refer to RULEBOOK SLO tables when adding work to
hot paths.

## Uncertainty

Payment edge cases should be confirmed with a human rather than assumed from naming
alone.

## README maintenance

Update onboarding docs when commands or env vars change.

## Flags and rollout

Document new feature flags where support teams look — the RULEBOOK flag appendix.

## Tracing

Add spans around checkout operations instead of ad-hoc logging alone.

## Upgrades

Batch dependency bumps carefully; read breaking changes for HTTP and schema libraries.

## Context size

Prefer path references and short quotes over attaching entire trees. This reduces
token bleed in metered agent products.

## Claude-specific note

When using extended thinking, still respect the reuse and contract rules above —
reasoning depth does not replace reading `openapi.yaml`.

## Webhooks and signatures

Verify webhook signatures in production code paths. Test fixtures use fake secrets via
env vars only.

## Pagination

Prefer cursor-based lists for any future collection endpoints.

## Time handling

Store instants in UTC. Convert for display at the edge.

## Retries

Use shared retry utilities — no bespoke sleep loops in handlers.

## Linting

Treat ESLint failures as merge blockers unless documented otherwise in RULEBOOK.

## Load test output

Never commit performance run directories.

## Docker

Out of scope for this fixture repository.

## Branches

Name branches with conventional prefixes plus ticket identifiers when possible.

## Release communication

Call out HTTP-visible changes in release notes.

## Instruction file sprawl

Multiple provider instruction files exist; consolidate toward `AGENTS.md` over time.
