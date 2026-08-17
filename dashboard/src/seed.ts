import type { TokenRiskReport, TokenRiskTotals } from "@tokenforge/risk-core";

export type DashboardSeed = {
  businessUnit: string;
  reports: TokenRiskReport[];
};

export function aggregateTotals(reports: TokenRiskReport[]): TokenRiskTotals {
  return reports.reduce<TokenRiskTotals>(
    (acc, report) => ({
      beforeTokens: acc.beforeTokens + report.totals.beforeTokens,
      afterTokens: acc.afterTokens + report.totals.afterTokens,
      savedTokens: acc.savedTokens + report.totals.savedTokens,
    }),
    { beforeTokens: 0, afterTokens: 0, savedTokens: 0 },
  );
}

const STAMP = "2026-08-17T18:00:00.000Z";

/** In-memory BU seed until #19 ships public/demo-seed.json. */
export const DEMO_SEED: DashboardSeed = {
  businessUnit: "Retail Banking",
  reports: [
    {
      source: "cli",
      timestamp: STAMP,
      repo: "fixtures/noisy-app",
      team: "payments-platform",
      provider: "generic",
      findings: [
        {
          path: "package-lock.json",
          reason: "high_risk_filetype",
          bytes: 802241,
          estTokens: 200561,
          action: "excluded",
        },
        {
          path: "config/app-settings.json",
          reason: "oversized",
          bytes: 357788,
          estTokens: 89447,
          action: "excluded",
        },
        {
          path: "dist/bundle.js",
          reason: "high_risk_filetype",
          bytes: 337349,
          estTokens: 84338,
          action: "excluded",
        },
        {
          path: "config/legacy-export.xml",
          reason: "oversized",
          bytes: 183260,
          estTokens: 45815,
          action: "excluded",
        },
        {
          path: "dist/bundle.js.map",
          reason: "high_risk_filetype",
          bytes: 140258,
          estTokens: 35065,
          action: "excluded",
        },
      ],
      totals: {
        beforeTokens: 455959,
        afterTokens: 733,
        savedTokens: 455226,
      },
    },
    {
      source: "cli",
      timestamp: STAMP,
      repo: "checkout-web",
      team: "checkout",
      provider: "generic",
      findings: [
        {
          path: "apps/checkout/package-lock.json",
          reason: "high_risk_filetype",
          bytes: 720000,
          estTokens: 180000,
          action: "excluded",
        },
      ],
      totals: {
        beforeTokens: 900000,
        afterTokens: 720000,
        savedTokens: 180000,
      },
    },
    {
      source: "cli",
      timestamp: STAMP,
      repo: "platform-services",
      team: "platform-services",
      provider: "generic",
      findings: [
        {
          path: "dist/legacy-bundle.js",
          reason: "high_risk_filetype",
          bytes: 360000,
          estTokens: 90000,
          action: "excluded",
        },
        {
          path: "config/flags.json",
          reason: "oversized",
          bytes: 246248,
          estTokens: 61562,
          action: "excluded",
        },
      ],
      totals: {
        beforeTokens: 900000,
        afterTokens: 748438,
        savedTokens: 151562,
      },
    },
    {
      source: "cli",
      timestamp: STAMP,
      repo: "data-pipelines",
      team: "data-eng",
      provider: "generic",
      findings: [
        {
          path: "pipelines/dump.xml",
          reason: "oversized",
          bytes: 400000,
          estTokens: 100000,
          action: "excluded",
        },
      ],
      totals: {
        beforeTokens: 700000,
        afterTokens: 600000,
        savedTokens: 100000,
      },
    },
  ],
};

export const DEMO_TOTALS = aggregateTotals(DEMO_SEED.reports);
