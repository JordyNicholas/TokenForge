import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
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
import { resolveColorMode } from "../theme/heat";

export function ThemeControls() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));
  const { mode, setMode, systemMode } = useColorScheme();
  const resolved = resolveColorMode(mode, systemMode);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (compact) {
    return (
      <>
        <Tooltip title="Appearance">
          <IconButton
            color="inherit"
            aria-label="Appearance"
            onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
          >
            {resolved === "dark" ? <DarkModeOutlined /> : <LightModeOutlined />}
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          slotProps={{ paper: { sx: { minWidth: 10 * 16 } } }}
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
        </Menu>
      </>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
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
