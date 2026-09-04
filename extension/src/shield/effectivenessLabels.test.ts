import { describe, expect, it } from "vitest";
import { formatShieldBadge, rollupShieldEffectiveness } from "./effectivenessLabels";

describe("rollupShieldEffectiveness", () => {
  it("groups levers by mode and effectiveness", () => {
    const rollup = rollupShieldEffectiveness([
      { mode: "hard", effectiveness: "full" },
      { mode: "hard", effectiveness: "full" },
      { mode: "soft", effectiveness: "partial" },
    ]);
    expect(rollup).toHaveLength(2);
    expect(rollup[0]?.label).toBe("Hard · full");
    expect(rollup[0]?.count).toBe(2);
  });
});

describe("formatShieldBadge", () => {
  it("labels soft and hard modes", () => {
    expect(formatShieldBadge("soft", "advisory")).toBe("Soft · advisory");
    expect(formatShieldBadge("hard", "partial")).toBe("Hard · partial");
  });
});
