import {
  commands,
  Uri,
  window,
  workspace,
  type ExtensionContext,
  type Webview,
  type WebviewView,
  type WebviewViewProvider,
} from "vscode";
import { adviseContextDrift } from "../ai/driftAdvisor";
import { buildSessionSummary } from "../ai/sessionSummary";
import { peekTaskContextPack } from "../ai/taskContextPack";
import { discoverRecentChanges, type DiscoverCandidate } from "../discover/discoverService";
import { collectInstructionCandidates } from "../enrich/collectCandidates";
import {
  describeEnrichmentStatus,
  getLastEnrichRun,
  onEnrichStatusChange,
  type EnrichmentStatusView,
} from "../enrich/enrichStatus";
import { readLlmSettings } from "../enrich/settings";
import { assertValidLastScan, buildLastScanReport } from "../export/buildLastScan";
import { repoLabel, teamLabel, resolveWorkspaceRoot } from "../export/writeLastScan";
import { inboxPath } from "../export/exportToInbox";
import { isAutoFilterEnabled } from "../filter/autoFilterSettings";
import { providerExpectation } from "../shield/providerExpectations";
import { isRulesBudgetOverThreshold } from "../instructions/instructionWatch";
import { peekInstructionOverlap, resolveInstructionOverlap, type OverlapHint } from "../instructions/overlapRadar";
import type { ShieldSession } from "../session/shieldSession";
import { hasTokenReduction, type RiskPulseModel } from "../session/riskPulse";
import { formatTokenCount } from "./formatTokens";
import { buildDailyHealth, type DailyHealthModel } from "./dailyHealth";

export const RISK_PULSE_VIEW_ID = "tokenforge.riskPulse";

type OverviewModel = {
  pulse: RiskPulseModel;
  sessionSaved: number;
  rulesCost: number;
  autoShieldOn: boolean;
  driftSummary?: string;
  discoverItems: readonly DiscoverCandidate[];
  taskPackPaths: readonly string[];
  sessionNarrative: string;
  overlapHints: readonly OverlapHint[];
  leversFootnote?: string;
  prePromptBanner: boolean;
  rulesOverThreshold: boolean;
  enrichment: EnrichmentStatusView;
  cardsLoading: boolean;
  dailyHealth?: DailyHealthModel;
  providerNote?: string;
};

class RiskPulseProvider implements WebviewViewProvider {
  private view?: WebviewView;
  private readonly disposables: Array<{ dispose(): void }> = [];
  private rulesCost = 0;
  private discoverItems: readonly DiscoverCandidate[] = [];
  private overlapHints: readonly OverlapHint[] = [];
  private dailyHealth?: DailyHealthModel;
  private renderGen = 0;
  private slowTimer: ReturnType<typeof setTimeout> | undefined;
  private workspaceCardsReady = false;

  constructor(
    private readonly session: ShieldSession,
    private readonly extensionUri: Uri,
  ) {
    this.disposables.push(
      session.onDidChange(() => {
        void this.render();
      }),
      workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration("tokenforge.autoFilterHighRisk") ||
          event.affectsConfiguration("tokenforge.llmEnrichment") ||
          event.affectsConfiguration("tokenforge.llm") ||
          event.affectsConfiguration("tokenforge.llmEndpoint") ||
          event.affectsConfiguration("tokenforge.inboxPath") ||
          event.affectsConfiguration("tokenforge.team") ||
          event.affectsConfiguration("tokenforge.repo") ||
          event.affectsConfiguration("tokenforge.provider")
        ) {
          void this.render();
        }
      }),
      onEnrichStatusChange(() => {
        void this.render();
      }),
    );
  }

  resolveWebviewView(webviewView: WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.onDidReceiveMessage((message: { type?: string; command?: string }) => {
      if (message.type === "action" && message.command) {
        void commands.executeCommand(message.command);
      }
    });
    void this.render();
  }

  dispose(): void {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
    }
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  /** KPIs from the live session — never waits on disk walks or LLM. */
  private buildFastModel(cardsLoading: boolean): OverviewModel {
    const pulse = this.session.pulse();
    const sessionSaved = this.session.sessionAvoidedTokens();
    const threshold = workspace.getConfiguration("tokenforge").get<number>("rulesBudgetThreshold", 8_000);
    const prePromptEnabled = workspace.getConfiguration("tokenforge").get<boolean>("prePromptGate", false);
    const drift = adviseContextDrift(this.session);
    const taskPack = peekTaskContextPack(this.session);
    const summary = buildSessionSummary(this.session);
    const levers = this.session.leversAppliedSummary();
    const providerValue = workspace.getConfiguration("tokenforge").get<string>("provider");
    const provider =
      providerValue === "copilot" ||
      providerValue === "cursor" ||
      providerValue === "claude" ||
      providerValue === "gemini" ||
      providerValue === "generic"
        ? providerValue
        : "generic";
    return {
      pulse,
      sessionSaved,
      rulesCost: this.rulesCost,
      autoShieldOn: isAutoFilterEnabled(),
      driftSummary: drift
        ? [drift.summary, ...drift.suggestions].join(" ")
        : undefined,
      discoverItems: this.discoverItems,
      taskPackPaths: taskPack.paths,
      sessionNarrative: summary.narrative,
      overlapHints: this.overlapHints,
      leversFootnote:
        levers.length > 0
          ? `${levers.length} Shield lever(s) applied (${levers.map((l) => l.effectiveness).join(", ")}).`
          : undefined,
      prePromptBanner:
        prePromptEnabled && pulse.displayAtRiskTokens >= threshold && pulse.pendingCount > 0,
      rulesOverThreshold: isRulesBudgetOverThreshold(this.rulesCost, threshold),
      enrichment: describeEnrichmentStatus(
        {
          ...readLlmSettings(),
          provider: workspace.getConfiguration("tokenforge").get<string>("provider") ?? "generic",
        },
        getLastEnrichRun(),
      ),
      cardsLoading,
      dailyHealth: this.dailyHealth,
      providerNote: providerExpectation(provider),
    };
  }

  private paint(model: OverviewModel): void {
    if (!this.view) {
      return;
    }
    const cssUri = this.view.webview.asWebviewUri(
      Uri.joinPath(this.extensionUri, "media", "tokenforge.css"),
    );
    this.view.webview.html = renderOverviewHtml(this.view.webview, cssUri, model);
    this.view.description = model.autoShieldOn ? "Auto-shield on" : undefined;
    this.view.badge =
      model.pulse.totals.savedTokens > 0
        ? {
            value: Math.min(model.pulse.filteredCount, 99),
            tooltip: `${formatTokenCount(model.pulse.totals.savedTokens)} shielded`,
          }
        : model.autoShieldOn
          ? { value: 1, tooltip: "Auto-shield is on" }
          : undefined;
  }

  private async fillWorkspaceCards(gen: number): Promise<void> {
    try {
      const root = resolveWorkspaceRoot();
      const hours = workspace.getConfiguration("tokenforge").get<number>("discoverIntervalHours", 24);
      const editorPath = window.activeTextEditor
        ? workspace.asRelativePath(window.activeTextEditor.document.uri, false).replaceAll("\\", "/")
        : undefined;
      const providerValue = workspace.getConfiguration("tokenforge").get<string>("provider");
      const provider =
        providerValue === "copilot" ||
        providerValue === "cursor" ||
        providerValue === "claude" ||
        providerValue === "gemini" ||
        providerValue === "generic"
          ? providerValue
          : "generic";
      const report = assertValidLastScan(
        buildLastScanReport({
          tabs: this.session.listAll(),
          decisionFor: (uri) => this.session.decision(uri),
          repo: repoLabel(root),
          team: teamLabel(),
          provider,
        }),
      );
      const [discoverResult, instrPaths] = await Promise.all([
        discoverRecentChanges(root, {
          sinceMs: hours * 60 * 60 * 1000,
          editorPath,
          report,
          provider,
          writeReport: false,
          fileWalk: false,
          enrichmentEnabled: false,
        }),
        collectInstructionCandidates(root, this.session.listAll()),
      ]);
      if (gen !== this.renderGen) {
        return;
      }
      this.rulesCost = instrPaths.reduce((sum, assessment) => sum + assessment.estTokens, 0);
      this.discoverItems = discoverResult.candidates;
      const instructionPaths = instrPaths.map((c) => c.path);
      this.overlapHints = peekInstructionOverlap(this.session.listAll(), instructionPaths);
      this.dailyHealth = await buildDailyHealth(root, provider, Date.now(), {
        inboxPath: inboxPath() ?? undefined,
        team: teamLabel(),
        repo: repoLabel(root),
      });
      // Lane A overlap is async — refresh the card when the model returns.
      void resolveInstructionOverlap({
        root,
        tabs: this.session.listAll(),
        instructionPaths,
      }).then((hints) => {
        if (gen !== this.renderGen) {
          return;
        }
        const same =
          hints.length === this.overlapHints.length &&
          hints.every(
            (hint, i) =>
              hint.path === this.overlapHints[i]?.path &&
              hint.overlapsWith === this.overlapHints[i]?.overlapsWith,
          );
        if (!same) {
          this.overlapHints = hints;
          this.paint(this.buildFastModel(false));
        }
      });
    } catch {
      /* no folder / ignore */
    }
    this.workspaceCardsReady = true;
  }

  private async render(): Promise<void> {
    if (!this.view) {
      return;
    }
    this.renderGen += 1;
    const gen = this.renderGen;
    this.paint(this.buildFastModel(!this.workspaceCardsReady));
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
    }
    await new Promise<void>((resolve) => {
      this.slowTimer = setTimeout(() => resolve(), 400);
    });
    if (gen !== this.renderGen) {
      return;
    }
    await this.fillWorkspaceCards(gen);
    if (gen !== this.renderGen) {
      return;
    }
    this.paint(this.buildFastModel(false));
  }
}

export function createRiskPulse(
  session: ShieldSession,
  context: ExtensionContext,
): { dispose(): void } {
  const provider = new RiskPulseProvider(session, context.extensionUri);
  const registration = window.registerWebviewViewProvider(RISK_PULSE_VIEW_ID, provider, {
    webviewOptions: { retainContextWhenHidden: true },
  });
  context.subscriptions.push(registration, provider);
  return {
    dispose: () => {
      registration.dispose();
      provider.dispose();
    },
  };
}

function renderOverviewHtml(
  webview: Webview,
  cssUri: Uri,
  model: OverviewModel,
): string {
  const { pulse, sessionSaved, rulesCost, autoShieldOn, driftSummary, discoverItems, taskPackPaths, sessionNarrative, overlapHints, leversFootnote, prePromptBanner, rulesOverThreshold, enrichment, cardsLoading, dailyHealth, providerNote } =
    model;
  const csp = webview.cspSource;
  const nonce = makeNonce();
  const contextCost = formatTokenCount(pulse.displayAtRiskTokens);
  const sessionKpi = formatTokenCount(sessionSaved);
  const rulesKpi = formatTokenCount(rulesCost);

  const emptyState =
    !cardsLoading && pulse.segments.length === 0 && rulesCost === 0
      ? `<div class="tf-placeholder">No costly context detected. TokenForge watches tabs and rules while you work.</div>`
      : "";

  const prePromptBlock = prePromptBanner
    ? `<div class="tf-banner">Context cost is high — Shield pending tabs before your next agent turn.
    <button class="tf-btn" data-cmd="tokenforge.shieldAllPending">Shield all pending</button>
    <button class="tf-btn" data-cmd="tokenforge.prepareAgentSession">Prepare session</button></div>`
    : "";

  const rulesBadge = rulesOverThreshold
    ? `<div class="tf-placeholder" style="border-style:solid;background:var(--tf-brand-warning-bg)">Rules cost over budget threshold</div>`
    : "";

  const bleeders = pulse.segments
    .slice(0, 6)
    .map(
      (segment) => `<div class="tf-row">
  <span class="tf-row-name">${escapeHtml(basename(segment.path))}</span>
  <span class="tf-row-tokens">${formatTokenCount(segment.tokens)} · ${shieldLabel(segment.decision)}</span>
</div>`,
    )
    .join("\n");

  const bleedersBlock =
    pulse.segments.length > 0
      ? bleeders
      : `<div class="tf-placeholder">No high context-cost tabs yet. Open lockfiles or leave tabs idle.</div>`;

  const driftBlock = driftSummary
    ? `<p>${escapeHtml(driftSummary)}</p>`
    : `<div class="tf-placeholder">No drift advisory yet — Shield pending tabs before long agent turns.</div>`;

  const discoverBlock =
    discoverItems.length > 0
      ? `<ul>${discoverItems
          .slice(0, 5)
          .map((c) => `<li>${escapeHtml(c.path)}${c.note ? ` — ${escapeHtml(c.note)}` : ""}</li>`)
          .join("")}</ul>`
      : `<div class="tf-placeholder">${
          cardsLoading
            ? "Loading workspace cards…"
            : "Run discover for missed policy gaps, session-kept tabs, and recent changes."
        }</div>`;

  const overlapBlock =
    overlapHints.length > 0
      ? `<ul>${overlapHints
          .slice(0, 4)
          .map((h) => `<li>${escapeHtml(h.path)} ↔ ${escapeHtml(h.overlapsWith)}</li>`)
          .join("")}</ul>`
      : `<div class="tf-placeholder">${
          cardsLoading ? "Loading workspace cards…" : "Analyze rules to detect redundant instruction overlap."
        }</div>`;

  const summaryBlock = `<p class="tf-summary">${escapeHtml(sessionNarrative)}</p>`;
  const leversBlock = leversFootnote
    ? `<p class="tf-honesty">${escapeHtml(leversFootnote)}</p>`
    : "";

  const taskPackBlock =
    taskPackPaths.length > 0
      ? `<ul>${taskPackPaths
          .slice(0, 5)
          .map((p) => `<li>${escapeHtml(p)}</li>`)
          .join("")}</ul>`
      : `<div class="tf-placeholder">Prepare agent session to build a task context pack.</div>`;

  const autoBanner = autoShieldOn
    ? `<div class="tf-placeholder" style="border-style:solid;background:var(--tf-brand-warning-bg)">Auto-shield ON · lockfile / generated</div>`
    : "";

  const enrichmentActions = enrichment.on
    ? `<button class="tf-btn tf-btn-ai" data-cmd="tokenforge.enrichInstructions">Analyze rules</button>
    <button class="tf-btn" data-cmd="tokenforge.toggleLlmEnrichment">Turn AI off</button>`
    : `<button class="tf-btn tf-btn-ai" data-cmd="tokenforge.toggleLlmEnrichment">Enable AI enrichment</button>`;
  const enrichmentDetail = enrichment.detail
    ? `<p class="tf-honesty">${escapeHtml(enrichment.detail)}</p>`
    : "";
  const enrichmentBlock = `<div class="tf-ai-status" data-ai-on="${enrichment.on}">
    <p class="tf-ai-headline"><strong>${escapeHtml(enrichment.headline)}</strong></p>
    ${enrichmentDetail}
    <div class="tf-actions">${enrichmentActions}</div>
  </div>`;

  const reductionNote = hasTokenReduction(pulse)
    ? `<p class="tf-honesty">${formatTokenCount(pulse.totals.savedTokens)} shielded from open-tab estimate (${formatTokenCount(pulse.totals.beforeTokens)} → ${formatTokenCount(pulse.totals.afterTokens)}).</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${cssUri}" />
  <style>
    body { margin: 0; padding: 12px; font-family: var(--tf-font-family); font-size: var(--tf-font-size); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    ul { margin: 0; padding-left: 18px; font-size: 11px; }
    li { margin-bottom: 4px; word-break: break-all; }
    .tf-ai-status { border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.35)); border-radius: 6px; padding: 8px; margin-bottom: 8px; }
    .tf-ai-status[data-ai-on="true"] { border-left: 3px solid var(--tf-brand, #14b8a6); }
    .tf-ai-headline { margin: 0 0 4px; }
    .tf-btn-ai { font-weight: 600; }
    .tf-checklist { font-size: 11px; color: var(--vscode-descriptionForeground); margin: 0 0 8px; padding-left: 18px; }
    .tf-health { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .tf-chip { font-size: 10px; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.35)); background: var(--vscode-editor-background); }
    .tf-chip[data-status="ok"], .tf-chip[data-status="sent"], .tf-chip[data-status="done"], .tf-chip[data-status="exported"] { border-color: var(--tf-brand, #14b8a6); }
    .tf-chip[data-status="stale"], .tf-chip[data-status="unsent"], .tf-chip[data-status="pending"], .tf-chip[data-status="dirty"] { border-color: var(--tf-brand-warning, #f59e0b); }
    .tf-chip[data-status="missing"], .tf-chip[data-status="unknown"] { opacity: 0.85; }
  </style>
</head>
<body>
  ${emptyState}
  ${prePromptBlock}
  ${autoBanner}
  ${rulesBadge}
  ${renderDailyHealthStrip(dailyHealth, cardsLoading)}
  ${providerNote ? `<p class="tf-honesty">${escapeHtml(providerNote)}</p>` : ""}
  <div class="tf-hero">
    <div class="tf-kpi"><span class="tf-kpi-label">Context cost</span><span class="tf-kpi-value">${contextCost}</span></div>
    <div class="tf-kpi"><span class="tf-kpi-label">Session saved</span><span class="tf-kpi-value">${sessionKpi}</span></div>
    <div class="tf-kpi"><span class="tf-kpi-label">Rules cost</span><span class="tf-kpi-value">${rulesKpi}</span></div>
  </div>
  ${reductionNote}
  <div class="tf-section">Fix target &amp; AI</div>
  ${enrichmentBlock}
  <p class="tf-honesty">Estimated avoided context ≠ invoice delta. Import bill into the Prove dashboard to reconcile.</p>
  <div class="tf-actions">
    <button class="tf-btn" data-cmd="tokenforge.shieldAllPending">Shield all pending</button>
    <button class="tf-btn" data-cmd="tokenforge.cleanSession">Clean session</button>
    <button class="tf-btn" data-cmd="tokenforge.prepareAgentSession">Prepare session</button>
    <button class="tf-btn" data-cmd="tokenforge.runDiscover">Run discover</button>
    <button class="tf-btn" data-cmd="tokenforge.compactRulesPreview">Compact rules</button>
    <button class="tf-btn" data-cmd="tokenforge.applyTaskContextPack">Apply task pack</button>
    <button class="tf-btn" data-cmd="tokenforge.sendHygieneToDashboard">Send hygiene to dashboard</button>
    <button class="tf-btn" data-cmd="tokenforge.exportToInbox">Export to inbox</button>
    <button class="tf-btn" data-cmd="tokenforge.setTeamLabel">Set team label</button>
    <button class="tf-btn" data-cmd="tokenforge.openHonorSmoke">Honor smoke checklist</button>
    <button class="tf-btn" data-cmd="tokenforge.focusRiskPanel">Open tabs</button>
  </div>
  <div class="tf-section">Getting started</div>
  <ul class="tf-checklist">
    <li>Detect — open noisy tabs; review context cost</li>
    <li>Shield — Allow or Shield from Open tabs</li>
    <li>Compact — preview lean rules before agent turns</li>
    <li>Prove — export session-stats and open dashboard</li>
  </ul>
  <div class="tf-section">Session summary</div>
  ${summaryBlock}
  ${leversBlock}
  <div class="tf-section">Top bleeders</div>
  ${bleedersBlock}
  <div class="tf-section">Rules overlap</div>
  ${overlapBlock}
  <div class="tf-honesty">Live open-tab estimate only. TokenForge recommends Shield/Allow — it does not intercept any agent or LLM context pipeline. <a href="https://github.com/JordyNicholas/TokenForge/blob/main/docs/design/EXTENSION_PRODUCT.md">How savings work</a></div>
  <div class="tf-section">Context drift</div>
  ${driftBlock}
  <div class="tf-section">Discover</div>
  ${discoverBlock}
  <div class="tf-section">Task context pack</div>
  ${taskPackBlock}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.addEventListener('click', (event) => {
      const el = event.target && event.target.closest ? event.target.closest('[data-cmd]') : null;
      if (el) {
        vscode.postMessage({ type: 'action', command: el.getAttribute('data-cmd') });
      }
    });
  </script>
</body>
</html>`;
}

function renderDailyHealthStrip(
  model: DailyHealthModel | undefined,
  cardsLoading: boolean,
): string {
  if (cardsLoading && !model) {
    return `<div class="tf-health"><span class="tf-chip" data-status="unknown">Daily health…</span></div>`;
  }
  if (!model) {
    return "";
  }
  const chips = [model.scan, model.session, model.drift, model.promote, ...(model.inbox ? [model.inbox] : [])]
    .map(
      (chip) =>
        `<span class="tf-chip" data-status="${escapeHtml(chip.status)}" title="${escapeHtml(chip.detail)}">${escapeHtml(chip.label)}: ${escapeHtml(chip.status)}</span>`,
    )
    .join("");
  return `<div class="tf-health">${chips}</div>`;
}

function shieldLabel(decision: string): string {
  if (decision === "filtered") {
    return "shielded";
  }
  if (decision === "kept") {
    return "allowed";
  }
  return "needs review";
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function makeNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
