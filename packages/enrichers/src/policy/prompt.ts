import type { TokenRiskReport } from "@tokenforge/risk-core";
import { ENRICHMENT_POLICY_RULES } from "../structured";

export type PolicySynthesisPromptInput = {
  report: TokenRiskReport;
  title: string;
  maxBytes: number;
  instructionContents: ReadonlyMap<string, string>;
};

function formatFindings(report: TokenRiskReport): string {
  return report.findings
    .slice(0, 60)
    .map((finding) => {
      const suggestion = finding.suggestion?.summary
        ? ` suggestion="${finding.suggestion.summary}"`
        : "";
      return `- \`${finding.path}\`: reason=${finding.reason}, action=${finding.action}, estTokens=${finding.estTokens}${suggestion}`;
    })
    .join("\n");
}

function formatInstructionBodies(
  instructionContents: ReadonlyMap<string, string>,
  maxCharsPerFile = 4_000,
): string {
  const blocks: string[] = [];
  for (const [path, content] of instructionContents) {
    const excerpt =
      content.length > maxCharsPerFile
        ? `${content.slice(0, maxCharsPerFile)}\n…(truncated)`
        : content;
    blocks.push(
      [`### ${path}`, "```", excerpt, "```"].join("\n"),
    );
  }
  return blocks.length > 0 ? blocks.join("\n\n") : "(no instruction bodies loaded)";
}

/** Prompt for hybrid Fix — compile scan JSON into agent-facing policy markdown. */
export function buildPolicySynthesisPrompt(
  input: PolicySynthesisPromptInput,
): string {
  const budget = input.report.instructionBudget;
  const stackLine = budget
    ? `Always-on instruction stack: ~${budget.alwaysOnTokens} est. tokens (recommended ≤ ${budget.recommendedMax}).`
    : "Instruction stack budget not recorded.";

  return [
    "You compile a TokenForge provider policy pack section for AI coding agents.",
    "Primary goal: reduce billable token bleed with complete, readable, actionable rules.",
    "Write for the agent that reads this every turn — not homework for humans editing repo files.",
    "",
    "Return JSON only:",
    '{"markdown":"# Title\\n\\n…complete markdown body…"}',
    "",
    "Rules:",
    `- Title line MUST be exactly: # ${input.title}`,
    `- Stay within ${input.maxBytes} UTF-8 bytes for the full markdown string.`,
    "- Include sections when relevant: brief intro, Do not load (concrete paths/globs), Instruction guidance (dedupe/trim rules the agent can follow), Prefer, Compact tool output (when CI/test/build noise exists).",
    "- Use complete sentences — do not truncate mid-thought.",
    "- Tone: clear and neutral; avoid harsh NEVER/ALWAYS unless safety-critical.",
    "- Do not suggest excluding application source, load-bearing configs, or docs needed to work correctly.",
    "- Do not propose architecture refactors or code patches.",
    ...ENRICHMENT_POLICY_RULES.map((rule) => `- ${rule}`),
    "",
    stackLine,
    "",
    "Scan findings:",
    formatFindings(input.report),
    "",
    "Instruction file bodies (for overlap / canonical guidance):",
    formatInstructionBodies(input.instructionContents),
  ].join("\n");
}

export function parsePolicyMarkdownPayload(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  const markdown = (payload as { markdown?: unknown }).markdown;
  if (typeof markdown !== "string" || markdown.trim().length === 0) {
    return undefined;
  }
  return markdown.trim();
}
