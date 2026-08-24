import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useDashboard } from "../state/DashboardProvider";

export function UsagePeriodPicker() {
  const {
    usagePeriods,
    baselinePeriod,
    afterPeriod,
    setBaselinePeriod,
    setAfterPeriod,
    usageSnapshotLabel,
  } = useDashboard();

  if (usagePeriods.length === 0) {
    return null;
  }

  const afterOptions = usagePeriods.filter((period) => period !== baselinePeriod);

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ mb: 2, alignItems: { sm: "flex-end" } }}
    >
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="baseline-period-label">Baseline period</InputLabel>
        <Select
          labelId="baseline-period-label"
          label="Baseline period"
          value={baselinePeriod ?? ""}
          onChange={(event) => setBaselinePeriod(String(event.target.value))}
        >
          {usagePeriods.map((period) => (
            <MenuItem key={period} value={period}>
              {period}
              {usageSnapshotLabel(period) ? ` · ${usageSnapshotLabel(period)}` : ""}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }} disabled={afterOptions.length === 0}>
        <InputLabel id="after-period-label">After period</InputLabel>
        <Select
          labelId="after-period-label"
          label="After period"
          value={afterPeriod ?? ""}
          onChange={(event) => setAfterPeriod(String(event.target.value))}
        >
          {afterOptions.map((period) => (
            <MenuItem key={period} value={period}>
              {period}
              {usageSnapshotLabel(period) ? ` · ${usageSnapshotLabel(period)}` : ""}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {afterOptions.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Import after-period usage to compare a second billing window.
        </Typography>
      ) : null}
    </Stack>
  );
}
