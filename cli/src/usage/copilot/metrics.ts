import { RuntimeError } from "../../app/errors";
import type { GitHubClient } from "../github/client";
import { readJsonResponse } from "../github/client";
import type { CopilotUserDayRow, CopilotUserTeamDayRow } from "./aggregate";

type ReportLinksResponse = {
  download_links?: string[];
  report_day?: string;
};

export type OrgCopilotMetrics = {
  users: CopilotUserDayRow[];
  userTeams: CopilotUserTeamDayRow[];
};

/** Download and parse NDJSON Copilot metrics report files. */
export async function downloadCopilotNdjson<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.text();
    throw new RuntimeError(
      `Copilot metrics download failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }
  const text = await response.text();
  const rows: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    rows.push(JSON.parse(trimmed) as T);
  }
  return rows;
}

async function fetchReportLinks(
  client: GitHubClient,
  org: string,
  report: "users-1-day" | "user-teams-1-day",
  day: string,
): Promise<string[]> {
  const url = new URL(
    `${client.apiBase}/orgs/${encodeURIComponent(org)}/copilot/metrics/reports/${report}`,
  );
  url.searchParams.set("day", day);
  const response = await client.fetch(url.toString());
  if (response.status === 204) {
    return [];
  }
  const payload = await readJsonResponse<ReportLinksResponse>(
    response,
    `Copilot ${report} for ${org} ${day}`,
  );
  return payload.download_links ?? [];
}

async function fetchReportRows<T>(
  client: GitHubClient,
  org: string,
  report: "users-1-day" | "user-teams-1-day",
  day: string,
): Promise<T[]> {
  const links = await fetchReportLinks(client, org, report, day);
  if (links.length === 0) {
    return [];
  }
  const chunks = await Promise.all(links.map((link) => downloadCopilotNdjson<T>(link)));
  return chunks.flat();
}

/** Aggregate daily org Copilot user + user-team reports across a billing month. */
export async function fetchOrgCopilotMetricsForDays(
  client: GitHubClient,
  org: string,
  days: string[],
): Promise<OrgCopilotMetrics> {
  const users: CopilotUserDayRow[] = [];
  const userTeams: CopilotUserTeamDayRow[] = [];

  for (const day of days) {
    const [dayUsers, dayTeams] = await Promise.all([
      fetchReportRows<CopilotUserDayRow>(client, org, "users-1-day", day),
      fetchReportRows<CopilotUserTeamDayRow>(client, org, "user-teams-1-day", day),
    ]);
    users.push(...dayUsers);
    userTeams.push(...dayTeams);
  }

  return { users, userTeams };
}
