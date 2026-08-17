import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { Route, Routes } from "react-router-dom";
import { AssumptionsPage } from "./pages/AssumptionsPage";
import { HeatmapPage } from "./pages/HeatmapPage";
import { OffendersPage } from "./pages/OffendersPage";
import { OverviewPage } from "./pages/OverviewPage";
import { useDashboard } from "./state/DashboardProvider";
import { AppShell } from "./ui/AppShell";

export function App() {
  const { seed } = useDashboard();
  return (
    <AppShell>
      {seed ? (
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/heatmap" element={<HeatmapPage />} />
          <Route path="/offenders" element={<OffendersPage />} />
          <Route path="/assumptions" element={<AssumptionsPage />} />
        </Routes>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 6 }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Loading demo seed…</Typography>
        </Box>
      )}
    </AppShell>
  );
}
