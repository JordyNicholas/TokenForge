import { createTheme } from "@mui/material/styles";
import { DASHBOARD_STYLES, type DashboardStyleId } from "./styles";

export function createAppTheme(styleId: DashboardStyleId) {
  const style = DASHBOARD_STYLES[styleId];

  return createTheme({
    cssVariables: {
      colorSchemeSelector: "class",
    },
    defaultColorScheme: "light",
    colorSchemes: {
      light: {
        palette: {
          primary: { main: style.light.primary },
          secondary: { main: style.light.secondary },
          background: {
            default: style.light.background,
            paper: style.light.paper,
          },
        },
      },
      dark: {
        palette: {
          primary: { main: style.dark.primary },
          secondary: { main: style.dark.secondary },
          background: {
            default: "#121212",
            paper: "#1E1E1E",
          },
        },
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 500, letterSpacing: 0 },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 },
      button: { textTransform: "none", fontWeight: 500 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 20 },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0, variant: "outlined" },
        styleOverrides: {
          root: { borderRadius: 16 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 16 },
        },
      },
      MuiAppBar: {
        defaultProps: { color: "inherit", elevation: 0 },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { textTransform: "none", borderRadius: 20 },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: "none",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600 },
        },
      },
    },
  });
}
