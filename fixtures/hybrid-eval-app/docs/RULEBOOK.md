# Engineering RULEBOOK — checkout-api

Load-bearing standards for humans and agents. TokenForge hybrid eval treats this file
as **required documentation** — excludes here would be a policy mistake.

## 1. Mission

We provide reliable checkout session creation for downstream payment capture. Correctness
and auditability beat feature velocity on hot paths.

## 2. Repository layout

Application code lives in `src/`. API contracts live in `openapi.yaml`. This RULEBOOK
lives under `docs/`. Do not move standards into random markdown files without review.

## 3. Code review

Every change requires peer review except automated dependency bumps tagged `chore(deps)`.
Reviewers verify tests, contract updates, and logging hygiene.

## 4. Testing pyramid

Unit tests are mandatory for business logic. Integration tests belong in the platform
repo, not this fixture. Keep unit tests fast — under five seconds total locally.

## 5. CI expectations

Main must stay green. Flaky tests are treated as production incidents waiting to happen.
Quarantine only with an owner and expiry date.

## 6. Latency SLO

P95 checkout create latency budget: 120ms excluding network in fixture terms; real services
inherit platform SLO tables. Add benchmarks when touching hot paths.

## 7. Error taxonomy

Use stable error codes documented in OpenAPI. Clients rely on codes, not substring matching
of English messages.

## 8. Idempotency

Create-checkout endpoints accept idempotency keys. Handlers must return the same resource
for duplicate keys within the retention window.

## 9. Logging

Structured JSON logs only. Required fields: `traceId`, `checkoutId`, `operation`, `outcome`.
Never log PAN, CVV, or raw tokens.

## 10. Metrics

Emit counters for success/failure and histograms for latency. Dashboards live outside
this fixture.

## 11. Configuration

Use environment variables for non-secret config. Secrets come from the platform secret
store — never from git.

## 12. Feature flags

Flag names follow `checkout_<feature>_enabled`. Document defaults in the flag appendix
below. Support reads this appendix.

## 13. Feature flag appendix

| Flag | Default | Meaning |
| --- | --- | --- |
| checkout_express_enabled | false | Optional express path |
| checkout_audit_verbose | false | Extra audit fields |

## 14. Security

Apply least privilege IAM in real deployments. Report vulnerabilities to security@example.com.

## 15. Dependencies

Prefer stdlib and existing platform libraries. New npm dependencies need justification
in the PR body including bundle impact.

## 16. API versioning

Breaking HTTP changes require major version bumps and migration notes.

## 17. Deprecation

Mark deprecated fields in OpenAPI with sunset dates. Remove only after telemetry shows
zero use.

## 18. Data retention

Checkout records follow platform retention policies. This fixture stores nothing durable.

## 19. On-call

Follow the platform runbook for checkout incidents. Link runbooks, do not paste them
into agent chat wholesale.

## 20. Incident response

Blameless postmortems within five business days of SEV-2+ incidents.

## 21. Accessibility

HTTP APIs expose machine-readable errors; any future UI must meet WCAG AA.

## 22. Internationalization

Currency codes are ISO 4217. Amounts are integer minor units unless documented otherwise.

## 23. Performance testing

Load tests run in staging weekly. Regressions block release trains.

## 24. Documentation

README covers local setup. RULEBOOK covers policy. OpenAPI covers HTTP. Do not duplicate
all three into agent instruction files.

## 25. Agent usage

Agents should cite sections of this RULEBOOK instead of copying it verbatim into prompts.
TokenForge FinOps tracks instruction stack size.

## 26. Ownership

Team: payments-checkout. Escalation: #payments-platform.

## 27. Change management

Standard changes use normal PR flow. Emergency changes need retroactive review within
24 hours.

## 28. Compliance

PCI scope minimization: never persist forbidden data elements in this service.

## 29. Audit

Audit fields must be present on create operations when `checkout_audit_verbose` is enabled.

## 30. Future work

Planned extraction of shared validators into a platform package — track issue CHECK-42.

## Appendix A — glossary

**Checkout session**: ephemeral resource representing an intent to pay.
**Capture**: downstream operation outside this fixture's scope.

## Appendix B — related documents

- `openapi.yaml` — HTTP contract
- `AGENTS.md` — agent canonical summary (not a replacement for this RULEBOOK)

## Appendix C — review checklist

- Tests added or updated
- OpenAPI updated if HTTP changed
- No secrets or card data in diff
- Logging fields present on new paths

## Appendix D — prohibited agent behavior

- Pasting entire lockfiles or CI XML into chat by default
- Duplicating this RULEBOOK into four provider-specific instruction files
- Excluding this RULEBOOK from agent context in Fix policies

## Appendix E — allowed agent behavior

- Linking to RULEBOOK sections by heading
- Quoting short excerpts when editing standards
- Reading `openapi.yaml` when editing routes

## Appendix F — historical note

This RULEBOOK was expanded after an internal audit found overlapping Copilot, Claude,
Cursor, and AGENTS policies consuming excessive always-on tokens.

## Appendix G — training

New engineers read README + RULEBOOK chapters 1–10 in week one. Agents should assume
readers completed that onboarding.

## Appendix H — contact

Questions: checkout-team@example.com (fixture address).
