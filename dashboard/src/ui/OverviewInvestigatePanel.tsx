import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";

/**
 * Secondary “Investigate” drawer for hybrid meta / instruction stack / LLM overview —
 * keeps those off the primary Prove KPI path (Uxcel drill-down).
 */
export function OverviewInvestigatePanel({
  title = "Investigate scan detail",
  summary,
  badgeCount,
  children,
}: {
  title?: string;
  summary: string;
  badgeCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const label =
    badgeCount !== undefined && badgeCount > 0
      ? `${title} (${badgeCount})`
      : title;

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography variant="body2" color="text.secondary">
          {summary}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
          {label}
        </Button>
      </Stack>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 }, p: 2 } } }}
      >
        <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 700 }}>
          {title}
        </Typography>
        <Stack spacing={2}>{children}</Stack>
      </Drawer>
    </>
  );
}
