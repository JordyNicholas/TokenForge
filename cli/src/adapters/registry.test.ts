import { describe, expect, it } from "vitest";
import { UsageError } from "../app/errors";
import {
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  MAX_INSTRUCTION_BYTES,
  copilotAdapter,
  getAdapter,
} from "./index";

describe("getAdapter", () => {
  it("stubs cursor and claude", () => {
    expect(() => getAdapter("cursor")).toThrow(UsageError);
    expect(() => getAdapter("claude")).toThrow(UsageError);
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
    expect(exclusions?.contents).toContain("package-lock.json");
    expect(exclusions?.contents).toContain(
      "src/shared/infra/database/client/**",
    );
    expect(exclusions?.contents).not.toContain("models/User.ts");
  });
});
