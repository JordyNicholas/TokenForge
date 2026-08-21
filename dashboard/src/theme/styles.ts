/**
 * TokenForge brand palette — locked product identity (not a user-selectable theme).
 * Light primary #006A64 / dark #4FDBD0.
 */
export type BrandPalette = {
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

export const TOKENFORGE_BRAND: BrandPalette = {
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
};
