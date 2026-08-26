import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isTokenRiskReport, selectEnrichmentCandidates } from "@tokenforge/risk-core";
import { hasSecretContent, type EnrichmentCandidate } from "../../enrichers";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupFixtureAt, heuristicEdgeAppRoot } from "../../test/helpers";
import { scanRepo } from "./scan";

afterEach(() => cleanupFixtureAt(heuristicEdgeAppRoot));

describe("scanRepo (heuristic-edge-app, #135 protection rules)", () => {
  it("does not recommend excluding paths the agent needs", async () => {
    const { report } = await scanRepo({
      root: heuristicEdgeAppRoot,
      now: new Date("2026-08-26T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    const flagged = report.findings.map((finding) => finding.path);

    // The whole point of the fixture: a 153 KB contract clears the flat
    // OVERSIZED_BYTES bar and is still not a finding.
    expect(flagged).not.toContain("openapi.json");
    expect(flagged).not.toContain("tsconfig.json");
    expect(flagged).not.toContain("src/generated/graphql/schema.json");
    expect(flagged).not.toContain("src/generated/graphql/types.ts");
    expect(flagged).not.toContain("src/index.ts");
  });

  it("still catches real waste, and now catches auxiliary bulk data under the flat bar", async () => {
    const { report } = await scanRepo({ root: heuristicEdgeAppRoot });

    expect(report.findings).toHaveLength(2);
    expect(report.findings.find((f) => f.path === "package-lock.json")).toMatchObject({
      reason: "high_risk_filetype",
      action: "excluded",
    });

    const auxiliary = report.findings.find(
      (finding) => finding.path === "test/fixtures/recorded-orders.json",
    );
    // 86 KB: under OVERSIZED_BYTES (100 KB), so the flat rule missed it.
    expect(auxiliary).toMatchObject({ reason: "oversized", action: "excluded" });
    expect(auxiliary!.bytes).toBeLessThan(100_000);
  });

  it("carries the protection kind on the assessment so a surface can explain the keep", async () => {
    const { assessments } = await scanRepo({ root: heuristicEdgeAppRoot });
    const byPath = new Map(assessments.map((item) => [item.path, item]));

    expect(byPath.get("openapi.json")).toMatchObject({
      protection: "api_contract",
      atRisk: false,
    });
    expect(byPath.get("tsconfig.json")?.protection).toBe("protected_config");
    expect(byPath.get("src/generated/graphql/schema.json")).toMatchObject({
      fileClass: "generated",
      protection: "necessary_generated",
      atRisk: false,
    });
  });

  describe("credential gates", () => {
    it("never selects the credential-shaped path as an LLM candidate (name gate)", async () => {
      const { assessments } = await scanRepo({ root: heuristicEdgeAppRoot });
      const candidates = selectEnrichmentCandidates(assessments, {
        // Deliberately generous: even with every bucket wide open, the gate
        // must hold.
        maxCandidates: 100,
        topCount: 100,
        sourceTopCount: 100,
      });

      expect(candidates.map((item) => item.path)).not.toContain(
        "config/service-account.json",
      );
    });

    it("rejects the innocuously named file the name gate cannot see (content gate)", async () => {
      // config/app-settings.json passes isSecretPath — nothing about the name
      // is credential-shaped. Only reading it reveals the key.
      const raw = await readFile(
        join(heuristicEdgeAppRoot, "config/app-settings.json"),
        "utf8",
      );

      expect(hasSecretContent(raw)).toBe(true);
    });

    it("keeps ordinary candidates flowing — the gates are narrow, not a blanket block", async () => {
      const { assessments } = await scanRepo({ root: heuristicEdgeAppRoot });
      const candidates: EnrichmentCandidate[] = selectEnrichmentCandidates(
        assessments,
      ).map((item) => ({
        path: item.path,
        bytes: item.bytes,
        estTokens: item.estTokens,
        excerpt: "",
      }));

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.map((item) => item.path)).toContain("openapi.json");
    });
  });
});
