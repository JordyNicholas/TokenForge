export const DASHBOARD_STYLE_IDS = ["teal", "blue", "violet"] as const;

export type DashboardStyleId = (typeof DASHBOARD_STYLE_IDS)[number];

export type StyleSwatch = {
  id: DashboardStyleId;
  label: string;
  /** Short pitch label for the style switcher. */
  hint: string;
  light: {
    primary: string;
    secondary: string;
    background: string;
    paper: string;
  };
  dark: {
    primary: string;
    secondary: string;
  };
};

/**
 * Material-aligned palettes. Light surfaces stay near white; dark uses
 * Material's #121212 grey (not pure black) so cards can stack by lightness.
 */
export const DASHBOARD_STYLES: Record<DashboardStyleId, StyleSwatch> = {
  teal: {
    id: "teal",
    label: "Teal",
    hint: "TokenForge",
    light: {
      primary: "#006A64",
      secondary: "#9A6700",
      background: "#F7FAF9",
      paper: "#FFFFFF",
    },
    dark: {
      primary: "#4FDBD0",
      secondary: "#F5C44C",
    },
  },
  blue: {
    id: "blue",
    label: "Blue",
    hint: "Material",
    light: {
      primary: "#1565C0",
      secondary: "#00695C",
      background: "#F7F9FC",
      paper: "#FFFFFF",
    },
    dark: {
      primary: "#90CAF9",
      secondary: "#80CBC4",
    },
  },
  violet: {
    id: "violet",
    label: "Violet",
    hint: "Expressive",
    light: {
      primary: "#6750A4",
      secondary: "#006A6A",
      background: "#F8F6FC",
      paper: "#FFFFFF",
    },
    dark: {
      primary: "#D0BCFF",
      secondary: "#4FD8D4",
    },
  },
};

export const DEFAULT_DASHBOARD_STYLE: DashboardStyleId = "teal";
export const STYLE_STORAGE_KEY = "tokenforge-dashboard-style";

export function isDashboardStyleId(value: string | null): value is DashboardStyleId {
  return DASHBOARD_STYLE_IDS.includes(value as DashboardStyleId);
}
