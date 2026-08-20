import { workspace } from "vscode";
import { applyAutoFilter } from "./autoFilter";
import type { RiskSession } from "../session/riskSession";

export function isAutoFilterEnabled(): boolean {
  return workspace.getConfiguration("tokenforge").get<boolean>("autoFilterHighRisk") === true;
}

export function runAutoFilter(session: RiskSession): number {
  return applyAutoFilter(session, isAutoFilterEnabled());
}
