import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
  TOKEN_RISK_REPORT_SCHEMA_ID,
  TOKEN_RISK_REPORT_SCHEMA_PATH,
} from "./constants";
import { isTokenRiskReport } from "./report";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

describe("Token Risk JSON schema", () => {
  const schema = readJson(TOKEN_RISK_REPORT_SCHEMA_PATH) as {
    $id: string;
  };
  const example = readJson("docs/schemas/examples/scan-report.v0.json");
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it("uses the published $id", () => {
    expect(schema.$id).toBe(TOKEN_RISK_REPORT_SCHEMA_ID);
  });

  it("accepts the v0 example report", () => {
    expect(validate(example)).toBe(true);
    expect(isTokenRiskReport(example)).toBe(true);
  });

  it("rejects a report missing totals", () => {
    const { totals: _totals, ...rest } = example as {
      totals: unknown;
    };
    expect(validate(rest)).toBe(false);
    expect(isTokenRiskReport(rest)).toBe(false);
  });
});
