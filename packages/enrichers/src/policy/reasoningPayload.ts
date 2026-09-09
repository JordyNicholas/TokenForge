import {
  REASONING_BREADTH,
  REASONING_SECTION_HEADING,
  buildReasoningSection,
  isRenderablePersonaLine,
  isRenderableRoleRule,
  type DirectoryRoleAssignment,
  type ReasoningPackMode,
  type ReasoningStrategy,
  type StackProfile,
} from "@tokenforge/risk-core";

/** One role rule as a model returned it. */
export type ReasoningRolePayload = {
  glob: string;
  rule: string;
  /**
   * Optional. Absent means the wording changed but the approach did not, which
   * is the common and desirable case.
   */
  strategy?: ReasoningStrategy;
};

export type ReasoningPayload = {
  persona?: string[];
  roles?: ReasoningRolePayload[];
};

/** Why a returned rule was not used, for the run log. */
export type ReasoningRejection = {
  glob: string;
  reason: "unknown_glob" | "unrenderable_rule" | "strategy_upgraded";
};

export type RefineReasoningResult = {
  /** Assignments with usable refinements applied; the rest keep their own text. */
  assignments: DirectoryRoleAssignment[];
  persona: string[];
  rejections: ReasoningRejection[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStrategy(value: unknown): value is ReasoningStrategy {
  return typeof value === "string" && value in REASONING_BREADTH;
}

/**
 * The `reasoning` block from a policy-synthesis response, or `undefined`.
 *
 * Shape only — whether an individual rule may be *used* is decided by
 * {@link refineReasoning}, which needs the heuristic assignments to compare
 * against.
 */
export function parsePolicyReasoningPayload(
  payload: unknown,
): ReasoningPayload | undefined {
  if (!isRecord(payload) || !isRecord(payload.reasoning)) {
    return undefined;
  }
  const reasoning = payload.reasoning;

  const persona = Array.isArray(reasoning.persona)
    ? reasoning.persona.filter((line): line is string => typeof line === "string")
    : undefined;

  const roles = Array.isArray(reasoning.roles)
    ? reasoning.roles
        .filter(isRecord)
        .filter(
          (role) => typeof role.glob === "string" && typeof role.rule === "string",
        )
        .map((role) => ({
          glob: role.glob as string,
          rule: (role.rule as string).trim(),
          strategy: isStrategy(role.strategy) ? role.strategy : undefined,
        }))
    : undefined;

  return persona === undefined && roles === undefined
    ? undefined
    : { persona, roles };
}

/**
 * Apply a model refinement to the heuristic assignments, rule by rule.
 *
 * Three gates, and a rule that fails any of them is dropped on its own rather
 * than discarding the whole refinement — a single bad line should cost the
 * sharpening of that line, nothing more:
 *
 * 1. **Unknown glob.** The model may only speak about directories the walk
 *    actually found. Inventing one would put guidance in front of the agent
 *    about a path nothing verified exists.
 * 2. **Unrenderable rule.** Same guard the deterministic rules pass — length,
 *    imperative phrasing, no strategy vocabulary — so a refinement cannot
 *    smuggle in the cargo cult the feature exists to avoid.
 * 3. **Upgraded strategy.** A model may narrow an approach (explore → linear)
 *    but never widen one. Widening is how a refinement would start inviting
 *    redesigns in directories the heuristic deliberately kept linear.
 */
export function refineReasoning(options: {
  assignments: readonly DirectoryRoleAssignment[];
  payload: ReasoningPayload | undefined;
}): RefineReasoningResult {
  const { assignments, payload } = options;
  const byGlob = new Map<string, DirectoryRoleAssignment>();
  for (const assignment of assignments) {
    for (const glob of assignment.globs) {
      byGlob.set(glob, assignment);
    }
  }

  const rejections: ReasoningRejection[] = [];
  const refinedByDir = new Map<string, { rule: string; strategy: ReasoningStrategy }>();

  for (const role of payload?.roles ?? []) {
    const target = byGlob.get(role.glob);
    if (!target) {
      rejections.push({ glob: role.glob, reason: "unknown_glob" });
      continue;
    }
    if (!isRenderableRoleRule(role.rule)) {
      rejections.push({ glob: role.glob, reason: "unrenderable_rule" });
      continue;
    }
    const strategy = role.strategy ?? target.strategy;
    if (REASONING_BREADTH[strategy] > REASONING_BREADTH[target.strategy]) {
      rejections.push({ glob: role.glob, reason: "strategy_upgraded" });
      continue;
    }
    refinedByDir.set(target.dir, { rule: role.rule, strategy });
  }

  const refined = assignments.map((assignment) => {
    const replacement = refinedByDir.get(assignment.dir);
    return replacement
      ? { ...assignment, rule: replacement.rule, strategy: replacement.strategy }
      : assignment;
  });

  const persona = (payload?.persona ?? [])
    .map((line) => line.trim())
    .filter(isRenderablePersonaLine);

  return { assignments: refined, persona, rejections };
}

/**
 * Replace the reasoning section of `markdown` with a deterministically rendered
 * one built from the refined parts.
 *
 * The model contributes judgement — is this directory really linear, what is
 * the state flow actually shaped like — while the byte budget, the row order,
 * the trim behaviour and the section heading stay here. Handing the model the
 * whole document and hoping it respects all four is how a lovely paragraph ends
 * up forty bytes over budget with a strategy label in it.
 */
export function spliceReasoningSection(
  markdown: string,
  section: string | undefined,
): string {
  const start = markdown.indexOf(REASONING_SECTION_HEADING);
  if (start === -1) {
    return section === undefined ? markdown : `${markdown.trimEnd()}\n\n${section}\n`;
  }

  const after = markdown.indexOf("\n## ", start + REASONING_SECTION_HEADING.length);
  const tail = after === -1 ? "" : markdown.slice(after + 1);
  const head = markdown.slice(0, start);

  if (section === undefined) {
    return `${head}${tail}`.trimEnd() + "\n";
  }
  return tail.length > 0
    ? `${head}${section}\n\n${tail}`
    : `${head}${section}\n`;
}

/** Render the refined section under the same rules the heuristic path uses. */
export function renderRefinedReasoningSection(options: {
  refinement: RefineReasoningResult;
  stackProfile?: StackProfile;
  mode: ReasoningPackMode;
  scopedTable?: boolean;
  existingInstructionTexts?: readonly string[];
}): string | undefined {
  return buildReasoningSection({
    stackProfile: options.stackProfile,
    directoryRoles: options.refinement.assignments,
    mode: options.mode,
    scopedTable: options.scopedTable,
    existingInstructionTexts: options.existingInstructionTexts,
    personaOverride: options.refinement.persona,
  });
}
