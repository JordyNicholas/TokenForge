import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  CLAUDE_EXCLUSIONS_PATH,
  CURSOR_IGNORE_CANDIDATES_PATH,
  COPILOT_EXCLUSIONS_PATH,
  GEMINI_EXCLUSIONS_PATH,
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
  instructionPathForProvider,
} from "@tokenforge/policy-adapters";
import { TOKENFORGE_IGNORE_BEGIN } from "@tokenforge/context-adapters";
import type { ProviderId } from "@tokenforge/risk-core";

export type ScanHealth = "ok" | "stale" | "missing";
export type SessionHealth = "sent" | "unsent";
export type DriftHealth = "unknown" | "ok" | "dirty";
export type PromoteHealth = "pending" | "done" | "n/a";

export type DailyHealthChip = {
  label: string;
  status: ScanHealth | SessionHealth | DriftHealth | PromoteHealth;
  detail: string;
};

export type DailyHealthModel = {
  scan: DailyHealthChip;
  session: DailyHealthChip;
  drift: DailyHealthChip;
  promote: DailyHealthChip;
};

const STALE_MS = 24 * 60 * 60 * 1000;

async function readUtf8OrNull(root: string, rel: string): Promise<string | null> {
  try {
    return await readFile(join(root, rel), "utf8");
  } catch {
    return null;
  }
}

async function fileMtimeMs(root: string, rel: string): Promise<number | null> {
  try {
    const info = await stat(join(root, rel));
    return info.mtimeMs;
  } catch {
    return null;
  }
}

function hashManagedBody(body: string): string {
  return createHash("sha256").update(body.trim()).digest("hex");
}

function extractManagedBody(contents: string): string | null {
  const beginIdx = contents.indexOf(TOKENFORGE_SECTION_BEGIN);
  const endIdx = contents.indexOf(TOKENFORGE_SECTION_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) {
    return null;
  }
  return contents
    .slice(beginIdx + TOKENFORGE_SECTION_BEGIN.length, endIdx)
    .trim();
}

function parseIgnoreCandidatePatterns(contents: string): string[] {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function parseYamlPathLines(contents: string): string[] {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0);
}

function promoteTargetForProvider(provider: ProviderId): {
  candidatesPath: string;
  targetPath: string;
  parsePatterns: (raw: string) => string[];
} | null {
  if (provider === "cursor") {
    return {
      candidatesPath: CURSOR_IGNORE_CANDIDATES_PATH,
      targetPath: ".cursorignore",
      parsePatterns: parseIgnoreCandidatePatterns,
    };
  }
  if (provider === "copilot") {
    return {
      candidatesPath: COPILOT_EXCLUSIONS_PATH,
      targetPath: ".copilotignore",
      parsePatterns: parseYamlPathLines,
    };
  }
  if (provider === "gemini") {
    return {
      candidatesPath: GEMINI_EXCLUSIONS_PATH,
      targetPath: ".geminiignore",
      parsePatterns: parseYamlPathLines,
    };
  }
  if (provider === "claude") {
    return {
      candidatesPath: CLAUDE_EXCLUSIONS_PATH,
      targetPath: ".tokenforge/session-shield.json",
      parsePatterns: parseYamlPathLines,
    };
  }
  return null;
}

/** Lightweight Fix/Prove health signals for the Overview strip. */
export async function buildDailyHealth(
  root: string,
  provider: ProviderId,
  nowMs = Date.now(),
): Promise<DailyHealthModel> {
  const lastScanMtime = await fileMtimeMs(root, ".tokenforge/last-scan.json");
  const scanReportMtime = await fileMtimeMs(root, ".tokenforge/scan-report.json");
  const scanMtime = lastScanMtime ?? scanReportMtime;

  let scan: DailyHealthChip;
  if (scanMtime === null) {
    scan = {
      label: "Scan",
      status: "missing",
      detail: "No last-scan.json — export or run CLI scan",
    };
  } else if (nowMs - scanMtime > STALE_MS) {
    scan = {
      label: "Scan",
      status: "stale",
      detail: "Scan artifact older than 24h",
    };
  } else {
    scan = {
      label: "Scan",
      status: "ok",
      detail: "Recent scan artifact on disk",
    };
  }

  const sessionExists = (await fileMtimeMs(root, ".tokenforge/session-stats.json")) !== null;
  const session: DailyHealthChip = sessionExists
    ? {
        label: "Session",
        status: "sent",
        detail: "session-stats.json present",
      }
    : {
        label: "Session",
        status: "unsent",
        detail: "Export session-stats for Prove handoff",
      };

  const instructionPath = instructionPathForProvider(provider);
  const instructionContents = await readUtf8OrNull(root, instructionPath);
  const hashArtifactRaw = await readUtf8OrNull(root, ".tokenforge/apply-section-hash.json");

  let drift: DailyHealthChip;
  if (!instructionContents) {
    drift = {
      label: "Drift",
      status: "unknown",
      detail: `No ${instructionPath} — run tokenforge apply or drift`,
    };
  } else {
    const body = extractManagedBody(instructionContents);
    if (body === null || body.length === 0) {
      drift = {
        label: "Drift",
        status: "dirty",
        detail: "Managed instruction section missing or empty",
      };
    } else if (hashArtifactRaw) {
      try {
        const artifact = JSON.parse(hashArtifactRaw) as {
          sha256?: string;
          instructionPath?: string;
          provider?: string;
        };
        if (
          artifact.sha256 &&
          artifact.instructionPath === instructionPath &&
          (artifact.provider === undefined || artifact.provider === provider)
        ) {
          const actualHash = hashManagedBody(body);
          drift =
            actualHash !== artifact.sha256
              ? {
                  label: "Drift",
                  status: "dirty",
                  detail: "Instruction section hash mismatch — run tokenforge drift",
                }
              : {
                  label: "Drift",
                  status: "ok",
                  detail: "Managed section matches last apply hash",
                };
        } else {
          drift = {
            label: "Drift",
            status: "ok",
            detail: "Managed instruction section present",
          };
        }
      } catch {
        drift = {
          label: "Drift",
          status: "ok",
          detail: "Managed instruction section present",
        };
      }
    } else {
      drift = {
        label: "Drift",
        status: "ok",
        detail: "Managed instruction section present",
      };
    }
  }

  const promoteSpec = promoteTargetForProvider(provider);
  let promote: DailyHealthChip;
  if (!promoteSpec) {
    promote = {
      label: "Promote",
      status: "n/a",
      detail: "No ignore promote path for generic provider",
    };
  } else {
    const candidatesRaw = await readUtf8OrNull(root, promoteSpec.candidatesPath);
    const patterns =
      candidatesRaw !== null ? promoteSpec.parsePatterns(candidatesRaw) : [];
    if (patterns.length === 0) {
      promote = {
        label: "Promote",
        status: "done",
        detail: "No exclusion candidates to promote",
      };
    } else if (provider === "claude") {
      const shieldRaw = await readUtf8OrNull(root, promoteSpec.targetPath);
      promote =
        shieldRaw && shieldRaw.includes('"provider": "claude"')
          ? {
              label: "Promote",
              status: "done",
              detail: "Claude candidates recorded in session-shield",
            }
          : {
              label: "Promote",
              status: "pending",
              detail: "Run tokenforge promote-shield (advisory session-shield)",
            };
    } else {
      const targetRaw = await readUtf8OrNull(root, promoteSpec.targetPath);
      promote =
        targetRaw !== null && targetRaw.includes(TOKENFORGE_IGNORE_BEGIN)
          ? {
              label: "Promote",
              status: "done",
              detail: `${promoteSpec.targetPath} has TokenForge ignore section`,
            }
          : {
              label: "Promote",
              status: "pending",
              detail: `Candidates at ${promoteSpec.candidatesPath} — run promote-shield`,
            };
    }
  }

  return { scan, session, drift, promote };
}
