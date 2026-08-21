import { describe, expect, it } from "vitest";
import { withPitchScenario, PITCH_REALIZED_WASTE_SHARE, DEFAULT_ASSUMPTIONS } from "./assumptions";
import { listHybridScanSummaries } from "./hybridMeta";
import { displayPath, isDemoSourceLabel } from "./privacy";
import { layerActionableFindingCount } from "./layers";

describe("displayPath", () => {
  it("returns full path when not redacting", () => {
    expect(displayPath("src/app/BigFile.ts", false)).toBe("src/app/BigFile.ts");
  });

  it("returns basename when redacting", () => {
    expect(displayPath("src/app/BigFile.ts", true)).toBe("BigFile.ts");
    expect(displayPath("C:\\repo\\lock.json", true)).toBe("lock.json");
  });
});

describe("isDemoSourceLabel", () => {
  it("recognizes demo seed URL", () => {
    expect(isDemoSourceLabel("/demo-seed.json")).toBe(true);
    expect(isDemoSourceLabel("scan-report.json")).toBe(false);
  });
});

describe("withPitchScenario", () => {
  it("sets waste applicability to the pitch share", () => {
    const next = withPitchScenario(DEFAULT_ASSUMPTIONS);
    expect(next.realizedWasteShare).toBe(PITCH_REALIZED_WASTE_SHARE);
    expect(next.teamSize).toBe(DEFAULT_ASSUMPTIONS.teamSize);
  });
});

describe("listHybridScanSummaries", () => {
  it("skips noop backends", () => {
    const rows = listHybridScanSummaries([
      {
        source: "cli",
        timestamp: "2026-08-18T00:00:00.000Z",
        repo: "demo",
        team: "alpha",
        provider: "generic",
        findings: [],
        totals: { beforeTokens: 0, afterTokens: 0, savedTokens: 0 },
        scan: {
          mode: "hybrid",
          llm: {
            backend: "noop",
            model: "none",
            durationMs: 0,
            candidatesSent: 0,
          },
        },
      },
      {
        source: "cli",
        timestamp: "2026-08-18T00:00:00.000Z",
        repo: "demo",
        team: "beta",
        provider: "generic",
        findings: [],
        totals: { beforeTokens: 0, afterTokens: 0, savedTokens: 0 },
        scan: {
          mode: "hybrid",
          llm: {
            backend: "ollama",
            model: "qwen2.5-coder:7b",
            durationMs: 1200,
            candidatesSent: 4,
          },
        },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.llm.backend).toBe("ollama");
  });
});

describe("layerActionableFindingCount", () => {
  it("counts excluded and filtered only", () => {
    const reports = [
      {
        source: "cli" as const,
        timestamp: "2026-08-18T00:00:00.000Z",
        repo: "demo",
        team: "alpha",
        provider: "generic" as const,
        findings: [
          {
            path: "a",
            reason: "oversized" as const,
            bytes: 100,
            estTokens: 25,
            action: "excluded" as const,
          },
          {
            path: "b",
            reason: "semantic_bloat" as const,
            bytes: 100,
            estTokens: 25,
            action: "kept" as const,
          },
        ],
        totals: { beforeTokens: 50, afterTokens: 25, savedTokens: 25 },
      },
    ];
    expect(layerActionableFindingCount(reports, "combined")).toBe(1);
  });
});
