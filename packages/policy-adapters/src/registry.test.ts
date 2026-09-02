import type { ProviderId } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { PolicyError } from "./errors";
import {
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  MAX_INSTRUCTION_BYTES,
  copilotAdapter,
  getAdapter,
} from "./index";

describe("getAdapter", () => {
  it("resolves every supported provider", () => {
    const providers: ProviderId[] = ["copilot", "generic", "cursor", "claude"];
    for (const provider of providers) {
      expect(getAdapter(provider).id).toBe(provider);
    }
  });

  it("rejects an unknown provider", () => {
    expect(() => getAdapter("nope" as ProviderId)).toThrow(PolicyError);
  });

  it("renders a short Copilot instruction file", () => {
    const files = copilotAdapter.render({
      source: "cli",
      timestamp: "2026-08-17T18:00:00.000Z",
      repo: "fixtures/noisy-app",
      team: "payments-platform",
      provider: "copilot",
      findings: [
        {
          path: "package-lock.json",
          reason: "high_risk_filetype",
          bytes: 100,
          estTokens: 25,
          action: "excluded",
        },
        {
          path: "src/shared/infra/database/client/models/User.ts",
          reason: "high_risk_filetype",
          bytes: 1000,
          estTokens: 250,
          action: "excluded",
        },
        {
          path: "src/shared/infra/database/client/models/Tenant.ts",
          reason: "high_risk_filetype",
          bytes: 1000,
          estTokens: 250,
          action: "excluded",
        },
      ],
      totals: { beforeTokens: 100, afterTokens: 10, savedTokens: 90 },
    });

    const instructions = files.find((file) => file.path === COPILOT_INSTRUCTIONS_PATH);
    const exclusions = files.find((file) => file.path === COPILOT_EXCLUSIONS_PATH);
    expect(instructions).toBeDefined();
    expect(Buffer.byteLength(instructions?.contents ?? "", "utf8")).toBeLessThanOrEqual(
      MAX_INSTRUCTION_BYTES,
    );
    expect(instructions?.contents).toContain("## Do not load");
    expect(instructions?.contents).toContain("package-lock.json");
    expect(instructions?.contents).toContain("## Prefer");
    expect(exclusions?.contents).toContain("package-lock.json");
    expect(exclusions?.contents).toContain(
      "src/shared/infra/database/client/**",
    );
    expect(exclusions?.contents).not.toContain("models/User.ts");
  });
});
