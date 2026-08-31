import { describe, expect, it } from "vitest";
import {
  CURSOR_EXCLUSIONS_PATH,
  CURSOR_IGNORE_CANDIDATES_PATH,
  CURSOR_INSTRUCTIONS_PATH,
  cursorAdapter,
} from "./cursor";

describe("cursorAdapter", () => {
  it("renders instructions, exclusion YAML, and ignore candidates", () => {
    const files = cursorAdapter.render({
      source: "cli",
      timestamp: "2026-01-01T00:00:00.000Z",
      repo: "fixtures/noisy-app",
      team: "payments-platform",
      provider: "cursor",
      findings: [
        {
          path: "package-lock.json",
          reason: "high_risk_filetype",
          bytes: 1000,
          estTokens: 250,
          action: "excluded",
        },
        {
          path: "dist/bundle.js",
          reason: "high_risk_filetype",
          bytes: 500,
          estTokens: 125,
          action: "excluded",
        },
      ],
      totals: { beforeTokens: 375, afterTokens: 0, savedTokens: 375 },
    });

    expect(files.map((file) => file.path)).toEqual([
      CURSOR_INSTRUCTIONS_PATH,
      CURSOR_EXCLUSIONS_PATH,
      CURSOR_IGNORE_CANDIDATES_PATH,
    ]);

    const ignore = files.find((file) => file.path === CURSOR_IGNORE_CANDIDATES_PATH);
    expect(ignore?.contents).toContain("human review required");
    expect(ignore?.contents).toContain("never overwrites an existing .cursorignore");
    expect(ignore?.contents).toContain("package-lock.json");
    expect(ignore?.contents).toContain("dist/bundle.js");
    expect(files.some((file) => file.path === ".cursorignore")).toBe(false);
  });
});
