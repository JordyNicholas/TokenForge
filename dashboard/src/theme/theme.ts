import { createTheme } from "@mui/material/styles";
import { TOKENFORGE_BRAND } from "./styles";

export function createAppTheme() {
  const brand = TOKENFORGE_BRAND;

  return createTheme({
    cssVariables: {
      colorSchemeSelector: "class",
    },
    defaultColorScheme: "light",
    colorSchemes: {
      light: {
        palette: {
          primary: { main: brand.light.primary },
          secondary: { main: brand.light.secondary },
          background: {
            default: brand.light.background,
            paper: brand.light.paper,
          },
        },
      },
      dark: {
        palette: {
          primary: { main: brand.dark.primary },
          secondary: { main: brand.dark.secondary },
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
