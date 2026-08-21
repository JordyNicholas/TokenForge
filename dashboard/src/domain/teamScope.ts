import type { ScanLayerId } from "@tokenforge/risk-core";

const BOARD_PATH_RE = /^\/board\/(combined|heuristic|llm)(?:\/|$)/;
const TEAM_PATH_RE =
  /^\/board\/(?:combined|heuristic|llm)\/team\/([^/]+)(?:\/|$)/;

function layerFromMatch(value: string | undefined): ScanLayerId {
  if (value === "combined" || value === "heuristic" || value === "llm") {
    return value;
  }
  return "combined";
}

/** Active scan board from pathname (works outside matched routes). */
export function parseBoardLayerFromPath(pathname: string): ScanLayerId {
  const match = pathname.match(BOARD_PATH_RE);
  return layerFromMatch(match?.[1]);
}

/** Team scope from `/board/:layer/team/:teamId/...`, or null for global BU. */
export function parseTeamIdFromPath(pathname: string): string | null {
  const match = pathname.match(TEAM_PATH_RE);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Path after `/board/:layer` — either `""`, view segments (`/heatmap`),
 * or team-scoped (`/team/:id/...`). Used when switching scan boards.
 */
export function boardSubpath(pathname: string): string {
  const match = pathname.match(/^\/board\/(?:combined|heuristic|llm)(\/.*)?$/);
  const rest = match?.[1];
  return rest && rest.length > 0 ? rest : "";
}

/** Base path for Overview / nav within the current layer + optional team. */
export function boardScopeBase(layer: ScanLayerId, teamId: string | null): string {
  if (teamId) {
    return `/board/${layer}/team/${encodeURIComponent(teamId)}`;
  }
  return `/board/${layer}`;
}

/** View segment (`""` | `/heatmap` | `/findings` | `/assumptions`) for the current page. */
export function boardViewSuffix(pathname: string): string {
  const sub = boardSubpath(pathname);
  if (sub.startsWith("/team/")) {
    const afterTeam = sub.replace(/^\/team\/[^/]+/, "");
    return afterTeam || "";
  }
  return sub;
}
