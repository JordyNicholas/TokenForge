import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_DASHBOARD_STYLE,
  DASHBOARD_STYLES,
  STYLE_STORAGE_KEY,
  isDashboardStyleId,
  type DashboardStyleId,
} from "./styles";
import { createAppTheme } from "./theme";

type StyleContextValue = {
  styleId: DashboardStyleId;
  setStyleId: (next: DashboardStyleId) => void;
};

const StyleContext = createContext<StyleContextValue | null>(null);

function readStoredStyle(): DashboardStyleId {
  try {
    const stored = localStorage.getItem(STYLE_STORAGE_KEY);
    if (isDashboardStyleId(stored)) {
      return stored;
    }
  } catch {
    /* private mode / SSR */
  }
  return DEFAULT_DASHBOARD_STYLE;
}

export function ThemeAppProvider({ children }: { children: ReactNode }) {
  const [styleId, setStyleIdState] = useState<DashboardStyleId>(readStoredStyle);
  const theme = useMemo(() => createAppTheme(styleId), [styleId]);

  const setStyleId = useCallback((next: DashboardStyleId) => {
    setStyleIdState(next);
    try {
      localStorage.setItem(STYLE_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const value = useMemo(() => ({ styleId, setStyleId }), [styleId, setStyleId]);

  return (
    <StyleContext.Provider value={value}>
      <ThemeProvider
        theme={theme}
        defaultMode="light"
        modeStorageKey="tokenforge-color-mode"
        noSsr
      >
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </StyleContext.Provider>
  );
}

export function useDashboardStyle(): StyleContextValue {
  const value = useContext(StyleContext);
  if (!value) {
    throw new Error("useDashboardStyle must be used inside ThemeAppProvider");
  }
  return value;
}

export function useStyleSwatch() {
  const { styleId } = useDashboardStyle();
  return DASHBOARD_STYLES[styleId];
}
