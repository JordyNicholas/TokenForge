import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useColorScheme, useTheme } from "@mui/material/styles";
import { useState, type MouseEvent } from "react";
import { useDashboardStyle } from "../theme/ThemeAppProvider";
import { DASHBOARD_STYLE_IDS, DASHBOARD_STYLES } from "../theme/styles";
import { resolveColorMode } from "../theme/heat";

export function ThemeControls() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));
  const { mode, setMode, systemMode } = useColorScheme();
  const { styleId, setStyleId } = useDashboardStyle();
  const resolved = resolveColorMode(mode, systemMode);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (compact) {
    return (
      <>
        <Tooltip title="Appearance">
          <IconButton
            color="inherit"
            aria-label="Appearance and color style"
            onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
          >
            <PaletteOutlined />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          slotProps={{ paper: { sx: { minWidth: 12 * 16 } } }}
        >
          <MenuItem disabled>
            <Typography variant="overline">Appearance</Typography>
          </MenuItem>
          <MenuItem
            selected={resolved === "light"}
            onClick={() => {
              setMode("light");
              setAnchor(null);
            }}
          >
            <LightModeOutlined fontSize="small" sx={{ mr: 1 }} />
            Light
          </MenuItem>
          <MenuItem
            selected={resolved === "dark"}
            onClick={() => {
              setMode("dark");
              setAnchor(null);
            }}
          >
            <DarkModeOutlined fontSize="small" sx={{ mr: 1 }} />
            Dark
          </MenuItem>
          <MenuItem disabled>
            <Typography variant="overline">Color style</Typography>
          </MenuItem>
          {DASHBOARD_STYLE_IDS.map((id) => (
            <MenuItem
              key={id}
              selected={styleId === id}
              onClick={() => {
                setStyleId(id);
                setAnchor(null);
              }}
            >
              <StyleDot id={id} />
              {DASHBOARD_STYLES[id].label}
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {DASHBOARD_STYLES[id].hint}
              </Typography>
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={styleId}
        onChange={(_event, next: typeof styleId | null) => {
          if (next) {
            setStyleId(next);
          }
        }}
        aria-label="Color style"
      >
        {DASHBOARD_STYLE_IDS.map((id) => (
          <ToggleButton key={id} value={id} aria-label={DASHBOARD_STYLES[id].label}>
            <StyleDot id={id} />
            {DASHBOARD_STYLES[id].label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={resolved}
        onChange={(_event, next: "light" | "dark" | null) => {
          if (next) {
            setMode(next);
          }
        }}
        aria-label="Appearance"
      >
        <ToggleButton value="light" aria-label="Light mode">
          <LightModeOutlined fontSize="small" sx={{ mr: 0.75 }} />
          Light
        </ToggleButton>
        <ToggleButton value="dark" aria-label="Dark mode">
          <DarkModeOutlined fontSize="small" sx={{ mr: 0.75 }} />
          Dark
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

function StyleDot({ id }: { id: (typeof DASHBOARD_STYLE_IDS)[number] }) {
  return (
    <Box
      component="span"
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        mr: 0.75,
        bgcolor: DASHBOARD_STYLES[id].light.primary,
        display: "inline-block",
      }}
    />
  );
}
