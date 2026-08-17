import { formatPercent, formatTokens } from "../domain";

/** Teal (low waste) → red (high waste). */
export function heatColor(percent: number): string {
  const t = Math.min(100, Math.max(0, percent)) / 100;
  const hue = 162 - t * 162;
  const light = 14 + t * 26;
  return `hsl(${hue} 62% ${light}%)`;
}

export function HeatCell({
  team,
  repo,
  percent,
  savedTokens,
}: {
  team: string;
  repo: string;
  percent: number;
  savedTokens: number;
}) {
  return (
    <article className="heat-cell" style={{ background: heatColor(percent) }}>
      <h2>{team}</h2>
      <p className="heat-percent">{formatPercent(percent)}</p>
      <p className="heat-meta">
        {repo}
        <br />
        {formatTokens(savedTokens)} tokens avoided
      </p>
    </article>
  );
}
