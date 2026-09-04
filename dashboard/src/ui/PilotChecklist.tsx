import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import { useNavigate } from "react-router-dom";
import { GlossaryTip } from "./GlossaryTip";
import { useDashboard } from "../state/DashboardProvider";
import { useLayerView } from "../state/useLayerView";
import { boardScopeBase } from "../domain";

type ChipTone = "success" | "default" | "warning";

function tone(done: boolean, partial?: boolean): ChipTone {
  if (done) {
    return "success";
  }
  if (partial) {
    return "warning";
  }
  return "default";
}

/**
 * Compact Prove loop checklist — Scan · Fix markers · Baseline · After · Variance.
 * Clicks navigate to Source (hash) or Variance; GlossaryTip on Prove loop.
 */
export function PilotChecklist() {
  const navigate = useNavigate();
  const { boardLayer, teamId } = useLayerView();
  const {
    seed,
    changeMarkers,
    compareBaselineUsage,
    compareAfterUsage,
    sessionStats,
    periodBindUnbound,
  } = useDashboard();

  const hasScan = Boolean(seed?.reports?.length);
  const hasMarkers = changeMarkers.length > 0;
  const hasBaseline = compareBaselineUsage !== null;
  const hasAfter = compareAfterUsage !== null;
  const varianceReady = hasBaseline && hasAfter;

  const openVariance = () => {
    navigate(`${boardScopeBase(boardLayer, teamId)}/variance`);
  };

  const openSource = () => {
    window.dispatchEvent(new CustomEvent("tokenforge:open-source"));
  };

  const steps: Array<{
    label: string;
    done: boolean;
    partial?: boolean;
    title: string;
    onClick: () => void;
  }> = [
    {
      label: "Scan",
      done: hasScan,
      title: hasScan ? "Token Risk scan loaded" : "Load a scan report (Source → Detect)",
      onClick: openSource,
    },
    {
      label: "Fix markers",
      done: hasMarkers,
      title: hasMarkers
        ? `${changeMarkers.length} Fix marker(s)`
        : "Load prove-change markers (Source → Prove)",
      onClick: openSource,
    },
    {
      label: "Baseline usage",
      done: hasBaseline,
      title: hasBaseline
        ? `Baseline ${compareBaselineUsage?.period}`
        : "Import baseline billed usage",
      onClick: openSource,
    },
    {
      label: "After usage",
      done: hasAfter,
      title: hasAfter
        ? `After ${compareAfterUsage?.period}`
        : "Import after-period billed usage",
      onClick: openSource,
    },
    {
      label: "Variance ready",
      done: varianceReady,
      partial: periodBindUnbound,
      title: varianceReady
        ? periodBindUnbound
          ? "Variance loaded — period bind was ambiguous; pick periods on Variance"
          : "Open Variance board"
        : "Need baseline + after usage",
      onClick: openVariance,
    },
  ];

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", flexWrap: "wrap", mb: 1.5 }}
      data-testid="pilot-checklist"
    >
      <GlossaryTip term="Prove loop" termId="prove-loop" />
      {sessionStats ? (
        <Tooltip title="Session hygiene loaded">
          <Chip size="small" label="Session" color="success" variant="outlined" />
        </Tooltip>
      ) : null}
      {steps.map((step) => (
        <Tooltip key={step.label} title={step.title}>
          <Chip
            size="small"
            label={step.label}
            color={tone(step.done, step.partial)}
            variant={step.done ? "filled" : "outlined"}
            onClick={step.onClick}
            clickable
          />
        </Tooltip>
      ))}
    </Stack>
  );
}
