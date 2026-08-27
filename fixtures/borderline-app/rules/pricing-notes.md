# Pricing rules (business notes)

Internal notes for the pricing team — not an AI agent instruction file.

- Tier 1 (0-99 seats): list price, no discount.
- Tier 2 (100-499 seats): 10% volume discount, requires manager approval.
- Tier 3 (500+ seats): custom quote, route to enterprise sales.
- Annual prepay: additional 5% off any tier.
- Non-profit / education: 20% off list price, requires verification doc.

This file happens to live under a directory literally named `rules/`, same as
an editor's agent-instructions folder (e.g. `.cursor/rules/`) would be named.
It exists to check whether TokenForge's instruction-path detection
(`isInstructionPath` in `packages/risk-core/src/candidates/candidates.ts`)
over-matches on the bare segment name instead of the actual instruction
location. See `docs/design/HEURISTICS_AUDIT.md` (B1).
