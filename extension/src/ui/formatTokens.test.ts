import { describe, expect, it } from "vitest";
import { formatTokenCount } from "./formatTokens";

describe("formatTokenCount", () => {
  it("formats compact token counts", () => {
    expect(formatTokenCount(0)).toBe("0");
    expect(formatTokenCount(999)).toBe("999");
    expect(formatTokenCount(1_200)).toBe("1.2k");
    expect(formatTokenCount(600_000)).toBe("600.0k");
    expect(formatTokenCount(1_500_000)).toBe("1.5M");
  });
});
