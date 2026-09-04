import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
  instructionPathForProvider,
} from "@tokenforge/policy-adapters";
import { applySectionHashPath } from "../../io/paths";
import { parseProviderId } from "../scan/scan";

export type PolicyDriftStatus =
  | "ok"
  | "missing_file"
  | "missing_section"
  | "empty_section"
  | "hash_mismatch";

export type PolicyDriftResult = {
  root: string;
  provider: string;
  instructionPath: string;
  status: PolicyDriftStatus;
  message: string;
  /** Present when a last-apply hash artifact exists on disk. */
  expectedHash?: string;
  actualHash?: string;
};

type ApplySectionHashArtifact = {
  provider?: string;
  instructionPath?: string;
  sha256?: string;
};

function hashManagedBody(body: string): string {
  return createHash("sha256").update(body.trim()).digest("hex");
}

function extractManagedBody(contents: string): string | null {
  const beginIdx = contents.indexOf(TOKENFORGE_SECTION_BEGIN);
  const endIdx = contents.indexOf(TOKENFORGE_SECTION_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) {
    return null;
  }
  return contents.slice(beginIdx + TOKENFORGE_SECTION_BEGIN.length, endIdx).trim();
}

async function readApplySectionHash(
  root: string,
): Promise<ApplySectionHashArtifact | null> {
  try {
    const raw = JSON.parse(
      await readFile(applySectionHashPath(root), "utf8"),
    ) as ApplySectionHashArtifact;
    return raw;
  } catch {
    return null;
  }
}

/**
 * Local-first drift check: ensure the provider instruction file still contains
 * a non-empty TokenForge managed section (begin/end markers), and when
 * `.tokenforge/apply-section-hash.json` exists, that the section body hash matches.
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

  const body = extractManagedBody(contents);
  if (body === null) {
    return {
      root,
      provider,
      instructionPath,
      status: "missing_section",
      message: `Policy drift: ${instructionPath} has no <!-- tokenforge:begin/end --> section.`,
    };
  }

  if (body.length === 0) {
    return {
      root,
      provider,
      instructionPath,
      status: "empty_section",
      message: `Policy drift: ${instructionPath} managed section is empty.`,
    };
  }

  const artifact = await readApplySectionHash(root);
  if (
    artifact?.sha256 &&
    artifact.instructionPath === instructionPath &&
    (artifact.provider === undefined || artifact.provider === provider)
  ) {
    const actualHash = hashManagedBody(body);
    if (actualHash !== artifact.sha256) {
      return {
        root,
        provider,
        instructionPath,
        status: "hash_mismatch",
        message:
          `Policy drift: ${instructionPath} managed section body changed since last apply ` +
          `(hash ${actualHash.slice(0, 12)}… ≠ ${artifact.sha256.slice(0, 12)}…).`,
        expectedHash: artifact.sha256,
        actualHash,
      };
    }
  }

  return {
    root,
    provider,
    instructionPath,
    status: "ok",
    message: `OK: ${instructionPath} still has a TokenForge managed section (${body.length} chars).`,
  };
}
