/**
 * Canonical FinOps glossary — short strings for hover tooltips, long for the Glossary page.
 * Honesty: estimated avoided context ≠ invoice causation.
 */

export type GlossaryTermId =
  | "live-hygiene"
  | "scan-delta"
  | "scenario-usd"
  | "bill-reconcile"
  | "variance"
  | "cohort"
  | "combined-board"
  | "heuristic-board"
  | "llm-board"
  | "cli-synced"
  | "waste-applicability"
  | "prove-loop"
  | "honest-tiers"
  | "exclusion-ratio"
  | "calibration"
  | "honor-smoke"
  | "enforcement";

export type GlossaryTerm = {
  id: GlossaryTermId;
  title: string;
  /** Tooltip / hover copy (1–2 sentences). */
  short: string;
  /** Glossary page body. */
  long: string;
  /** Optional related board view suffix, e.g. "variance". */
  relatedView?: "variance" | "assumptions" | "findings" | "heatmap";
};

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  {
    id: "prove-loop",
    title: "Prove loop",
    short: "Detect waste → Fix packs → reconcile estimated savings with imported billed usage.",
    long: "TokenForge Prove is baseline scan → apply Fix packs → import baseline and after-period billed usage → compare estimate vs actual on Variance. It does not meter any agent’s private context pipeline.",
    relatedView: "variance",
  },
  {
    id: "honest-tiers",
    title: "Honest savings tiers",
    short:
      "Four labeled signals from live Filter hygiene through billed usage. Higher tiers reconcile estimates — they do not prove causation without cohort controls.",
    long: "Tiers measure different signals and do not stack into one causal savings number. Live hygiene is IDE Filter/Shield; scan delta is local policy math; projected $ uses Assumptions; imported bill is FinOps export reconcile. Cohort tags reduce “was that TokenForge?” noise — they do not prove 100% of an invoice delta was caused by TokenForge.",
  },
  {
    id: "live-hygiene",
    title: "Live hygiene",
    short:
      "Extension Filter/Shield estimate from this IDE window. Hygiene advice only — not agent interception.",
    long: "Live hygiene comes from session-stats.json (Context Guard Filter/Shield). It is an estimate of tabs filtered this window, not billed usage and not private pipeline metering.",
  },
  {
    id: "scan-delta",
    title: "Scan tokens avoided",
    short: "Before/after token totals from a repo scan or apply — local context policy, not billed usage.",
    long: "Scan delta is the difference between estimated context tokens before and after exclusions on the active scan board (Combined, Heuristic, or LLM). It feeds Fix adapters and scenario $, not your vendor invoice.",
    relatedView: "findings",
  },
  {
    id: "scenario-usd",
    title: "Scenario $",
    short:
      "Scan exclusion % × Assumptions (rate, team size, msgs/day). Scenario math — not a production SLA.",
    long: "Scenario dollars project monthly waste under editable Assumptions. Changing knobs does not rewrite the scan JSON. Pitch ~30% is this calculator with waste applicability, not a live billing guarantee.",
    relatedView: "assumptions",
  },
  {
    id: "bill-reconcile",
    title: "Bill reconcile",
    short:
      "Import baseline + after-period billed usage to compare estimate vs actual. Not live vendor sync.",
    long: "Bill reconcile uses FinOps CSV/JSON or CLI-synced usage files. Open Variance for estimated reduction, actual billed change, and variance %. Invoice delta is not 100% causal without a control cohort.",
    relatedView: "variance",
  },
  {
    id: "variance",
    title: "Variance",
    short: "Actual billed change minus estimated reduction for a period. Billed usage compare — not pipeline metering.",
    long: "Variance = actual billed Δ − estimated reduction (scan × frozen Assumptions). Gap % is relative to the estimate. Prefer matching periods and providers. Freeze Assumptions when the after-period compare starts so knobs do not rewrite history.",
    relatedView: "variance",
  },
  {
    id: "cohort",
    title: "Cohort (Fix-on vs control)",
    short:
      "Teams with vs without a Fix apply marker. Suggestive billed compare — not proof TokenForge caused the invoice delta.",
    long: "Prove change markers tag Fix-on teams. Control teams lack a marker when any Fix-on team exists. Relative billed Δ (Fix-on − control) is interpretive only. Empty control (all teams Fix-on) is weak evidence. Honesty: not 100% causation.",
    relatedView: "variance",
  },
  {
    id: "combined-board",
    title: "Combined board",
    short: "Merged heuristic + LLM findings used by Fix adapters.",
    long: "Combined is the default Prove board: heuristic baseline plus any hybrid LLM exclusions. Fix packs and most manager KPIs use this layer.",
  },
  {
    id: "heuristic-board",
    title: "Heuristic board",
    short: "Deterministic baseline from size, path class, and inactivity — no AI.",
    long: "Heuristic Detect runs locally with no model calls. Use it as the fast baseline and when hybrid enrichment is off or unavailable.",
  },
  {
    id: "llm-board",
    title: "LLM board",
    short: "Optional semantic enrichment from a hybrid scan. Empty if the model added no exclusions.",
    long: "The LLM board shows only model-proposed exclusions (excluded/filtered). Kept findings and seeds without LLM savings correctly show zero totals — switch to Combined or Heuristic for the full picture.",
  },
  {
    id: "cli-synced",
    title: "CLI-synced file",
    short: "Usage written by tokenforge usage-sync / usage-pull — a local file, not a live FinOps console.",
    long: "source: sync means the dashboard loaded a file the CLI wrote from a vendor adapter. It is still an import for Prove, not streaming admin billing.",
  },
  {
    id: "waste-applicability",
    title: "Waste applicability",
    short:
      "Share of billed Chat/Agent traffic this waste class applies to. 100% shows scan ratio; 30% is the pitch scenario on a high-exclusion fixture.",
    long: "Displayed scenario savings = scan exclusion % × waste applicability. Tune this on Assumptions when only part of billed usage is Chat/Agent context waste.",
    relatedView: "assumptions",
  },
  {
    id: "exclusion-ratio",
    title: "Exclusion ratio",
    short: "Saved tokens ÷ before tokens on the active scan board for a team.",
    long: "Heatmap color encodes each team’s exclusion ratio on the current board. Click a cell or team to open that team’s scoped dashboard.",
    relatedView: "heatmap",
  },
  {
    id: "calibration",
    title: "Calibration band",
    short:
      "How strongly estimate vs billed Δ can be read: strong / suggestive / weak / insufficient — never 100% causation.",
    long: "Calibration compares estimated reduction to imported billed change. Strong requires a control cohort and aligned movement. Suggestive/weak/insufficient are honest labels for empty control or noisy periods. See prove-report and Variance Copy prove summary.",
    relatedView: "variance",
  },
  {
    id: "honor-smoke",
    title: "Honor smoke",
    short:
      "Checklist that the host appears to honor Soft/Hard Shield files — observation, not metering.",
    long: "`tokenforge honor-smoke` writes `.tokenforge/honor-smoke.json` with Cursor Soft (`.cursorindexingignore`) and Hard (`.cursorignore`) verification steps. It does not intercept the agent pipeline or prove invoice savings.",
  },
  {
    id: "enforcement",
    title: "Enforcement tier",
    short: "How reliably a provider honors Shield/ignore: full, partial, or advisory.",
    long: "Cursor Shield is full where ignore files are honored. Copilot and Gemini are partial. Claude and generic instruction packs are advisory unless a host-native ignore merge exists. Candidates are not enforced until promote-shield.",
  },
] as const;

const BY_ID = new Map(GLOSSARY_TERMS.map((term) => [term.id, term]));

export function glossaryTerm(id: GlossaryTermId): GlossaryTerm {
  const term = BY_ID.get(id);
  if (!term) {
    throw new Error(`Unknown glossary term: ${id}`);
  }
  return term;
}

export function glossaryHash(id: GlossaryTermId): string {
  return `glossary-${id}`;
}
