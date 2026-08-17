import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { RuntimeError } from "./errors";

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
