import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { mergeIgnoreSection } from "@tokenforge/context-adapters";
import {
  COPILOT_EXCLUSIONS_PATH,
  CURSOR_IGNORE_CANDIDATES_PATH,
} from "@tokenforge/policy-adapters";
import { RuntimeError } from "../../app/errors";
import { parseExclusionYaml } from "../../io/exclusion-file";
import { parseProviderId } from "../scan/scan";

const CURSOR_HARD_IGNORE = ".cursorignore";
const CURSOR_SOFT_IGNORE = ".cursorindexingignore";
const COPILOT_IGNORE = ".copilotignore";

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

  throw new RuntimeError(
    `promote-shield supports cursor and copilot only (got ${provider}).`,
  );
}

function targetIgnorePath(
  provider: ReturnType<typeof parseProviderId>,
  mode: "hard" | "soft",
): string {
  if (provider === "cursor") {
    return mode === "soft" ? CURSOR_SOFT_IGNORE : CURSOR_HARD_IGNORE;
  }
  return COPILOT_IGNORE;
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
