import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
  TOKEN_RISK_REPORT_SCHEMA_ID,
  TOKEN_RISK_REPORT_SCHEMA_PATH,
  TOKEN_RISK_REPORT_SCHEMA_V0_ID,
  TOKEN_RISK_REPORT_SCHEMA_V0_PATH,
  TOKEN_RISK_REPORT_SCHEMA_V1_ID,
  TOKEN_RISK_REPORT_SCHEMA_V1_PATH,
  TOKEN_RISK_REPORT_SCHEMA_V2_ID,
  TOKEN_RISK_REPORT_SCHEMA_V2_PATH,
} from "../domain/constants";
import { isTokenRiskReport } from "./report";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

describe("Token Risk JSON schema", () => {
  const schema = readJson(TOKEN_RISK_REPORT_SCHEMA_PATH) as {
    $id: string;
  };
  const example = readJson("docs/schemas/examples/scan-report.v0.json");
  const v0Schema = readJson(TOKEN_RISK_REPORT_SCHEMA_V0_PATH) as { $id: string };
  const v1Schema = readJson(TOKEN_RISK_REPORT_SCHEMA_V1_PATH) as { $id: string };
  const v2Schema = readJson(TOKEN_RISK_REPORT_SCHEMA_V2_PATH) as { $id: string };
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  // Compiled once: Ajv caches by $id and throws on a duplicate compile.
  const validateV0 = ajv.compile(v0Schema);
  const validateV1 = ajv.compile(v1Schema);
  const validateV2 = ajv.compile(v2Schema);

  it("uses the published $id", () => {
    expect(schema.$id).toBe(TOKEN_RISK_REPORT_SCHEMA_ID);
  });

  it("accepts the v0 example report", () => {
    expect(validate(example)).toBe(true);
    expect(isTokenRiskReport(example)).toBe(true);
  });

  it("accepts the hybrid v0 example report", () => {
    const hybrid = readJson("docs/schemas/examples/scan-report.hybrid.v0.json");
    expect(validate(hybrid)).toBe(true);
    expect(isTokenRiskReport(hybrid)).toBe(true);
  });

  it("accepts Codex metadata and rejects the removed OpenAI HTTP backend", () => {
    const hybrid = readJson("docs/schemas/examples/scan-report.hybrid.v0.json") as {
      scan: { llm: Record<string, unknown> };
    };
    const codex = {
      ...hybrid,
      scan: {
        ...hybrid.scan,
        llm: { ...hybrid.scan.llm, backend: "codex", model: "default" },
      },
    };
    const openai = {
      ...codex,
      scan: {
        ...codex.scan,
        llm: { ...codex.scan.llm, backend: "openai" },
      },
    };

    expect(validate(codex)).toBe(true);
    expect(isTokenRiskReport(codex)).toBe(true);
    expect(validate(openai)).toBe(false);
    expect(isTokenRiskReport(openai)).toBe(false);
  });

  it("rejects suggestion snippets (deferred)", () => {
    const hybrid = readJson("docs/schemas/examples/scan-report.hybrid.v0.json") as {
      findings: Array<Record<string, unknown>>;
    };
    const withSnippet = {
      ...hybrid,
      findings: [
        {
          ...hybrid.findings[1],
          suggestion: {
            kind: "dedupe_rules",
            summary: "Drop duplicated bullets.",
            snippet: "--- a/AGENTS.md\n+++ b/AGENTS.md\n",
          },
        },
      ],
    };
    expect(validate(withSnippet)).toBe(false);
  });

  it("rejects an unknown suggestion kind", () => {
    const hybrid = readJson("docs/schemas/examples/scan-report.hybrid.v0.json") as {
      findings: Array<Record<string, unknown>>;
    };
    const invalid = {
      ...hybrid,
      findings: [
        {
          ...hybrid.findings[1],
          suggestion: { kind: "rewrite_architecture", summary: "Reshape the app." },
        },
      ],
    };
    expect(validate(invalid)).toBe(false);
    expect(isTokenRiskReport(invalid)).toBe(false);
  });

  it("keeps v2 a strict superset of the frozen v0 and v1 contracts", () => {
    expect(v0Schema.$id).toBe(TOKEN_RISK_REPORT_SCHEMA_V0_ID);
    expect(v1Schema.$id).toBe(TOKEN_RISK_REPORT_SCHEMA_V1_ID);

    const hybrid = readJson("docs/schemas/examples/scan-report.hybrid.v0.json");
    expect(validateV0(example)).toBe(true);
    expect(validateV1(example)).toBe(true);
    expect(validate(example)).toBe(true);
    expect(validateV0(hybrid)).toBe(true);
    expect(validateV1(hybrid)).toBe(true);
    expect(validate(hybrid)).toBe(true);
  });

  it("accepts duplicate_logic under v1+ (not frozen v0)", () => {
    const base = readJson("docs/schemas/examples/scan-report.hybrid.v0.json") as {
      findings: Array<Record<string, unknown>>;
    };
    const withDuplicateLogic = {
      ...base,
      findings: [
        {
          ...base.findings[1],
          path: "src/utils/checkEmailFormat.js",
          reason: "duplicate_logic",
          action: "kept",
          suggestion: {
            kind: "review",
            summary: "Consolidate with src/validators/isValidEmail.js.",
          },
        },
      ],
    };

    expect(validateV1(withDuplicateLogic)).toBe(true);
    expect(validate(withDuplicateLogic)).toBe(true);
    expect(isTokenRiskReport(withDuplicateLogic)).toBe(true);
    expect(validateV0(withDuplicateLogic)).toBe(false);
  });

  it("accepts redundant_config under v3 only", () => {
    const base = readJson("docs/schemas/examples/scan-report.hybrid.v0.json") as {
      findings: Array<Record<string, unknown>>;
    };
    const withRedundantConfig = {
      ...base,
      findings: [
        {
          ...base.findings[1],
          path: "packages/b/tsconfig.json",
          reason: "redundant_config",
          action: "kept",
          suggestion: {
            kind: "dedupe_rules",
            summary: "Extend a shared base instead of repeating these settings.",
          },
        },
      ],
    };

    expect(validate(withRedundantConfig)).toBe(true);
    expect(isTokenRiskReport(withRedundantConfig)).toBe(true);
    // The frozen predecessors must reject it — that is what makes this a bump
    // rather than a silent widening of v2.
    expect(validateV2(withRedundantConfig)).toBe(false);
    expect(validateV1(withRedundantConfig)).toBe(false);
    expect(validateV0(withRedundantConfig)).toBe(false);
  });

  it("validates the published redundant_config example", () => {
    const example = readJson(
      "docs/schemas/examples/scan-report.hybrid.monorepo-config.json",
    );

    expect(validate(example)).toBe(true);
    expect(isTokenRiskReport(example)).toBe(true);
    // Advisory by construction: nothing is excluded, so nothing is saved.
    expect((example as { totals: { savedTokens: number } }).totals.savedTokens).toBe(0);
  });

  it("keeps every frozen predecessor valid under v3 (superset, not a break)", () => {
    const example = readJson("docs/schemas/examples/scan-report.v0.json");
    const hybrid = readJson("docs/schemas/examples/scan-report.hybrid.v0.json");
    expect(validateV2(example)).toBe(true);
    expect(validateV2(hybrid)).toBe(true);
    expect(v2Schema.$id).toBe(TOKEN_RISK_REPORT_SCHEMA_V2_ID);
  });

  it("accepts consolidate_duplicates under v2 only", () => {
    const base = readJson("docs/schemas/examples/scan-report.hybrid.v0.json") as {
      findings: Array<Record<string, unknown>>;
    };
    const withConsolidate = {
      ...base,
      findings: [
        {
          ...base.findings[1],
          path: "src/utils/checkEmailFormat.js",
          reason: "duplicate_logic",
          action: "kept",
          suggestion: {
            kind: "consolidate_duplicates",
            summary: "Consolidate with src/validators/isValidEmail.js.",
          },
        },
      ],
    };

    expect(validate(withConsolidate)).toBe(true);
    expect(isTokenRiskReport(withConsolidate)).toBe(true);
    expect(validateV1(withConsolidate)).toBe(false);
    expect(validateV0(withConsolidate)).toBe(false);
  });

  it("rejects a report missing totals", () => {
    const { totals: _totals, ...rest } = example as {
      totals: unknown;
    };
    expect(validate(rest)).toBe(false);
    expect(isTokenRiskReport(rest)).toBe(false);
  });
});
