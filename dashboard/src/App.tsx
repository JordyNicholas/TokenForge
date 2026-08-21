import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { Navigate, Route, Routes } from "react-router-dom";
import { AssumptionsPage } from "./pages/AssumptionsPage";
import { FindingsPage } from "./pages/FindingsPage";
import { HeatmapPage } from "./pages/HeatmapPage";
import { OverviewPage } from "./pages/OverviewPage";
import { useDashboard } from "./state/DashboardProvider";
import { AppShell } from "./ui/AppShell";

function BoardRoutes() {
  return (
    <Routes>
      <Route index element={<OverviewPage />} />
      <Route path="heatmap" element={<HeatmapPage />} />
      <Route path="findings" element={<FindingsPage />} />
      <Route path="assumptions" element={<AssumptionsPage />} />
      <Route path="offenders" element={<Navigate to="findings" replace />} />
    </Routes>
  );
}

export function App() {
  const { seed } = useDashboard();
  return (
    <AppShell>
      {seed ? (
        <Routes>
          <Route path="/" element={<Navigate to="/board/combined" replace />} />
          <Route path="/board/:layerId/*" element={<BoardRoutes />} />
          <Route
            path="/assumptions"
            element={<Navigate to="/board/combined/assumptions" replace />}
          />
          <Route path="*" element={<Navigate to="/board/combined" replace />} />
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
