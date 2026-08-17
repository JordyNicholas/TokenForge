import { useDashboard } from "../DashboardContext";
import {
  formatPercent,
  formatUsd,
  type Assumptions,
} from "../calculator";

type Field = {
  key: keyof Assumptions;
  label: string;
  hint: string;
  min: number;
  max?: number;
  step: number;
  percent?: boolean;
};

const FIELDS: Field[] = [
  {
    key: "usdPerMillionTokens",
    label: "USD per million tokens",
    hint: "Editable list price. Not a vendor billing API.",
    min: 0,
    step: 1,
  },
  {
    key: "teamSize",
    label: "Team size",
    hint: "Developers in the business unit.",
    min: 0,
    step: 1,
  },
  {
    key: "msgsPerDevPerDay",
    label: "Messages per developer / day",
    hint: "Chat/Agent turns, not unlimited completions.",
    min: 0,
    step: 1,
  },
  {
    key: "daysPerMonth",
    label: "Working days / month",
    hint: "Used to annualize the monthly $ figure.",
    min: 0,
    max: 31,
    step: 1,
  },
  {
    key: "tokensPerMessage",
    label: "Tokens per message",
    hint: "Assumed context size sent with each turn.",
    min: 0,
    step: 500,
  },
  {
    key: "premiumShare",
    label: "Premium model mix",
    hint: "Share of traffic on the higher-cost model.",
    min: 0,
    max: 1,
    step: 0.05,
    percent: true,
  },
  {
    key: "premiumMultiplier",
    label: "Premium rate multiplier",
    hint: "Premium model costs this × the base rate.",
    min: 1,
    step: 0.5,
  },
  {
    key: "realizedWasteShare",
    label: "Waste applicability",
    hint: "Share of billed usage this waste class applies to. 100% shows the scan ratio; 30% is the pitch scenario on a 99.8% fixture.",
    min: 0,
    max: 1,
    step: 0.05,
    percent: true,
  },
];

export function AssumptionsPage() {
  const { assumptions, projection, patchAssumptions, totals } = useDashboard();

  return (
    <section className="page">
      <h1>Assumptions</h1>
      <p className="muted">
        Tokens → $ is scenario math on the loaded totals. The pitch ~30% is
        this calculator, not a production SLA.
      </p>

      <div className="kpi-row">
        <article className="kpi">
          <p className="kpi-label">Scenario savings</p>
          <p className="kpi-value">{formatPercent(projection.scenarioSavedPercent)}</p>
        </article>
        <article className="kpi">
          <p className="kpi-label">$ saved / month</p>
          <p className="kpi-value">{formatUsd(projection.monthlyUsdSaved)}</p>
        </article>
        <article className="kpi">
          <p className="kpi-label">Scan exclusion</p>
          <p className="kpi-value">{formatPercent(projection.tokenSavedPercent)}</p>
        </article>
      </div>

      <p className="honesty">
        Scan exclusion on these totals is{" "}
        {formatPercent(projection.tokenSavedPercent)} ({totals.savedTokens.toLocaleString()}{" "}
        / {totals.beforeTokens.toLocaleString()} tokens). Displayed savings = exclusion
        × applicability. Changing rate, team size, or mix updates $ live; they do
        not change the percent.
      </p>

      <form className="assumptions-form" onSubmit={(event) => event.preventDefault()}>
        {FIELDS.map((field) => {
          const raw = assumptions[field.key];
          const display = field.percent ? raw * 100 : raw;
          return (
            <label key={field.key} className="field">
              <span className="field-label">
                {field.label}
                {field.percent ? " (%)" : ""}
              </span>
              <input
                type="number"
                min={field.percent ? field.min * 100 : field.min}
                max={
                  field.max === undefined
                    ? undefined
                    : field.percent
                      ? field.max * 100
                      : field.max
                }
                step={field.percent ? field.step * 100 : field.step}
                value={Number.isFinite(display) ? display : 0}
                onChange={(event) => {
                  const next = event.target.valueAsNumber;
                  if (!Number.isFinite(next)) {
                    return;
                  }
                  const stored = field.percent ? next / 100 : next;
                  patchAssumptions({ [field.key]: stored });
                }}
              />
              <span className="field-hint">{field.hint}</span>
            </label>
          );
        })}
      </form>
    </section>
  );
}
