import { ProgressLocation, window } from "vscode";
import {
  confirmExternalLlmSend,
  logLocalPreflight,
} from "../ai/transparencyCoach";
import { revealLastScan } from "../export/revealLastScan";
import { setEnrichExportBusy } from "../export/enrichExportGate";
import { resolveWorkspaceRoot, writeLastScan } from "../export/writeLastScan";
import type { RiskSession } from "../session/riskSession";
import { collectInstructionCandidates } from "./collectCandidates";
import { recordEnrichRun, safeParseLlmSpec } from "./enrichStatus";
import { isOllamaReachable, resolveOllamaEndpoint } from "./ollamaHealth";
import { runInstructionEnrichment } from "./runInstructionEnrichment";
import { isExternalBackend, readLlmSettings } from "./settings";

export type EnrichCommandOptions = {
  triggerPath?: string;
  /**
   * When false (continuous analyze on save), skip post-run toasts — especially
   * full cache hits, which would otherwise spam on every instruction save.
   * Default true for Command Palette / Overview.
   */
  interactive?: boolean;
  /** Skip enrich-cache and re-call the model for all candidates. */
  bypassCache?: boolean;
};

let enrichCommandInFlight = false;

/**
 * Opt-in command: enrich instruction paths and merge into last-scan.json.
 * Does not change live Keep/Filter scoring (heuristic-first).
 */
export async function enrichInstructionPathsCommand(
  session: RiskSession,
  options: EnrichCommandOptions = {},
): Promise<void> {
  if (enrichCommandInFlight) {
    void window.showInformationMessage(
      "TokenForge: Analyze rules is already running — wait for it to finish.",
    );
    return;
  }
  enrichCommandInFlight = true;
  try {
    await enrichInstructionPathsCommandInner(session, options);
  } finally {
    enrichCommandInFlight = false;
  }
}

async function enrichInstructionPathsCommandInner(
  session: RiskSession,
  options: EnrichCommandOptions,
): Promise<void> {
  const interactive = options.interactive !== false;
  const settings = readLlmSettings();
  if (!settings.enrichmentEnabled) {
    if (interactive) {
      void window.showWarningMessage(
        "Enable TokenForge › LLM Enrichment (tokenforge.llmEnrichment) for this workspace first.",
      );
    }
    return;
  }

  const spec = safeParseLlmSpec(settings.llm);
  if (spec.backend === "noop") {
    if (interactive) {
      void window.showInformationMessage(
        "TokenForge AI enrichment is on, but no model is set. Set tokenforge.llm (e.g. ollama:qwen2.5-coder:3b) to Analyze rules.",
      );
    }
    return;
  }
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
      model: spec.model,
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
      model: spec.model,
    });
  }

  if (candidates.length === 0) {
    if (interactive) {
      void window.showInformationMessage(
        "No instruction paths found (AGENTS.md, CLAUDE.md, copilot-instructions, .cursor/rules, …).",
      );
    }
    return;
  }

  // Preflight local Ollama so an offline server produces an honest warning and
  // keeps the heuristic path, instead of a full-timeout "Analyze rules failed".
  if (spec.backend === "ollama") {
    const endpoint = resolveOllamaEndpoint(settings.endpoint);
    if (!(await isOllamaReachable(endpoint))) {
      recordEnrichRun({
        at: Date.now(),
        ok: false,
        findingCount: 0,
        candidateCount: candidates.length,
        backend: spec.backend,
        model: spec.model,
        error: `cannot reach Ollama at ${endpoint}`,
      });
      if (interactive) {
        void window.showWarningMessage(
          `TokenForge: cannot reach Ollama at ${endpoint}. Start it (ollama serve) or set tokenforge.llmEndpoint. Detect stays heuristic.`,
        );
      }
      return;
    }
  }

  let result: Awaited<ReturnType<typeof writeLastScan>> | undefined;
  let findingCount = 0;
  let fullCacheHit = false;
  setEnrichExportBusy(true);
  try {
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: options.bypassCache
          ? "TokenForge: force re-analyzing instruction paths"
          : "TokenForge: enriching instruction paths",
        cancellable: false,
      },
      async (progress) => {
        const modelLabel = spec.backend === "noop" ? spec.backend : `${spec.backend}:${spec.model}`;
        progress.report({
          message: options.bypassCache
            ? `${candidates.length} instruction file(s) via ${modelLabel} (bypassing cache)`
            : `${candidates.length} instruction file(s) via ${modelLabel}`,
        });
        let enrichment: Awaited<ReturnType<typeof runInstructionEnrichment>>;
        try {
          enrichment = await runInstructionEnrichment({
            root,
            candidates,
            externalDataConsent: externalConsent,
            bypassCache: options.bypassCache === true,
            onProgress: (message) => progress.report({ message }),
          });
        } catch (error) {
          recordEnrichRun({
            at: Date.now(),
            ok: false,
            findingCount: 0,
            candidateCount: candidates.length,
            backend: spec.backend,
            model: spec.model,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }

        const llmCandidateTokens = candidates.reduce(
          (sum, item) => sum + item.estTokens,
          0,
        );
        progress.report({ message: "Writing last-scan.json…" });
        result = await writeLastScan(session, Date.now(), {
          llmFindings: enrichment.findings,
          llmMeta: enrichment.meta,
          llmCandidateTokens,
        });
        findingCount = enrichment.findings.length;
        fullCacheHit = enrichment.fullCacheHit;

        recordEnrichRun({
          at: Date.now(),
          ok: true,
          findingCount,
          candidateCount: candidates.length,
          backend: spec.backend,
          model: spec.model,
        });
      },
    );
  } finally {
    setEnrichExportBusy(false);
  }

  if (!result) {
    return;
  }

  // Continuous analyze: stay quiet on full cache hits (file unchanged).
  if (!interactive) {
    if (fullCacheHit) {
      return;
    }
    // Still surface a real enrich so the user knows continuous analyze did work.
    void window.showInformationMessage(
      `Enriched ${candidates.length} path(s) → ${findingCount} LLM finding(s). Wrote ${result.reportPath}`,
    );
    return;
  }

  // Keep the reveal prompt outside withProgress so the notification spinner
  // stops when the enricher finishes (awaiting UI inside keeps it "running").
  if (fullCacheHit) {
    const choice = await window.showInformationMessage(
      `Rules unchanged since last analyze — reused cached findings for ${candidates.length} file(s) (no model call).`,
      "Force re-analyze",
      "Reveal last-scan.json",
    );
    if (choice === "Force re-analyze") {
      // Re-enter Inner while the outer in-flight lock is still held so a second
      // Command Palette click cannot race this force pass.
      await enrichInstructionPathsCommandInner(session, {
        ...options,
        bypassCache: true,
      });
      return;
    }
    if (choice === "Reveal last-scan.json") {
      await revealLastScan(result.reportPath);
    }
    return;
  }

  const choice = await window.showInformationMessage(
    `Enriched ${candidates.length} path(s) → ${findingCount} LLM finding(s). Wrote ${result.reportPath}`,
    "Reveal last-scan.json",
  );
  if (choice === "Reveal last-scan.json") {
    await revealLastScan(result.reportPath);
  }
}
