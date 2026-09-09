import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  buildScopedReasoningRules,
  type DirectoryRoleAssignment,
  type ProviderId,
  type ReasoningPackMode,
  type ScopedReasoningRule,
} from "@tokenforge/risk-core";
import {
  CURSOR_RULES_DIR,
  isCursorScopedRulePath,
} from "@tokenforge/policy-adapters";

/**
 * Providers that can attach a rule to a glob.
 *
 * Only Cursor loads a rule conditionally today, which is what makes
 * per-directory guidance free everywhere else in the repo. Every other provider
 * has a single always-on file, so its routing table has to live inside the
 * managed section instead.
 */
const SCOPED_REASONING_PROVIDERS: ReadonlySet<ProviderId> = new Set<ProviderId>([
  "cursor",
]);

export function supportsScopedReasoningRules(provider: ProviderId): boolean {
  return SCOPED_REASONING_PROVIDERS.has(provider);
}

/**
 * Role clusters to write as scoped rule files, or none for this provider.
 *
 * Returning `[]` for a non-scoping provider is what keeps the routing from
 * appearing twice: the caller renders the table into the managed section
 * precisely when this is empty.
 */
export function scopedReasoningRulesFor(options: {
  provider: ProviderId;
  reasoningPack: ReasoningPackMode;
  directoryRoles?: readonly DirectoryRoleAssignment[];
}): ScopedReasoningRule[] {
  if (!supportsScopedReasoningRules(options.provider)) {
    return [];
  }
  return buildScopedReasoningRules({
    directoryRoles: options.directoryRoles,
    mode: options.reasoningPack,
  });
}

/**
 * Scoped rule files a previous run wrote that this run no longer would.
 *
 * A role that disappears from a repo - the `redux/` directory deleted, the
 * `pages/` tree migrated to `app/` - leaves its rule file behind, and a rule
 * describing a directory that no longer exists is advice the agent will follow
 * anyway. Nothing else notices, because a stale reasoning rule produces no
 * error: the file simply stops matching anything and keeps giving guidance.
 *
 * Only files carrying this tool's own prefix are eligible, so a hand-written
 * `.cursor/rules/house-style.mdc` is never touched.
 */
export async function staleScopedRulePaths(
  root: string,
  keptPaths: readonly string[],
): Promise<string[]> {
  const keep = new Set(keptPaths.map((path) => path.replaceAll("\\", "/")));
  let entries: string[];
  try {
    entries = await readdir(join(root, CURSOR_RULES_DIR));
  } catch {
    return [];
  }
  return entries
    .map((name) => `${CURSOR_RULES_DIR}/${name}`)
    .filter((path) => isCursorScopedRulePath(path) && !keep.has(path))
    .sort();
}

/** Delete the given repo-relative paths, ignoring ones already gone. */
export async function removeScopedRuleFiles(
  root: string,
  paths: readonly string[],
): Promise<void> {
  for (const path of paths) {
    await rm(join(root, path), { force: true });
  }
}
