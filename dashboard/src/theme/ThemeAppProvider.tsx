import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";
import { createAppTheme } from "./theme";

const appTheme = createAppTheme();

export function ThemeAppProvider({ children }: { children: ReactNode }) {
  const theme = useMemo(() => appTheme, []);

  return (
    <ThemeProvider
      theme={theme}
      defaultMode="light"
      modeStorageKey="tokenforge-color-mode"
      noSsr
    >
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
