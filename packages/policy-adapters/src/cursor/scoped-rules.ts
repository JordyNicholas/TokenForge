import type { ScopedReasoningRule } from "@tokenforge/risk-core";
import type { PolicyFile } from "../types";

/** Directory Cursor loads rule files from. */
export const CURSOR_RULES_DIR = ".cursor/rules";

/** Prefix marking a rule file this tool owns, so a re-run can prune its own. */
export const CURSOR_SCOPED_RULE_PREFIX = "tokenforge-reasoning-";

/** Path for one role cluster. */
export function cursorScopedRulePath(role: string): string {
  return `${CURSOR_RULES_DIR}/${CURSOR_SCOPED_RULE_PREFIX}${role.replaceAll("_", "-")}.mdc`;
}

/** True for a rule file a previous reasoning-pack run wrote. */
export function isCursorScopedRulePath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  return (
    normalized.startsWith(`${CURSOR_RULES_DIR}/${CURSOR_SCOPED_RULE_PREFIX}`) &&
    normalized.endsWith(".mdc")
  );
}

/**
 * One glob-scoped Cursor rule file per role cluster.
 *
 * Cursor loads a rule only when a file matching `globs` is in context, so this
 * is the one provider where per-directory guidance costs nothing anywhere else.
 * `alwaysApply: false` is what makes that true - without it the rule would join
 * the always-on stack and the scoping would buy nothing.
 *
 * There is deliberately no generated-at timestamp. A timestamp would make every
 * apply produce a diff on a repo nobody touched, which is the same defect the
 * walk avoids by skipping the files apply itself writes.
 */
export function renderCursorScopedRules(
  rules: readonly ScopedReasoningRule[],
): PolicyFile[] {
  return rules.map((rule) => ({
    path: cursorScopedRulePath(rule.role),
    contents: [
      "---",
      `description: Reasoning approach for ${rule.description}`,
      `globs: ${rule.globs.join(", ")}`,
      "alwaysApply: false",
      "---",
      "",
      `<!-- Written by TokenForge. Derived from: ${rule.dirs.join(", ")} -->`,
      "",
      rule.rule,
      "",
    ].join("\n"),
  }));
}
