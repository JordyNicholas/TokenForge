import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { isTokenRiskReport, type TokenRiskReport } from "@tokenforge/risk-core";
import { RuntimeError } from "../app/errors";

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

/** Write the Token Risk document to `.tokenforge/scan-report.json`. */
export async function writeScanReport(
  reportPath: string,
  report: TokenRiskReport,
): Promise<void> {
  try {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot write ${reportPath}: ${reason}`);
  }
}

export async function readScanReport(reportPath: string): Promise<TokenRiskReport> {
  const report = await tryReadScanReport(reportPath);
  if (!report) {
    throw new RuntimeError(`Cannot read ${reportPath}: file not found.`);
  }
  return report;
}

export async function tryReadScanReport(
  reportPath: string,
): Promise<TokenRiskReport | undefined> {
  let raw: string;
  try {
    raw = await readFile(reportPath, "utf8");
  } catch (error) {
    if (isEnoent(error)) {
      return undefined;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot read ${reportPath}: ${reason}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new RuntimeError(`${reportPath} is not valid JSON.`);
  }

  if (!isTokenRiskReport(parsed)) {
    throw new RuntimeError(`${reportPath} is not a v0 Token Risk report.`);
  }
  return parsed;
}

