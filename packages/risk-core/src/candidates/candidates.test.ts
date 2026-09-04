import { describe, expect, it } from "vitest";
import type { RiskAssessment } from "../domain/types";
import {
  DEFAULT_BORDERLINE_CANDIDATE_COUNT,
  DEFAULT_MAX_ENRICHMENT_CANDIDATES,
  DEFAULT_REPEATED_CONFIG_COUNT,
} from "../domain/constants";
import { scoreRisk } from "../score/score";
import {
  isInstructionPath,
  orderedBucketAssessments,
  repeatedConfigBasenames,
  selectEnrichmentCandidates,
} from "./candidates";

function assessment(
  path: string,
  bytes: number,
  overrides: Partial<RiskAssessment> = {},
): RiskAssessment {
  return {
    path,
    bytes,
    estTokens: Math.ceil(bytes / 4),
    fileClass: "unknown",
    score: 0,
    atRisk: false,
    reasons: [],
    ...overrides,
  };
}

describe("selectEnrichmentCandidates", () => {
  it("prioritizes instruction paths", () => {
    const assessments = [
      assessment("src/index.ts", 500, { fileClass: "source" }),
      assessment("AGENTS.md", 9000, { fileClass: "unknown" }),
      assessment("package-lock.json", 900_000, {
        fileClass: "lockfile",
        atRisk: true,
        reasons: ["high_risk_filetype"],
      }),
    ];

    const selected = selectEnrichmentCandidates(assessments);
    expect(selected.map((item) => item.path)).toContain("AGENTS.md");
  });

  it("includes borderline config paths and caps duplicates", () => {
    const assessments = [
      assessment("config/app-settings.json", 8_192, { fileClass: "config" }),
      assessment("config/app-settings.json", 8_192, { fileClass: "config" }),
      assessment("README.md", 16_384, { fileClass: "unknown" }),
    ];

    const selected = selectEnrichmentCandidates(assessments, { maxCandidates: 2 });
    expect(selected).toHaveLength(2);
    expect(selected.filter((item) => item.path === "config/app-settings.json")).toHaveLength(1);
  });

  it("picks the top-N largest eligible files, excluding lockfile/generated classes", () => {
    const assessments = [
      assessment("src/big-a.ts", 9_000, { fileClass: "source" }),
      assessment("src/big-b.ts", 8_000, { fileClass: "source" }),
      assessment("src/big-c.ts", 7_000, { fileClass: "source" }),
      assessment("package-lock.json", 900_000, {
        fileClass: "lockfile",
        atRisk: true,
        reasons: ["high_risk_filetype"],
      }),
      assessment("dist/bundle.js", 500_000, {
        fileClass: "generated",
        atRisk: true,
        reasons: ["high_risk_filetype"],
      }),
    ];

    // sourceTopCount: 0 isolates this case to the topEligible bucket alone —
    // the source-fairness bucket (see below) is covered by its own tests.
    const selected = selectEnrichmentCandidates(assessments, { topCount: 2, sourceTopCount: 0 });

    expect(selected.map((item) => item.path)).toEqual(["src/big-a.ts", "src/big-b.ts"]);
    expect(selected.some((item) => item.fileClass === "lockfile")).toBe(false);
    expect(selected.some((item) => item.fileClass === "generated")).toBe(false);
  });

  it("orders the top bucket by bytes desc, then path asc on ties", () => {
    const assessments = [
      assessment("src/z.ts", 5_000, { fileClass: "source" }),
      assessment("src/a.ts", 5_000, { fileClass: "source" }),
      assessment("src/m.ts", 3_000, { fileClass: "source" }),
    ];

    const selected = selectEnrichmentCandidates(assessments, { topCount: 3 });

    expect(selected.map((item) => item.path)).toEqual(["src/a.ts", "src/z.ts", "src/m.ts"]);
  });

  it("caps the borderline bucket at borderlineCount, largest bytes first (B4)", () => {
    const borderlineConfigs = Array.from({ length: 40 }, (_, index) =>
      assessment(`config/file-${index}.json`, 10_000 - index, { fileClass: "config" }),
    );

    const ordered = orderedBucketAssessments(borderlineConfigs, {
      topCount: 0,
      sourceTopCount: 0,
      repeatedConfigCount: 0,
    });
    const borderlineSelected = ordered.filter((item) =>
      item.path.startsWith("config/file-"),
    );

    expect(borderlineSelected).toHaveLength(DEFAULT_BORDERLINE_CANDIDATE_COUNT);
    expect(borderlineSelected[0].path).toBe("config/file-0.json");
  });

  it("gives small source files a fair chance even when the repo is dominated by bigger files (B8)", () => {
    // Shaped like a real repo, not the tiny fixture: a handful of big
    // config/unknown docs that would otherwise fill every topEligible slot,
    // plus a couple of small source utilities well under MIN_BORDERLINE_BYTES.
    const bigDocs = Array.from({ length: 12 }, (_, index) =>
      assessment(`docs/notes-${index}.md`, 20_000 - index, { fileClass: "unknown" }),
    );
    const smallSourceFiles = [
      assessment("src/validators/isValidEmail.js", 180, { fileClass: "source" }),
      assessment("src/utils/checkEmailFormat.js", 350, { fileClass: "source" }),
    ];

    const selected = selectEnrichmentCandidates([...bigDocs, ...smallSourceFiles]);
    const selectedPaths = selected.map((item) => item.path);

    expect(selectedPaths).toContain("src/validators/isValidEmail.js");
    expect(selectedPaths).toContain("src/utils/checkEmailFormat.js");
  });

  it("caps the source-fairness bucket at sourceTopCount, largest-first", () => {
    const sourceFiles = Array.from({ length: 8 }, (_, index) =>
      assessment(`src/util-${index}.js`, 1_000 - index * 10, { fileClass: "source" }),
    );

    const selected = selectEnrichmentCandidates(sourceFiles, {
      topCount: 0,
      sourceTopCount: 3,
    });

    expect(selected.map((item) => item.path)).toEqual([
      "src/util-0.js",
      "src/util-1.js",
      "src/util-2.js",
    ]);
  });

  it("dedupes a source file that also lands in the topEligible bucket", () => {
    const assessments = [
      assessment("src/big.js", 50_000, { fileClass: "source" }),
      assessment("src/small.js", 200, { fileClass: "source" }),
    ];

    const selected = selectEnrichmentCandidates(assessments, { topCount: 1, sourceTopCount: 2 });

    expect(selected.map((item) => item.path)).toEqual(["src/big.js", "src/small.js"]);
  });

  describe("repeated per-package configs (#136)", () => {
    const monorepo = [
      assessment("packages/a/tsconfig.json", 300, { fileClass: "config" }),
      assessment("packages/b/tsconfig.json", 310, { fileClass: "config" }),
      assessment("packages/c/tsconfig.json", 295, { fileClass: "config" }),
      assessment("src/index.ts", 400, { fileClass: "source" }),
    ];

    it("selects small per-package configs the size-based buckets cannot reach", () => {
      // 300 bytes is far under MIN_BORDERLINE_BYTES (4 KiB), and the top-files
      // bucket ranks by size — without its own bucket, none of these is ever
      // a candidate.
      const selected = selectEnrichmentCandidates(monorepo, {
        topCount: 0,
        sourceTopCount: 0,
      });

      expect(selected.map((item) => item.path)).toEqual([
        "packages/a/tsconfig.json",
        "packages/b/tsconfig.json",
        "packages/c/tsconfig.json",
      ]);
    });

    it("ignores a config name that appears only once", () => {
      const selected = selectEnrichmentCandidates(
        [assessment("packages/a/tsconfig.json", 300, { fileClass: "config" })],
        { topCount: 0, sourceTopCount: 0 },
      );

      expect(selected).toEqual([]);
    });

    it("ignores the same name repeated inside one directory listing", () => {
      // Two entries, one directory: nothing is duplicated across packages.
      const selected = selectEnrichmentCandidates(
        [
          assessment("packages/a/tsconfig.json", 300, { fileClass: "config" }),
          assessment("packages/a/tsconfig.json", 300, { fileClass: "config" }),
        ],
        { topCount: 0, sourceTopCount: 0 },
      );

      expect(selected).toEqual([]);
    });

    it("takes the largest group first and never leaves a lone unpairable copy", () => {
      const mixed = [
        ...monorepo,
        assessment("packages/a/.eslintrc.json", 120, { fileClass: "config" }),
        assessment("packages/b/.eslintrc.json", 130, { fileClass: "config" }),
      ];

      const selected = selectEnrichmentCandidates(mixed, {
        topCount: 0,
        sourceTopCount: 0,
        repeatedConfigCount: 4,
      });

      // 3 tsconfigs (largest group) + 1 slot left, which is refused because a
      // single .eslintrc.json has nothing to be compared against.
      expect(selected.map((item) => item.path)).toEqual([
        "packages/a/tsconfig.json",
        "packages/b/tsconfig.json",
        "packages/c/tsconfig.json",
      ]);
    });

    it("truncates a wide monorepo's package.json group instead of swamping the run", () => {
      const wide = Array.from({ length: 40 }, (_, index) =>
        assessment(
          `packages/p${String(index).padStart(2, "0")}/package.json`,
          200,
          { fileClass: "config" },
        ),
      );

      const selected = selectEnrichmentCandidates(wide, {
        topCount: 0,
        sourceTopCount: 0,
      });

      // Truncated, not dropped: comparing 8 of 40 still answers whether the
      // copies duplicate each other.
      expect(selected).toHaveLength(DEFAULT_REPEATED_CONFIG_COUNT);
      expect(selected[0].path).toBe("packages/p00/package.json");
    });

    it("never routes a credential-shaped config here either", () => {
      const withSecrets = [
        assessment("packages/a/credentials.json", 300, { fileClass: "config" }),
        assessment("packages/b/credentials.json", 300, { fileClass: "config" }),
      ];

      expect(
        selectEnrichmentCandidates(withSecrets, { topCount: 0, sourceTopCount: 0 }),
      ).toEqual([]);
    });
  });

  describe("repeatedConfigBasenames", () => {
    it("reports a basename only when it spans 2+ directories", () => {
      const repeated = repeatedConfigBasenames([
        "packages/a/tsconfig.json",
        "packages/b/tsconfig.json",
        "packages/a/only-here.json",
        "src/index.ts",
      ]);

      expect([...repeated]).toEqual(["tsconfig.json"]);
    });

    it("ignores non-config classes even when the name repeats", () => {
      const repeated = repeatedConfigBasenames([
        "packages/a/index.ts",
        "packages/b/index.ts",
      ]);

      expect(repeated.size).toBe(0);
    });
  });

  describe("secret gate (#135)", () => {
    it("never selects a credential-shaped path, even when it qualifies as borderline", () => {
      const assessments = [
        // Would otherwise sail through the borderline bucket: config class,
        // comfortably over MIN_BORDERLINE_BYTES, not atRisk.
        assessment("config/firebase-service-account.json", 8_192, {
          fileClass: "config",
        }),
        assessment(".env.production", 6_000, { fileClass: "config" }),
        assessment("config/app-settings.json", 8_192, { fileClass: "config" }),
      ];

      const selected = selectEnrichmentCandidates(assessments);

      expect(selected.map((item) => item.path)).toEqual([
        "config/app-settings.json",
      ]);
    });

    it("blocks a secret path from the top-files bucket too, not just borderline", () => {
      const assessments = [
        assessment("deploy/credentials.json", 900_000, { fileClass: "config" }),
        assessment("src/index.ts", 500, { fileClass: "source" }),
      ];

      const selected = selectEnrichmentCandidates(assessments, { topCount: 5 });

      expect(selected.some((item) => item.path === "deploy/credentials.json")).toBe(
        false,
      );
    });

    it("still selects a .env.example — a template carries no live credential", () => {
      const assessments = [
        assessment(".env.example", 6_000, { fileClass: "config" }),
      ];

      const selected = selectEnrichmentCandidates(assessments);

      expect(selected.map((item) => item.path)).toEqual([".env.example"]);
    });
  });

  it("dedupes a path that qualifies for multiple buckets, keeping instruction priority", () => {
    const assessments = [
      assessment("AGENTS.md", 50_000, { fileClass: "unknown" }),
      assessment("src/small.ts", 1_000, { fileClass: "source" }),
    ];

    const selected = selectEnrichmentCandidates(assessments, { topCount: 5 });

    expect(selected.filter((item) => item.path === "AGENTS.md")).toHaveLength(1);
    expect(selected[0].path).toBe("AGENTS.md");
  });
});

describe("isInstructionPath", () => {
  it("matches basename instruction files and agent rules directories", () => {
    expect(isInstructionPath("AGENTS.md")).toBe(true);
    expect(isInstructionPath(".cursor/rules/foo.md")).toBe(true);
    expect(isInstructionPath(".cursor/rules/sub/deep.mdc")).toBe(true);
    expect(isInstructionPath(".github/rules/copilot.md")).toBe(true);
    expect(isInstructionPath(".claude/rules/project.md")).toBe(true);
  });

  it("does not treat a bare rules/ business directory as instruction (B1)", () => {
    expect(isInstructionPath("fixtures/borderline-app/rules/pricing-notes.md")).toBe(
      false,
    );
    expect(isInstructionPath("rules/pricing-notes.md")).toBe(false);
    expect(isInstructionPath("src/app.ts")).toBe(false);
  });
});

describe("the enrichment candidate cap is a contract", () => {
  const many = (count: number): RiskAssessment[] =>
    Array.from({ length: count }, (_, index) =>
      scoreRisk({
        // Instruction paths, so every one lands in the first bucket and the cap
        // is the only thing that can stop the list growing.
        path: `packages/pkg-${index}/AGENTS.md`,
        bytes: 8_192,
        inactiveMs: 0,
      }),
    );

  it("caps a caller that passes no options at all", () => {
    // cli/src/commands/scan/scan.ts calls the selector with no second argument,
    // so this default is the only limit on the primary scan path.
    expect(selectEnrichmentCandidates(many(80))).toHaveLength(
      DEFAULT_MAX_ENRICHMENT_CANDIDATES,
    );
  });

  it("uses the shared constant, not a private literal", () => {
    // Guards the failure this replaced: risk-core capped at a bare 30 while
    // enrichers exported its own MAX_ENRICHMENT_CANDIDATES that nothing read,
    // so raising one silently changed nothing.
    expect(DEFAULT_MAX_ENRICHMENT_CANDIDATES).toBe(30);
    expect(selectEnrichmentCandidates(many(40), { maxCandidates: 7 })).toHaveLength(7);
  });

  it("bounds the Ollama batch count, which bounds its wall clock", () => {
    // OLLAMA_BATCH_SIZE is 2 and each batch has its own 900s timeout, so an
    // unbounded candidate set is a scan that never returns, not a costly one.
    const batches = Math.ceil(
      selectEnrichmentCandidates(many(500)).length / 2,
    );
    expect(batches).toBe(15);
  });
});
