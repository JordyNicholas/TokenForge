import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  collectKeptContent,
  getAdapter,
  instructionPathForProvider,
  instructionTitleForProvider,
  mergeTokenForgeSection,
  type PolicyFile,
} from "@tokenforge/policy-adapters";
import {
  isTokenRiskReport,
  resolveScanLayers,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import {
  parseLlmSpec,
  synthesizeManagedPolicy,
} from "@tokenforge/enrichers";
import { window } from "vscode";
import { confirmExternalLlmSend, logLocalPreflight } from "../ai/transparencyCoach";
import { readLlmSettings, isExternalBackend } from "../enrich/settings";

export type CompactRulesPreview = {
  files: PolicyFile[];
  resolved: PolicyFile[];
  /** heuristic | hybrid — which synthesizer produced the managed body. */
  mode: "heuristic" | "hybrid";
  synthesisBackend: string;
};

async function readIfExists(root: string, rel: string): Promise<string | null> {
  try {
    return await readFile(join(root, rel), "utf8");
  } catch {
    return null;
  }
}

/**
 * Prefer an on-disk last-scan when it carries hybrid LLM layers the in-memory
 * session report lacks (Analyze rules → Compact rules handoff).
 */
export async function resolveCompactReport(
  root: string,
  sessionReport: TokenRiskReport,
): Promise<TokenRiskReport> {
  const diskPath = join(root, ".tokenforge", "last-scan.json");
  try {
    const raw = await readFile(diskPath, "utf8");
    const disk = JSON.parse(raw) as unknown;
    if (!isTokenRiskReport(disk)) {
      return sessionReport;
    }
    const sessionLlm = resolveScanLayers(sessionReport).llm.findings.length;
    const diskLlm = resolveScanLayers(disk).llm.findings.length;
    if (diskLlm > sessionLlm) {
      return { ...disk, provider: sessionReport.provider };
    }
  } catch {
    /* no disk report */
  }
  return sessionReport;
}

/** Dry-run Fix policy files from a scan report (no writes). */
export async function previewCompactRules(
  root: string,
  report: TokenRiskReport,
): Promise<CompactRulesPreview> {
  const settings = readLlmSettings();
  const spec = parseLlmSpec(settings.llm);
  const hybridWanted =
    settings.enrichmentEnabled &&
    spec.backend !== "noop";

  let externalDataConsent = settings.allowExternal;
  if (hybridWanted && isExternalBackend(spec.backend)) {
    const ok = await confirmExternalLlmSend({
      paths: [instructionPathForProvider(report.provider)],
      totalBytes: 0,
      backend: spec.backend,
      model: spec.model,
    });
    if (!ok) {
      throw new Error("Compact rules cancelled — external LLM consent not granted.");
    }
    externalDataConsent = true;
  } else if (hybridWanted) {
    logLocalPreflight({
      paths: [instructionPathForProvider(report.provider)],
      totalBytes: 0,
      backend: spec.backend,
      model: spec.model,
    });
  }

  const { keepDirs, sourceRoots } = await collectKeptContent(root, report);
  const applyMode = hybridWanted ? "hybrid" : "heuristic";
  const synthesis = await synthesizeManagedPolicy({
    root,
    report,
    title: instructionTitleForProvider(report.provider),
    applyMode,
    llm: settings.llm,
    llmEndpoint: settings.endpoint,
    llmTimeoutSeconds: settings.timeoutSeconds,
    keepDirs,
    sourceRoots,
    externalDataConsent,
  });

  const instructionPath = instructionPathForProvider(report.provider);
  const adapter = getAdapter(report.provider);
  const planned = adapter.render(report, {
    managedInstructionBodies: new Map([[instructionPath, synthesis.markdown]]),
    policyMaxBytes: synthesis.policyMaxBytes,
    keepDirs,
  });

  const resolved: PolicyFile[] = [];
  for (const file of planned) {
    if (file.writeMode === "merge-section") {
      const existing = await readIfExists(root, file.path);
      const merged = mergeTokenForgeSection(existing, file.contents);
      resolved.push({
        path: file.path,
        contents: merged.contents,
        writeMode: file.writeMode,
      });
    } else {
      resolved.push(file);
    }
  }

  return {
    files: planned,
    resolved,
    mode: synthesis.backend === "heuristic" ? "heuristic" : "hybrid",
    synthesisBackend: synthesis.backend,
  };
}

/** Apply compact rules policy pack to workspace (managed sections only). */
export async function applyCompactRules(
  root: string,
  preview: CompactRulesPreview,
): Promise<string[]> {
  const written: string[] = [];

  for (const file of preview.resolved) {
    const abs = join(root, file.path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, file.contents, "utf8");
    written.push(file.path);
  }

  return written;
}

export async function showCompactRulesPreviewMessage(
  preview: CompactRulesPreview,
): Promise<boolean> {
  const modeLabel =
    preview.mode === "hybrid"
      ? `AI hybrid (${preview.synthesisBackend})`
      : "Heuristic";
  const summary = preview.resolved
    .map((f) => `${f.path} (${f.contents.length} bytes)`)
    .join("\n");
  const choice = await window.showInformationMessage(
    `Compact rules (${modeLabel}) would update ${preview.resolved.length} file(s).`,
    { modal: true, detail: summary.slice(0, 2000) },
    "Apply",
    "Cancel",
  );
  return choice === "Apply";
}
