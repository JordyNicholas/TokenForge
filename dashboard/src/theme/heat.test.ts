import { describe, expect, it } from "vitest";
import { heatFill, heatOnFill, resolveColorMode } from "./heat";

describe("heatFill", () => {
  it("shifts from teal toward red as waste rises", () => {
    const low = heatFill(0, "light");
    const high = heatFill(100, "light");
    expect(low.startsWith("hsl(162")).toBe(true);
    expect(high.startsWith("hsl(0")).toBe(true);
  });

  it("uses a lighter surface in light mode than dark mode", () => {
    const light = heatFill(50, "light");
    const dark = heatFill(50, "dark");
    const lightL = Number(light.match(/(\d+)%\)$/)?.[1]);
    const darkL = Number(dark.match(/(\d+)%\)$/)?.[1]);
    expect(lightL).toBeGreaterThan(darkL);
  });
});

describe("heatOnFill", () => {
  it("uses dark text on light cells", () => {
    expect(heatOnFill("light")).toBe("#1C1B1F");
    expect(heatOnFill("dark")).toBe("#E6E1E5");
  });
});

describe("resolveColorMode", () => {
  it("defaults to light", () => {
    expect(resolveColorMode(undefined, undefined)).toBe("light");
  });

  it("follows an explicit dark choice", () => {
    expect(resolveColorMode("dark", "light")).toBe("dark");
  });
});
