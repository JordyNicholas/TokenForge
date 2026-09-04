# EM team Prove — multi-person Fix-on / control

**Audience:** Engineering managers running a **6-person** (or larger) BU Prove loop with a Friday inbox drop.  
**Companion:** [`STANDARD_PILOT_KIT.md`](./STANDARD_PILOT_KIT.md) · [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md) · [`MONTHLY_CADENCE.md`](./MONTHLY_CADENCE.md) · [`F25_EM_MULTI_PERSON_PROVE.md`](../delivery/F25_EM_MULTI_PERSON_PROVE.md)

---

## What this runbook delivers

A repeatable **multi-team** Prove path without a spreadsheet:

| Step | Command / surface | Artifact |
| --- | --- | --- |
| Inbox scaffold | `tokenforge inbox-init ./bu-inbox --with-roster` | `inbox/README.md`, optional `tokenforge-roster.json` |
| Developer drops | Extension **Export to inbox** or CLI scan with `TOKENFORGE_INBOX` | `inbox/{team}/{repo}/.tokenforge/` |
| Friday validate | `tokenforge inbox-validate ./bu-inbox --roster ./tokenforge-roster.json` | Exit 0 = roster coverage OK |
| Prove pack | `tokenforge prove-pack ./bu-inbox --roster ./roster.json` | `org-prove-pack.json` |
| Dashboard boot | `tokenforge stage-dashboard ./org-prove-pack.json` | `?pack=/org-prove-pack.json` |
| Usage remap | Load usage team map in SourceBar or `tokenforge remap-usage` | Vendor labels → TF team ids |
| Variance review | Dashboard **Variance** board | Estimate vs billed Δ + cohort |

---

## Honesty traps (say this in reviews)

> TokenForge reconciles **estimated** context savings with **imported** vendor usage.
> We do **not** tap any agent's private pipeline. Invoice delta is **not** 100% causal
> without a **control cohort**. Inbox scans are **local file handoffs** — not live billing sync.
> Prove-pack coverage gaps (missing scans/sessions) are **honest warnings**, not green-washed KPIs.

---

## Recommended roster (6-person BU)

Pick **one Fix-on team** (apply marker) and **at least one control team** (no marker):

| Role | Team id (TF) | Fix-on? |
| --- | --- | --- |
| Payments API | `payments-platform` | Yes (pilot Fix) |
| Checkout | `checkout` | Control |
| Platform | `platform-services` | Control |
| Data | `data-eng` | Optional control |
| Mobile / Web | `mobile`, `web` | As needed |

Roster file: `{ schemaVersion: 1, teams: [{ id: "payments-platform" }, …] }`.

Set `tokenforge.teamLabel` in each repo workspace so exports land under the correct inbox folder.

---

## Friday inbox drop (weekly)

1. **Developers** (Mon–Thu): Context Guard daily; export or CLI scan drops into inbox paths.
2. **EM** (Friday):
   ```bash
   npm run tokenforge -- inbox-validate ./bu-inbox --roster ./tokenforge-roster.json
   npm run tokenforge -- prove-pack ./bu-inbox --team "Retail Banking" --roster ./tokenforge-roster.json
   npm run tokenforge -- stage-dashboard ./bu-inbox/org-prove-pack.json
   ```
3. **FinOps**: import baseline + after-period usage; load **usage team map** if vendor labels differ from TF team ids.
4. **Director**: Variance review with frozen Assumptions + cohort tags; optional `prove-report`.

Example CI (copy, not enabled in root): [`.github/workflows/examples/tokenforge-em-prove.yml`](../../.github/workflows/examples/tokenforge-em-prove.yml).

---

## Usage team map

FinOps exports often use human-readable team names. TokenForge scans use stable team ids.

Map file (`schemaVersion: 1`):

```json
{
  "schemaVersion": 1,
  "map": {
    "Payments Platform": "payments-platform",
    "Checkout Team": "checkout"
  }
}
```

- **Dashboard:** Source → Prove package → **Load usage team map…** (applies to baseline, after, and period snapshots).
- **CLI:** `tokenforge remap-usage --map map.json --in usage.json --out usage-remapped.json`
- **Sample:** [`dashboard/public/sample-usage-team-map.json`](../../dashboard/public/sample-usage-team-map.json)

---

## Variance review checklist

- [ ] Baseline period **before** Fix marker timestamp; after period **after**.
- [ ] Usage team map loaded when vendor labels ≠ scan team ids.
- [ ] **Re-freeze Assumptions** when starting after-period compare.
- [ ] Control team present for `strong` / `suggestive` calibration (not all Fix-on).
- [ ] Copy prove summary cites **calibration band**, not 100% causation.

---

## Non-goals

- Hosted multi-tenant inbox SaaS
- Auto-committing inbox folders to `main` without Platform policy
- Claiming prove-pack rollup replaces per-repo drift gates
