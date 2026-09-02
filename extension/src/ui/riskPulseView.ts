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
import { buildTaskContextPack } from "../ai/taskContextPack";
import { discoverRecentChanges, type DiscoverCandidate } from "../discover/discoverService";
import { collectInstructionCandidates } from "../enrich/collectCandidates";
import { resolveWorkspaceRoot } from "../export/writeLastScan";
import { isAutoFilterEnabled } from "../filter/autoFilterSettings";
import { estimateRulesBudget, isRulesBudgetOverThreshold } from "../instructions/instructionWatch";
import { detectInstructionOverlap, type OverlapHint } from "../instructions/overlapRadar";
import type { ShieldSession } from "../session/shieldSession";
import { hasTokenReduction, type RiskPulseModel } from "../session/riskPulse";
import { formatTokenCount } from "./formatTokens";

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
};

class RiskPulseProvider implements WebviewViewProvider {
  private view?: WebviewView;
  private readonly disposables: Array<{ dispose(): void }> = [];
  private rulesCost = 0;

  constructor(
    private readonly session: ShieldSession,
    private readonly extensionUri: Uri,
  ) {
    this.disposables.push(
      session.onDidChange(() => {
        void this.render();
      }),
      workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("tokenforge.autoFilterHighRisk")) {
          void this.render();
        }
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
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private async buildModel(): Promise<OverviewModel> {
    const pulse = this.session.pulse();
    const sessionSaved = this.session.sessionAvoidedTokens();
    let rulesCost = this.rulesCost;
    try {
      const root = resolveWorkspaceRoot();
      rulesCost = await estimateRulesBudget(root, this.session.listAll());
      this.rulesCost = rulesCost;
    } catch {
      /* no folder workspace */
    }

    let discoverItems: readonly DiscoverCandidate[] = [];
    try {
      const root = resolveWorkspaceRoot();
      const hours = workspace.getConfiguration("tokenforge").get<number>("discoverIntervalHours", 24);
      const editorPath = window.activeTextEditor
        ? workspace.asRelativePath(window.activeTextEditor.document.uri, false).replaceAll("\\", "/")
        : undefined;
      discoverItems = await discoverRecentChanges(root, {
        sinceMs: hours * 60 * 60 * 1000,
        editorPath,
      });
    } catch {
      /* ignore */
    }

    const drift = adviseContextDrift(this.session);
    const taskPack = buildTaskContextPack(this.session);
    const summary = buildSessionSummary(this.session);
    const threshold = workspace.getConfiguration("tokenforge").get<number>("rulesBudgetThreshold", 8_000);
    const prePromptEnabled = workspace.getConfiguration("tokenforge").get<boolean>("prePromptGate", false);
    const prePromptBanner =
      prePromptEnabled && pulse.displayAtRiskTokens >= threshold && pulse.pendingCount > 0;

    let overlapHints: OverlapHint[] = [];
    try {
      const root = resolveWorkspaceRoot();
      const instrPaths = await collectInstructionCandidates(root, this.session.listAll());
      overlapHints = detectInstructionOverlap(
        this.session.listAll(),
        instrPaths.map((c) => c.path),
      );
    } catch {
      /* ignore */
    }

    const levers = this.session.leversAppliedSummary();
    const leversFootnote =
      levers.length > 0
        ? `${levers.length} Shield lever(s) applied (${levers.map((l) => l.effectiveness).join(", ")}).`
        : undefined;

    return {
      pulse,
      sessionSaved,
      rulesCost,
      autoShieldOn: isAutoFilterEnabled(),
      driftSummary: drift?.summary,
      discoverItems,
      taskPackPaths: taskPack.paths,
      sessionNarrative: summary.narrative,
      overlapHints,
      leversFootnote,
      prePromptBanner,
      rulesOverThreshold: isRulesBudgetOverThreshold(rulesCost, threshold),
    };
  }

  private async render(): Promise<void> {
    if (!this.view) {
      return;
    }
    const model = await this.buildModel();
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
  const { pulse, sessionSaved, rulesCost, autoShieldOn, driftSummary, discoverItems, taskPackPaths, sessionNarrative, overlapHints, leversFootnote, prePromptBanner, rulesOverThreshold } =
    model;
  const csp = webview.cspSource;
  const contextCost = formatTokenCount(pulse.displayAtRiskTokens);
  const sessionKpi = formatTokenCount(sessionSaved);
  const rulesKpi = formatTokenCount(rulesCost);

  const emptyState =
    pulse.segments.length === 0 && rulesCost === 0
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
      : `<div class="tf-placeholder">Run discover to rank recently changed workspace files.</div>`;

  const overlapBlock =
    overlapHints.length > 0
      ? `<ul>${overlapHints
          .slice(0, 4)
          .map((h) => `<li>${escapeHtml(h.path)} ↔ ${escapeHtml(h.overlapsWith)}</li>`)
          .join("")}</ul>`
      : `<div class="tf-placeholder">Analyze rules to detect redundant instruction overlap.</div>`;

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

  const reductionNote = hasTokenReduction(pulse)
    ? `<p class="tf-honesty">${formatTokenCount(pulse.totals.savedTokens)} shielded from open-tab estimate (${formatTokenCount(pulse.totals.beforeTokens)} → ${formatTokenCount(pulse.totals.afterTokens)}).</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp}; script-src ${csp};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${cssUri}" />
  <style>
    body { margin: 0; padding: 12px; font-family: var(--tf-font-family); font-size: var(--tf-font-size); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    ul { margin: 0; padding-left: 18px; font-size: 11px; }
    li { margin-bottom: 4px; word-break: break-all; }
  </style>
</head>
<body>
  ${emptyState}
  ${prePromptBlock}
  ${autoBanner}
  ${rulesBadge}
  <div class="tf-hero">
    <div class="tf-kpi"><span class="tf-kpi-label">Context cost</span><span class="tf-kpi-value">${contextCost}</span></div>
    <div class="tf-kpi"><span class="tf-kpi-label">Session saved</span><span class="tf-kpi-value">${sessionKpi}</span></div>
    <div class="tf-kpi"><span class="tf-kpi-label">Rules cost</span><span class="tf-kpi-value">${rulesKpi}</span></div>
  </div>
  ${reductionNote}
  <div class="tf-actions">
    <button class="tf-btn" data-cmd="tokenforge.shieldAllPending">Shield all pending</button>
    <button class="tf-btn" data-cmd="tokenforge.cleanSession">Clean session</button>
    <button class="tf-btn" data-cmd="tokenforge.prepareAgentSession">Prepare session</button>
    <button class="tf-btn" data-cmd="tokenforge.enrichInstructions">Analyze rules</button>
    <button class="tf-btn" data-cmd="tokenforge.runDiscover">Run discover</button>
    <button class="tf-btn" data-cmd="tokenforge.compactRulesPreview">Compact rules</button>
    <button class="tf-btn" data-cmd="tokenforge.applyTaskContextPack">Apply task pack</button>
    <button class="tf-btn" data-cmd="tokenforge.focusRiskPanel">Open tabs</button>
  </div>
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
  <script>
    const vscode = acquireVsCodeApi();
    for (const btn of document.querySelectorAll('[data-cmd]')) {
      btn.addEventListener('click', () => {
        vscode.postMessage({ type: 'action', command: btn.getAttribute('data-cmd') });
      });
    }
  </script>
</body>
</html>`;
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
