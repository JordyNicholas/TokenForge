import { TOKEN_RISK_REPORT_SCHEMA_ID } from "@tokenforge/risk-core";
import BalanceOutlined from "@mui/icons-material/BalanceOutlined";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import GridViewOutlined from "@mui/icons-material/GridViewOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import PsychologyOutlined from "@mui/icons-material/PsychologyOutlined";
import RuleOutlined from "@mui/icons-material/RuleOutlined";
import StackedBarChartOutlined from "@mui/icons-material/StackedBarChartOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useCallback, useMemo, useState, useRef, type ReactNode } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  ARCHITECTURE_LABELS,
  boardScopeBase,
  boardSubpath,
  parseBoardLayerFromPath,
  parseTeamIdFromPath,
  SCAN_LAYER_HINTS,
  SCAN_LAYER_LABELS,
  LLM_BOARD_LOCKED_HINT,
  layerActionableFindingCount,
  seedHasLlmLayer,
  type ScanLayerId,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { SourceBar } from "./SourceBar";
import { ThemeControls } from "./ThemeControls";

const DRAWER_WIDTH = 280;

const BOARDS: {
  id: ScanLayerId;
  label: string;
  icon: typeof StackedBarChartOutlined;
}[] = [
  { id: "combined", label: SCAN_LAYER_LABELS.combined, icon: StackedBarChartOutlined },
  { id: "heuristic", label: SCAN_LAYER_LABELS.heuristic, icon: RuleOutlined },
  { id: "llm", label: SCAN_LAYER_LABELS.llm, icon: PsychologyOutlined },
];

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
      {BOARDS.map((board) => {
        const locked = board.id === "llm" && !hasLlm;
        const button = (
          <ToggleButton
            key={board.id}
            value={board.id}
            disabled={locked}
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
            <Box
              component="span"
              sx={{ display: { xs: "inline", sm: "none" }, fontSize: "0.7rem" }}
            >
              {board.id === "heuristic" ? "Heur." : board.label}
            </Box>
          </ToggleButton>
        );
        if (!locked) {
          return button;
        }
        return (
          <Tooltip key={board.id} title={LLM_BOARD_LOCKED_HINT}>
            <span style={{ display: "flex", flex: 1, minWidth: 0 }}>{button}</span>
          </Tooltip>
        );
      })}
    </ToggleButtonGroup>
  );
}

function ScanBoardList({
  boardLayer,
  hasLlm,
  counts,
  onSelect,
}: {
  boardLayer: ScanLayerId;
  hasLlm: boolean;
  counts: Record<ScanLayerId, number>;
  onSelect: (layer: ScanLayerId) => void;
}) {
  return (
    <List dense sx={{ px: 1, mb: 1 }} aria-label="Scan board">
      {BOARDS.map((board) => {
        const locked = board.id === "llm" && !hasLlm;
        const selected = boardLayer === board.id;
        const count = counts[board.id];
        const row = (
          <ListItem key={board.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={selected}
              disabled={locked}
              onClick={() => onSelect(board.id)}
              sx={{
                borderRadius: 2,
                alignItems: "flex-start",
                py: 1,
                border: 1,
                borderColor: selected ? "primary.main" : "divider",
                bgcolor: selected ? "action.selected" : "transparent",
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                <board.icon color={selected ? "primary" : "inherit"} fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: selected ? 600 : 500 }}>
                      {board.label}
                    </Typography>
                    {!locked && count > 0 ? (
                      <Chip size="small" label={count} sx={{ height: 20, fontSize: "0.7rem" }} />
                    ) : null}
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary" component="span">
                    {SCAN_LAYER_HINTS[board.id]}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        );
        if (!locked) {
          return row;
        }
        return (
          <Tooltip key={board.id} title={LLM_BOARD_LOCKED_HINT} placement="right">
            <Box>{row}</Box>
          </Tooltip>
        );
      })}
    </List>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const appBarObserver = useRef<ResizeObserver | null>(null);
  const [appBarHeight, setAppBarHeight] = useState(64);
  const { seed } = useDashboard();
  const location = useLocation();
  const boardLayer = parseBoardLayerFromPath(location.pathname);
  const teamId = parseTeamIdFromPath(location.pathname);
  const navigate = useNavigate();
  const hasLlm = seed ? seedHasLlmLayer(seed.reports) : false;
  const subpath = boardSubpath(location.pathname);
  const boardBase = boardScopeBase(boardLayer, teamId);
  const showMobileBoardSwitch = compact && isBoardRoute(location.pathname);

  const attachAppBar = useCallback((node: HTMLElement | null) => {
    appBarObserver.current?.disconnect();
    appBarObserver.current = null;
    if (!node) {
      return;
    }
    const syncHeight = () => {
      setAppBarHeight(Math.ceil(node.getBoundingClientRect().height));
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    appBarObserver.current = observer;
  }, []);
  const teams = useMemo(() => {
    const names = [...new Set((seed?.reports ?? []).map((report) => report.team))];
    return names.sort((a, b) => a.localeCompare(b));
  }, [seed]);

  const counts = useMemo(() => {
    const reports = seed?.reports ?? [];
    return {
      combined: layerActionableFindingCount(reports, "combined"),
      heuristic: layerActionableFindingCount(reports, "heuristic"),
      llm: layerActionableFindingCount(reports, "llm"),
    } satisfies Record<ScanLayerId, number>;
  }, [seed]);

  const selectBoard = (layer: ScanLayerId) => {
    navigate(`/board/${layer}${subpath}`);
  };

  const selectTeamScope = (next: string | null) => {
    const view = boardSubpath(location.pathname).replace(/^\/team\/[^/]+/, "") || "";
    navigate(boardScopeBase(boardLayer, next) + view);
  };

  const viewNav = [
    { to: boardBase, label: "Overview", icon: DashboardOutlined, end: true },
    { to: `${boardBase}/variance`, label: "Variance", icon: BalanceOutlined },
    { to: `${boardBase}/heatmap`, label: "Heatmap", icon: GridViewOutlined },
    { to: `${boardBase}/findings`, label: "Findings", icon: FactCheckOutlined },
    { to: `${boardBase}/assumptions`, label: "Assumptions", icon: CalculateOutlined },
  ];

  const bottomValue = (() => {
    if (location.pathname.includes("/assumptions")) {
      return `${boardBase}/assumptions`;
    }
    if (location.pathname.includes("/variance")) {
      return `${boardBase}/variance`;
    }
    if (location.pathname.includes("/heatmap")) {
      return `${boardBase}/heatmap`;
    }
    if (location.pathname.includes("/findings")) {
      return `${boardBase}/findings`;
    }
    return boardBase;
  })();

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {compact ? null : <Toolbar />}
      <Box
        sx={{
          px: 2,
          py: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 0.5,
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
          TokenForge
        </Typography>
        <Typography variant="body2" color="primary">
          Tokens Saved
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {seed?.businessUnit ?? "Loading…"}
        </Typography>
        <Chip
          size="small"
          sx={{ mt: 0.25 }}
          color={teamId ? "primary" : "default"}
          label={teamId ? `Team · ${teamId}` : "Global · all teams"}
        />
      </Box>

      <Divider sx={{ mx: 2, mb: 1 }} />

      <Typography
        variant="overline"
        component="p"
        sx={{ px: 2, mb: 0.5, color: "text.secondary", lineHeight: 1.6 }}
      >
        Scope
      </Typography>
      <List dense sx={{ px: 1, mb: 1 }} aria-label="Team scope">
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            selected={!teamId}
            onClick={() => {
              selectTeamScope(null);
              setMobileOpen(false);
            }}
            sx={{ borderRadius: 2 }}
          >
            <ListItemText
              primary="Global (BU)"
              secondary="All teams · architecture roll-up"
            />
          </ListItemButton>
        </ListItem>
        {teams.map((team) => {
          const arch = seed?.architectures?.[team];
          return (
            <ListItem key={team} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={teamId === team}
                onClick={() => {
                  selectTeamScope(team);
                  setMobileOpen(false);
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemText
                  primary={team}
                  secondary={
                    arch
                      ? ARCHITECTURE_LABELS[arch]
                      : seed?.reports.find((r) => r.team === team)?.repo
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Typography variant="overline" sx={{ px: 2, color: "text.secondary" }}>
        Scan board
      </Typography>
      <ScanBoardList
        boardLayer={boardLayer}
        hasLlm={hasLlm}
        counts={counts}
        onSelect={(layer) => {
          selectBoard(layer);
          setMobileOpen(false);
        }}
      />

      <List sx={{ px: 1, flex: 1 }}>
        {viewNav.map((item) => {
          const selected = item.end
            ? location.pathname === item.to ||
              location.pathname === `${item.to}/`
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
        ref={attachAppBar}
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
                {seed?.businessUnit ?? "Business unit"} ·{" "}
                {teamId ? `Team ${teamId}` : "Global"} · {SCAN_LAYER_LABELS[boardLayer]}
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

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="FinOps views"
      >
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
        <Box
          aria-hidden
          data-testid="app-bar-spacer"
          sx={{
            flexShrink: 0,
            height: appBarHeight,
            minHeight: showMobileBoardSwitch ? Math.max(appBarHeight, 128) : appBarHeight,
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
            value={bottomValue}
            onChange={(_event, value: string) => navigate(value)}
          >
            {viewNav.map((item) => {
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
