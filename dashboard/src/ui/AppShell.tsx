import { TOKEN_RISK_REPORT_SCHEMA_ID } from "@tokenforge/risk-core";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useDashboard } from "../state/DashboardProvider";
import { SourceBar } from "./SourceBar";

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Overview", end: true },
  { to: "/heatmap", label: "Heatmap" },
  { to: "/offenders", label: "Offenders" },
  { to: "/assumptions", label: "Assumptions" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { seed } = useDashboard();
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-name">TokenForge</span>
          <span className="brand-product">Tokens Saved</span>
          <span className="brand-bu">{seed?.businessUnit ?? "Loading…"}</span>
        </div>
        <nav className="app-nav" aria-label="FinOps views">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <SourceBar />
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        Prove adapter · Token Risk JSON · {TOKEN_RISK_REPORT_SCHEMA_ID}
      </footer>
    </div>
  );
}
