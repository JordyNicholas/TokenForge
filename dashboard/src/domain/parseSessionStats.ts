import {
  isSessionStatsReport,
  type SessionStatsReport,
} from "@tokenforge/risk-core";

export function parseSessionStatsJson(raw: string): SessionStatsReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Session stats file is not valid JSON.");
  }
  if (!isSessionStatsReport(parsed)) {
    throw new Error(
      "JSON is not a TokenForge session-stats report (source=extension, sessionAvoidedTokens, sessionHistory).",
    );
  }
  return parsed;
}

export async function parseSessionStatsFile(file: File): Promise<SessionStatsReport> {
  const text = await file.text();
  return parseSessionStatsJson(text);
}
