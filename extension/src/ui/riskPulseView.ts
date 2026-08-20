import {
  Uri,
  window,
  type ExtensionContext,
  type Webview,
  type WebviewView,
  type WebviewViewProvider,
} from "vscode";
import type { RiskSession } from "../session/riskSession";
import type { RiskPulseModel } from "../session/riskPulse";
import { formatTokenCount } from "./formatTokens";

export const RISK_PULSE_VIEW_ID = "tokenforge.riskPulse";

class RiskPulseProvider implements WebviewViewProvider {
  private view?: WebviewView;
  private readonly subscription: { dispose(): void };

  constructor(
    private readonly session: RiskSession,
    private readonly extensionUri: Uri,
  ) {
    this.subscription = session.onDidChange(() => this.render());
  }

  resolveWebviewView(webviewView: WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: false,
      localResourceRoots: [this.extensionUri],
    };
    this.render();
  }

  dispose(): void {
    this.subscription.dispose();
  }

  private render(): void {
    if (!this.view) {
      return;
    }
    const model = this.session.pulse();
    this.view.webview.html = renderPulseHtml(this.view.webview, model);
    this.view.badge =
      model.totals.savedTokens > 0
        ? {
            value: Math.min(model.filteredCount, 99),
            tooltip: `${formatTokenCount(model.totals.savedTokens)} tokens saved`,
          }
        : undefined;
  }
}

export function createRiskPulse(
  session: RiskSession,
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

function renderPulseHtml(webview: Webview, model: RiskPulseModel): string {
  const { totals, segments, displayAtRiskTokens } = model;
  const before = Math.max(totals.beforeTokens, 1);
  const savedPct = Math.round((totals.savedTokens / before) * 1000) / 10;
  const afterPct = Math.round((totals.afterTokens / before) * 1000) / 10;
  const csp = webview.cspSource;

  const segmentRows = segments
    .slice(0, 8)
    .map((segment) => {
      const width = Math.max(2, Math.round((segment.tokens / before) * 100));
      const tone =
        segment.decision === "filtered"
          ? "saved"
          : segment.decision === "kept"
            ? "kept"
            : "risk";
      const label = escapeHtml(basename(segment.path));
      return `<div class="row">
  <div class="meta"><span class="name">${label}</span><span class="tok">${formatTokenCount(segment.tokens)}</span></div>
  <div class="track"><div class="fill ${tone}" style="width:${width}%"></div></div>
  <div class="tag ${tone}">${segment.decision}</div>
</div>`;
    })
    .join("\n");

  const empty =
    segments.length === 0
      ? `<p class="hint">No at-risk tabs yet. Open a lockfile or leave a tab idle ≥15 minutes.</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      --bg: var(--vscode-sideBar-background);
      --fg: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --border: var(--vscode-widget-border, var(--vscode-panel-border));
      --risk: var(--vscode-charts-orange, #e2a03f);
      --saved: var(--vscode-charts-green, #3fae6d);
      --kept: var(--vscode-charts-blue, #4a90d9);
      --track: color-mix(in srgb, var(--fg) 12%, transparent);
    }
    body {
      margin: 0;
      padding: 12px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--fg);
      background: var(--bg);
    }
    h1 {
      margin: 0 0 4px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .kpi {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 10px 0 14px;
    }
    .kpi div {
      padding: 8px 6px;
      border: 1px solid var(--border);
      border-radius: 4px;
    }
    .kpi .label { display: block; color: var(--muted); font-size: 11px; }
    .kpi .value { display: block; margin-top: 2px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .bar {
      display: flex;
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      background: var(--track);
      margin-bottom: 6px;
    }
    .bar .saved { background: var(--saved); }
    .bar .after { background: var(--risk); opacity: 0.85; }
    .caption { color: var(--muted); font-size: 11px; margin-bottom: 14px; }
    .row { margin-bottom: 10px; }
    .meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; font-size: 12px; }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tok { color: var(--muted); font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .track { height: 6px; border-radius: 3px; background: var(--track); overflow: hidden; }
    .fill { height: 100%; border-radius: 3px; }
    .fill.risk { background: var(--risk); }
    .fill.saved { background: var(--saved); }
    .fill.kept { background: var(--kept); }
    .tag {
      margin-top: 3px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
    }
    .tag.saved { color: var(--saved); }
    .tag.kept { color: var(--kept); }
    .tag.risk { color: var(--risk); }
    .hint { color: var(--muted); font-size: 12px; line-height: 1.4; }
    .foot { margin-top: 12px; color: var(--muted); font-size: 10px; line-height: 1.35; }
  </style>
</head>
<body>
  <h1>Token reduction</h1>
  <div class="kpi">
    <div><span class="label">Before</span><span class="value">${formatTokenCount(totals.beforeTokens)}</span></div>
    <div><span class="label">After</span><span class="value">${formatTokenCount(totals.afterTokens)}</span></div>
    <div><span class="label">Saved</span><span class="value">${formatTokenCount(totals.savedTokens)}</span></div>
  </div>
  <div class="bar" role="img" aria-label="${savedPct}% saved">
    <div class="saved" style="width:${savedPct}%"></div>
    <div class="after" style="width:${afterPct}%"></div>
  </div>
  <div class="caption">${savedPct}% filtered · ${formatTokenCount(displayAtRiskTokens)} still at risk</div>
  ${empty}
  ${segmentRows}
  <p class="foot">Live from open tabs + Keep/Filter. Same math as last-scan.json. Hygiene advice only — not agent interception.</p>
</body>
</html>`;
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
