/** Sequential teal → red, tuned separately for light and dark surfaces. */
export function heatFill(percent: number, mode: "light" | "dark"): string {
  const t = Math.min(100, Math.max(0, percent)) / 100;
  const hue = 162 - t * 162;
  if (mode === "light") {
    return `hsl(${hue} 52% ${90 - t * 24}%)`;
  }
  return `hsl(${hue} 48% ${18 + t * 18}%)`;
}

export function heatOnFill(mode: "light" | "dark"): string {
  return mode === "light" ? "#1C1B1F" : "#E6E1E5";
}

export function resolveColorMode(
  mode: "light" | "dark" | "system" | undefined,
  systemMode: "light" | "dark" | undefined,
): "light" | "dark" {
  if (mode === "dark" || (mode === "system" && systemMode === "dark")) {
    return "dark";
  }
  return "light";
}
