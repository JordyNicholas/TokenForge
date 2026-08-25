import { describe, expect, it } from "vitest";
import {
  buildPackId,
  isProveChangeMarker,
  type ProveChangeMarker,
} from "./changeMarker";

const sample: ProveChangeMarker = {
  timestamp: "2026-08-25T16:00:00.000Z",
  provider: "copilot",
  packId: "apply:copilot",
  action: "apply",
  team: "payments-platform",
  repo: "fixtures/noisy-app",
};

describe("ProveChangeMarker contract (risk-core)", () => {
  it("validates a minimal apply marker", () => {
    expect(isProveChangeMarker(sample)).toBe(true);
    expect(
      isProveChangeMarker({
        timestamp: sample.timestamp,
        provider: "cursor",
        packId: "org-pack:cursor:Retail Banking",
        action: "org-pack",
        businessUnit: "Retail Banking",
      }),
    ).toBe(true);
  });

  it("rejects missing required fields and bad action", () => {
    expect(isProveChangeMarker({ ...sample, action: "sync" })).toBe(false);
    expect(isProveChangeMarker({ ...sample, packId: "" })).toBe(false);
    expect(isProveChangeMarker({ ...sample, provider: "" })).toBe(false);
  });

  it("builds pack ids for apply and org-pack", () => {
    expect(buildPackId("apply", "copilot")).toBe("apply:copilot");
    expect(buildPackId("org-pack", "cursor", "Retail Banking")).toBe(
      "org-pack:cursor:Retail Banking",
    );
    expect(buildPackId("org-apply", "copilot", "acme")).toBe(
      "org-apply:copilot:acme",
    );
  });
});
