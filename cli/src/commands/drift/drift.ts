import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
  instructionPathForProvider,
} from "@tokenforge/policy-adapters";
import { parseProviderId } from "../scan/scan";

export type PolicyDriftResult = {
  root: string;
  provider: string;
  instructionPath: string;
  status: "ok" | "missing_file" | "missing_section" | "empty_section";
  message: string;
};

/**
 * Local-first drift check: ensure the provider instruction file still contains
 * a non-empty TokenForge managed section (begin/end markers).
 */
export async function checkPolicyDrift(options: {
  root: string;
  provider?: string;
}): Promise<PolicyDriftResult> {
  const root = resolve(options.root);
  const provider = parseProviderId(options.provider ?? "copilot");
  const instructionPath = instructionPathForProvider(provider);
  const abs = resolve(root, instructionPath);

  let contents: string;
  try {
    contents = await readFile(abs, "utf8");
  } catch {
    return {
      root,
      provider,
      instructionPath,
      status: "missing_file",
      message: `Policy drift: ${instructionPath} is missing (expected managed TokenForge section).`,
    };
  }

  const beginIdx = contents.indexOf(TOKENFORGE_SECTION_BEGIN);
  const endIdx = contents.indexOf(TOKENFORGE_SECTION_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) {
    return {
      root,
      provider,
      instructionPath,
      status: "missing_section",
      message: `Policy drift: ${instructionPath} has no <!-- tokenforge:begin/end --> section.`,
    };
  }

  const body = contents
    .slice(beginIdx + TOKENFORGE_SECTION_BEGIN.length, endIdx)
    .trim();
  if (body.length === 0) {
    return {
      root,
      provider,
      instructionPath,
      status: "empty_section",
      message: `Policy drift: ${instructionPath} managed section is empty.`,
    };
  }

  return {
    root,
    provider,
    instructionPath,
    status: "ok",
    message: `OK: ${instructionPath} still has a TokenForge managed section (${body.length} chars).`,
  };
}
