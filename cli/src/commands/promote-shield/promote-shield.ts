import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  mergeIgnoreSection,
  upsertSessionShieldEntry,
} from "@tokenforge/context-adapters";
import {
  CLAUDE_EXCLUSIONS_PATH,
  COPILOT_EXCLUSIONS_PATH,
  CURSOR_IGNORE_CANDIDATES_PATH,
  GEMINI_EXCLUSIONS_PATH,
} from "@tokenforge/policy-adapters";
import { RuntimeError } from "../../app/errors";
import { parseExclusionYaml } from "../../io/exclusion-file";
import { parseProviderId } from "../scan/scan";

const CURSOR_HARD_IGNORE = ".cursorignore";
const CURSOR_SOFT_IGNORE = ".cursorindexingignore";
const COPILOT_IGNORE = ".copilotignore";
const GEMINI_IGNORE = ".geminiignore";

export type PromoteShieldOptions = {
  root: string;
  provider?: string;
  dryRun?: boolean;
  /** Cursor only: hard → `.cursorignore`, soft → `.cursorindexingignore`. */
  mode?: "hard" | "soft";
};

export type PromoteShieldResult = {
  root: string;
  provider: string;
  candidatesPath: string;
  targetPath: string;
  patterns: string[];
  dryRun: boolean;
  promoted: boolean;
  message: string;
};

async function readUtf8OrEmpty(root: string, rel: string): Promise<string> {
  try {
    return await readFile(join(root, rel), "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return "";
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot read ${rel}: ${reason}`);
  }
}

function parseIgnoreCandidatePatterns(contents: string): string[] {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

async function resolveCandidatePatterns(
  root: string,
  provider: ReturnType<typeof parseProviderId>,
): Promise<{ candidatesPath: string; patterns: string[] }> {
  if (provider === "cursor") {
    const candidatesPath = CURSOR_IGNORE_CANDIDATES_PATH;
    const raw = await readUtf8OrEmpty(root, candidatesPath);
    if (raw.trim().length === 0) {
      throw new RuntimeError(
        `No cursor ignore candidates at ${candidatesPath}. Run tokenforge apply --provider cursor first.`,
      );
    }
    const patterns = parseIgnoreCandidatePatterns(raw);
    if (patterns.length === 0) {
      throw new RuntimeError(
        `${candidatesPath} has no mergeable patterns (comments only).`,
      );
    }
    return { candidatesPath, patterns };
  }

  if (provider === "copilot") {
    const candidatesPath = COPILOT_EXCLUSIONS_PATH;
    const raw = await readUtf8OrEmpty(root, candidatesPath);
    if (raw.trim().length === 0) {
      throw new RuntimeError(
        `No copilot exclusion candidates at ${candidatesPath}. Run tokenforge apply --provider copilot first.`,
      );
    }
    const patterns = parseExclusionYaml(raw);
    if (patterns.length === 0) {
      throw new RuntimeError(`${candidatesPath} has no paths: entries to promote.`);
    }
    return { candidatesPath, patterns };
  }

  if (provider === "gemini") {
    const candidatesPath = GEMINI_EXCLUSIONS_PATH;
    const raw = await readUtf8OrEmpty(root, candidatesPath);
    if (raw.trim().length === 0) {
      throw new RuntimeError(
        `No gemini exclusion candidates at ${candidatesPath}. Run tokenforge apply --provider gemini first.`,
      );
    }
    const patterns = parseExclusionYaml(raw);
    if (patterns.length === 0) {
      throw new RuntimeError(`${candidatesPath} has no paths: entries to promote.`);
    }
    return { candidatesPath, patterns };
  }

  if (provider === "claude") {
    const candidatesPath = CLAUDE_EXCLUSIONS_PATH;
    const raw = await readUtf8OrEmpty(root, candidatesPath);
    if (raw.trim().length === 0) {
      throw new RuntimeError(
        `No claude exclusion candidates at ${candidatesPath}. Run tokenforge apply --provider claude first.`,
      );
    }
    const patterns = parseExclusionYaml(raw);
    if (patterns.length === 0) {
      throw new RuntimeError(`${candidatesPath} has no paths: entries to promote.`);
    }
    return { candidatesPath, patterns };
  }

  throw new RuntimeError(
    `promote-shield supports cursor, copilot, gemini, and claude (got ${provider}).`,
  );
}

function targetIgnorePath(
  provider: ReturnType<typeof parseProviderId>,
  mode: "hard" | "soft",
): string {
  if (provider === "cursor") {
    return mode === "soft" ? CURSOR_SOFT_IGNORE : CURSOR_HARD_IGNORE;
  }
  if (provider === "gemini") {
    return GEMINI_IGNORE;
  }
  if (provider === "claude") {
    return ".tokenforge/session-shield.json";
  }
  return COPILOT_IGNORE;
}

async function promoteClaudeAdvisory(
  root: string,
  patterns: readonly string[],
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    return;
  }
  const shieldedAt = new Date().toISOString();
  for (const pattern of patterns) {
    await upsertSessionShieldEntry(root, {
      path: pattern,
      mode: "soft",
      provider: "claude",
      shieldedAt,
    });
  }
}

/**
 * Explicitly merge apply-generated ignore candidates into provider ignore files.
 * Never silent — callers must print the result.
 */
export async function promoteShieldCandidates(
  options: PromoteShieldOptions,
): Promise<PromoteShieldResult> {
  const root = resolve(options.root);
  const provider = parseProviderId(options.provider ?? "cursor");
  const dryRun = Boolean(options.dryRun);
  const mode = options.mode ?? "hard";
  const { candidatesPath, patterns } = await resolveCandidatePatterns(root, provider);
  const targetPath = targetIgnorePath(provider, mode);

  if (provider === "claude") {
    await promoteClaudeAdvisory(root, patterns, dryRun);
    const verb = dryRun ? "would promote" : "promoted";
    return {
      root,
      provider,
      candidatesPath,
      targetPath,
      patterns,
      dryRun,
      promoted: !dryRun,
      message:
        `${verb} ${patterns.length} pattern(s) from ${candidatesPath} → ${targetPath} ` +
        "(advisory — Claude has no verified ignore file)" +
        (dryRun ? " (dry-run)" : ""),
    };
  }

  const existing = await readUtf8OrEmpty(root, targetPath);
  const merged = mergeIgnoreSection(existing, patterns);

  if (!dryRun) {
    await writeFile(join(root, targetPath), merged, "utf8");
  }

  const verb = dryRun ? "would promote" : "promoted";
  return {
    root,
    provider,
    candidatesPath,
    targetPath,
    patterns,
    dryRun,
    promoted: !dryRun,
    message:
      `${verb} ${patterns.length} pattern(s) from ${candidatesPath} → ${targetPath}` +
      (dryRun ? " (dry-run)" : ""),
  };
}
