import { describe, expect, it } from "vitest";
import { scanRepo } from "../commands/scan/scan";
import { fixtureRoot } from "../test/helpers";
import { formatScanTable } from "./table";

describe("formatScanTable", () => {
  it("renders findings and totals", async () => {
    const result = await scanRepo({
      root: fixtureRoot,
      now: new Date("2026-08-17T18:00:00.000Z"),
    });

    const table = formatScanTable(result);
    expect(table).toContain("PATH");
    expect(table).toContain("high_risk_filetype");
    expect(table).toContain("savedTokens");
  });
});
