import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import {
  ASSUMPTION_PRESETS,
  PITCH_REALIZED_WASTE_SHARE,
  SCAN_LAYER_LABELS,
  formatPercent,
  formatUsd,
  type Assumptions,
} from "../domain";
import { useLayerView } from "../state/useLayerView";
import { GlossaryTip } from "../ui/GlossaryTip";
import { KpiCard, KpiRow } from "../ui/Kpi";
import { NumberField } from "../ui/NumberField";
import { Page } from "../ui/Page";
import { WasteShareSuggestBanner } from "../ui/WasteShareSuggestBanner";

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
    max: 50,
    step: 1,
  },
  {
    key: "teamSize",
    label: "Team size",
    hint: "Developers in the business unit.",
    min: 0,
    max: 400,
    step: 1,
  },
  {
    key: "msgsPerDevPerDay",
    label: "Messages per developer / day",
    hint: "Chat/Agent turns, not unlimited completions.",
    min: 0,
    max: 200,
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
    max: 32000,
    step: 500,
  },
  {
    key: "premiumShare",
    label: "Premium model mix (%)",
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
    max: 10,
    step: 0.5,
  },
  {
    key: "realizedWasteShare",
    label: "Waste applicability (%)",
    hint: "Share of billed usage this waste class applies to. 100% shows the scan ratio; 30% is the pitch scenario on a 99.8% fixture.",
    min: 0,
    max: 1,
    step: 0.05,
    percent: true,
  },
];

export function AssumptionsPage() {
  const {
    assumptions,
    projection,
    patchAssumptions,
    applyPitchScenario,
    applyAssumptionPresetId,
    totals,
    boardLayer,
  } = useLayerView();

  return (
    <Page
      title={`Assumptions · ${SCAN_LAYER_LABELS[boardLayer]}`}
      lead={
        <>
          Tokens → $ is scenario math on the{" "}
          <GlossaryTip
            term="active scan board"
            definition="Totals follow Combined, Heuristic, or LLM — same board as Overview."
          />
          . The pitch ~30% is this calculator, not a production SLA. Vendor presets seed knobs
          only — not live billing rates.
        </>
      }
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Alert severity="info" variant="outlined" sx={{ flex: 1 }}>
          Using <strong>{SCAN_LAYER_LABELS[boardLayer]}</strong> board totals (
          {totals.savedTokens.toLocaleString()} / {totals.beforeTokens.toLocaleString()}{" "}
          tokens). Displayed savings ={" "}
          <GlossaryTip
            term="exclusion × applicability"
            definition="Scan exclusion % from the board, times waste applicability so you can model how much of billed Chat/Agent traffic this waste class covers."
          />
          .
        </Alert>
        <Button variant="contained" onClick={applyPitchScenario} sx={{ flexShrink: 0 }}>
          Pitch scenario (~{Math.round(PITCH_REALIZED_WASTE_SHARE * 100)}%)
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {ASSUMPTION_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            size="small"
            variant="outlined"
            onClick={() => applyAssumptionPresetId(preset.id)}
            title={preset.hint}
          >
            {preset.label}
          </Button>
        ))}
      </Stack>

      <WasteShareSuggestBanner />

      <KpiRow>
        <KpiCard
          label="Scenario savings"
          value={formatPercent(projection.scenarioSavedPercent)}
        />
        <KpiCard
          label="$ saved / month"
          value={formatUsd(projection.monthlyUsdSaved)}
        />
        <KpiCard
          label="Scan exclusion"
          value={formatPercent(projection.tokenSavedPercent)}
        />
        <KpiCard
          label="Blended rate"
          value={formatUsd(projection.blendedUsdPerMillion)}
          hint="Per million tokens"
        />
      </KpiRow>

      <Box
        component="form"
        onSubmit={(event) => event.preventDefault()}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
        }}
      >
        {FIELDS.map((field) => {
          const raw = assumptions[field.key];
          const display = field.percent ? raw * 100 : raw;
          return (
            <NumberField
              key={field.key}
              label={field.label}
              hint={field.hint}
              min={field.percent ? field.min * 100 : field.min}
              max={
                field.max === undefined
                  ? undefined
                  : field.percent
                    ? field.max * 100
                    : field.max
              }
              step={field.percent ? field.step * 100 : field.step}
              value={display}
              onChange={(next) => {
                const stored = field.percent ? next / 100 : next;
                patchAssumptions({ [field.key]: stored });
              }}
            />
          );
        })}
      </Box>
    </Page>
  );
}
