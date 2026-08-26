# heuristic-edge-app (TokenForge demo fixture)

Synthetic payments app used as the **edge-case fixture for #135**. Not an npm
workspace and not a product package.

`borderline-app/` proves what today's heuristics get *wrong* and pins it.
This fixture proves what the #135 rules get *right* — so the interesting part
is what is **absent** from the findings table, not what is in it.

Every rule here is deterministic path shape, not LLM judgment: the default
scan stays heuristic.

## What's in here and why

| Path | ~Bytes | Before #135 | Now | Rule |
| --- | ---: | --- | --- | --- |
| `openapi.json` | 153 KB | `oversized` → **excluded** | keep | `api_contract`. Size tracks how complete the contract is, so the flat 100 KB bar points the wrong way: the better the contract, the more likely it was flagged. |
| `tsconfig.json` | ~0.3 KB | keep | keep | `protected_config`. Same outcome, different reason — it used to survive only by sitting under the size bar, which is luck. Now it is protected by rule at any size. |
| `src/generated/graphql/{schema.json,types.ts}` | ~1 KB | keep (no rule saw them) | keep | `necessary_generated`. `generated/` is now classified `generated`, and this API-client pairing is exempted from the high-risk class — an agent reads it to call the API correctly, unlike a compiled bundle. |
| `test/fixtures/recorded-orders.json` | 86 KB | **missed** (86 KB < 100 KB) | `oversized` → excluded | `AUXILIARY_OVERSIZED_BYTES`. Recorded payloads under a `fixtures/` tree get a 25 KB bar, so bulk test data stops hiding under the bar meant for hand-written code. |
| `config/service-account.json` | ~0.6 KB | eligible LLM candidate | **never a candidate** | `isSecretPath`. Credential-shaped **name**, blocked in `risk-core` before any read. |
| `config/app-settings.json` | ~0.3 KB | eligible LLM candidate | **never a candidate** | `hasSecretContent`. Innocuous name, credential-shaped **content** — only the CLI's post-read gate can catch this one. |
| `package-lock.json` | 226 KB | `high_risk_filetype` → excluded | unchanged | Control: real waste must still be caught. |
| `src/index.ts` | <1 KB | keep | keep | Control: small active source stays in the keep-set. |

## Credential files are fake

`config/service-account.json` and `config/app-settings.json` contain **no live
secret**. The AWS-shaped string is `AKIAIOSFODNN7EXAMPLE`, AWS's own documented
placeholder; the private key body reads `NOT-A-REAL-KEY-THIS-IS-A-TEST-FIXTURE`.
They exist so a test can assert that neither path is ever handed to an LLM
enricher — the point is the gate, not the value.

## Expected scan result

Two findings (`package-lock.json`, `test/fixtures/recorded-orders.json`).
Golden file: `fixtures/expected/heuristic-edge-app-totals.json`, which also
pins a `notFindings` block — the protected paths, with the reason each would
have been flagged before. A regression that re-flags `openapi.json` shows up
there.

## Layout

```text
fixtures/heuristic-edge-app/
├── openapi.json          # large, load-bearing API contract
├── tsconfig.json         # small, load-bearing build config
├── package-lock.json     # control: still excluded
├── config/               # two fake-credential files (name gate + content gate)
├── src/generated/        # generated but necessary API surface
├── src/index.ts          # control: keep-set
└── test/fixtures/        # auxiliary bulk data under the lower size bar
```
