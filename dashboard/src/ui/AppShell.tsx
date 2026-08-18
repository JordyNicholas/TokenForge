import { TOKEN_RISK_REPORT_SCHEMA_ID } from "@tokenforge/risk-core";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import GridViewOutlined from "@mui/icons-material/GridViewOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import PsychologyOutlined from "@mui/icons-material/PsychologyOutlined";
import RuleOutlined from "@mui/icons-material/RuleOutlined";
import StackedBarChartOutlined from "@mui/icons-material/StackedBarChartOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useState, type ReactNode } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  SCAN_LAYER_LABELS,
  seedHasLlmLayer,
  parseBoardLayerFromPath,
  type ScanLayerId,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { SourceBar } from "./SourceBar";
import { ThemeControls } from "./ThemeControls";

const DRAWER_WIDTH = 256;

const BOARDS: {
  id: ScanLayerId;
  label: string;
  icon: typeof StackedBarChartOutlined;
}[] = [
  { id: "combined", label: SCAN_LAYER_LABELS.combined, icon: StackedBarChartOutlined },
  { id: "heuristic", label: SCAN_LAYER_LABELS.heuristic, icon: RuleOutlined },
  { id: "llm", label: SCAN_LAYER_LABELS.llm, icon: PsychologyOutlined },
];

function boardSubpath(pathname: string): string {
  const match = pathname.match(/^\/board\/(?:combined|heuristic|llm)(\/.*)?$/);
  const rest = match?.[1];
  return rest && rest.length > 0 ? rest : "";
}

function isBoardRoute(pathname: string): boolean {
  return pathname.startsWith("/board/");
}

function BoardLayerToggle({
  boardLayer,
  hasLlm,
  onSelect,
  size = "medium",
}: {
  boardLayer: ScanLayerId;
  hasLlm: boolean;
  onSelect: (layer: ScanLayerId) => void;
  size?: "small" | "medium";
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size={size}
      value={boardLayer}
      onChange={(_event, value: ScanLayerId | null) => {
        if (value) {
          onSelect(value);
        }
      }}
      aria-label="Scan board"
    >
      {BOARDS.map((board) => (
        <ToggleButton
          key={board.id}
          value={board.id}
          disabled={board.id === "llm" && !hasLlm}
          aria-label={board.label}
          sx={{
            py: size === "small" ? 0.75 : 1,
            px: size === "small" ? 0.5 : 1,
            textTransform: "none",
            gap: 0.5,
            minWidth: 0,
            "& .MuiSvgIcon-root": { fontSize: size === "small" ? 16 : 18 },
          }}
        >
          <board.icon />
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            {board.label}
          </Box>
          <Box component="span" sx={{ display: { xs: "inline", sm: "none" }, fontSize: "0.7rem" }}>
            {board.id === "heuristic" ? "Heur." : board.label}
          </Box>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { seed } = useDashboard();
  const location = useLocation();
  const boardLayer = parseBoardLayerFromPath(location.pathname);
  const navigate = useNavigate();
  const hasLlm = seed ? seedHasLlmLayer(seed.reports) : false;
  const subpath = boardSubpath(location.pathname);
  const boardBase = `/board/${boardLayer}`;
  const showMobileBoardSwitch = compact && isBoardRoute(location.pathname);

  const selectBoard = (layer: ScanLayerId) => {
    navigate(`/board/${layer}${subpath}`);
  };

  const viewNav = [
    { to: boardBase, label: "Overview", icon: DashboardOutlined, end: true },
    { to: `${boardBase}/heatmap`, label: "Heatmap", icon: GridViewOutlined },
    { to: `${boardBase}/offenders`, label: "Offenders", icon: WarningAmberOutlined },
    { to: "/assumptions", label: "Assumptions", icon: CalculateOutlined },
  ];

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {compact ? null : <Toolbar />}
      <Toolbar sx={{ flexDirection: "column", alignItems: "flex-start", py: 2, gap: 0.25 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
          TokenForge
        </Typography>
        <Typography variant="body2" color="primary">
          Tokens Saved
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {seed?.businessUnit ?? "Loading…"}
        </Typography>
      </Toolbar>

      <Typography variant="overline" sx={{ px: 2, color: "text.secondary" }}>
        Scan board
      </Typography>
      <Tabs
        value={boardLayer}
        onChange={(_event, value: ScanLayerId) => selectBoard(value)}
        variant="fullWidth"
        sx={{ px: 1, mb: 1, minHeight: 40, "& .MuiTab-root": { minHeight: 40, py: 0.5 } }}
      >
        {BOARDS.map((board) => (
          <Tab
            key={board.id}
            value={board.id}
            label={board.label}
            disabled={board.id === "llm" && !hasLlm}
            icon={<board.icon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        ))}
      </Tabs>

      <List sx={{ px: 1, flex: 1 }}>
        {viewNav.map((item) => {
          const selected = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={RouterLink}
                to={item.to}
                selected={selected}
                onClick={() => setMobileOpen(false)}
                sx={{ borderRadius: 6 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon color={selected ? "primary" : "inherit"} />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 2, pb: 2, wordBreak: "break-all" }}
      >
        Prove adapter · {TOKEN_RISK_REPORT_SCHEMA_ID}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          {compact ? (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {compact ? (
              <>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                  TokenForge
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {seed?.businessUnit ?? "Tokens Saved"}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" noWrap>
                {seed?.businessUnit ?? "Business unit"} · {SCAN_LAYER_LABELS[boardLayer]} board
              </Typography>
            )}
          </Box>
          <ThemeControls />
          <SourceBar />
        </Toolbar>
        {showMobileBoardSwitch ? (
          <Box sx={{ px: 1, pb: 1, width: "100%" }}>
            <BoardLayerToggle
              boardLayer={boardLayer}
              hasLlm={hasLlm}
              onSelect={selectBoard}
              size="small"
            />
          </Box>
        ) : null}
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }} aria-label="FinOps views">
        {compact ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                boxSizing: "border-box",
                bgcolor: "background.paper",
                borderRight: 1,
                borderColor: "divider",
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
        }}
      >
        <Toolbar
          sx={{
            minHeight: showMobileBoardSwitch ? 112 : undefined,
          }}
        />
        <Box
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
            pb: { xs: 12, md: 3 },
          }}
        >
          {children}
        </Box>
      </Box>

      {compact ? (
        <Paper
          elevation={3}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (muiTheme) => muiTheme.zIndex.appBar,
            borderRadius: 0,
          }}
        >
          <BottomNavigation
            showLabels
            value={location.pathname.startsWith("/assumptions") ? "/assumptions" : boardBase}
            onChange={(_event, value: string) => navigate(value)}
          >
            {viewNav.slice(0, 3).map((item) => {
              const Icon = item.icon;
              return (
                <BottomNavigationAction
                  key={item.to}
                  label={item.label}
                  value={item.end ? boardBase : item.to}
                  icon={<Icon />}
                />
              );
            })}
          </BottomNavigation>
        </Paper>
      ) : null}
    </Box>
  );
}
