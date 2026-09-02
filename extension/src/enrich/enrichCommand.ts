import { ProgressLocation, window } from "vscode";
import { parseLlmSpec } from "@tokenforge/enrichers";
import {
  confirmExternalLlmSend,
  logLocalPreflight,
} from "../ai/transparencyCoach";
import { revealLastScan } from "../export/revealLastScan";
import { resolveWorkspaceRoot, writeLastScan } from "../export/writeLastScan";
import type { RiskSession } from "../session/riskSession";
import { collectInstructionCandidates } from "./collectCandidates";
import { runInstructionEnrichment } from "./runInstructionEnrichment";
import { isExternalBackend, readLlmSettings } from "./settings";

export type EnrichCommandOptions = {
  triggerPath?: string;
};

/**
 * Opt-in command: enrich instruction paths and merge into last-scan.json.
 * Does not change live Keep/Filter scoring (heuristic-first).
 */
export async function enrichInstructionPathsCommand(
  session: RiskSession,
  options: EnrichCommandOptions = {},
): Promise<void> {
  const settings = readLlmSettings();
  if (!settings.enrichmentEnabled) {
    void window.showWarningMessage(
      "Enable TokenForge › LLM Enrichment (tokenforge.llmEnrichment) for this workspace first.",
    );
    return;
  }

  const spec = parseLlmSpec(settings.llm);
  const root = resolveWorkspaceRoot();
  const tabs = session.listAll();
  const candidates = await collectInstructionCandidates(root, tabs);

  const preflightPaths = options.triggerPath
    ? candidates.filter((c) => c.path === options.triggerPath).map((c) => c.path)
    : candidates.map((c) => c.path);
  const preflightBytes = candidates
    .filter((c) => preflightPaths.includes(c.path))
    .reduce((sum, c) => sum + c.bytes, 0);

  let externalConsent = settings.allowExternal;
  if (isExternalBackend(spec.backend)) {
    const ok = await confirmExternalLlmSend({
      paths: preflightPaths,
      totalBytes: preflightBytes,
      backend: spec.backend,
    });
    if (!ok) {
      return;
    }
    externalConsent = true;
  } else {
    logLocalPreflight({
      paths: preflightPaths,
      totalBytes: preflightBytes,
      backend: spec.backend,
    });
  }

  if (candidates.length === 0) {
    void window.showInformationMessage(
      "No instruction paths found (AGENTS.md, CLAUDE.md, copilot-instructions, .cursor/rules, …).",
    );
    return;
  }

  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: "TokenForge: enriching instruction paths",
      cancellable: false,
    },
    async (progress) => {
      progress.report({
        message: `${candidates.length} candidate(s) via ${spec.backend}`,
      });
      const enrichment = await runInstructionEnrichment({
        root,
        candidates,
        externalDataConsent: externalConsent,
        onProgress: (message) => progress.report({ message }),
      });

      const llmCandidateTokens = candidates.reduce(
        (sum, item) => sum + item.estTokens,
        0,
      );
      const result = await writeLastScan(session, Date.now(), {
        llmFindings: enrichment.findings,
        llmMeta: enrichment.meta,
        llmCandidateTokens,
      });

      const choice = await window.showInformationMessage(
        `Enriched ${candidates.length} path(s) → ${enrichment.findings.length} LLM finding(s). Wrote ${result.reportPath}`,
        "Reveal last-scan.json",
      );
      if (choice === "Reveal last-scan.json") {
        await revealLastScan(result.reportPath);
      }
    },
  );
}
