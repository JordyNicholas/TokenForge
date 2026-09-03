import { classifyFiletype, fileName } from "../classify/classify";
import type { TokenRiskFinding } from "../domain/types";

/**
 * What kind of waste a path is, for policy text. Coarser than
 * {@link classifyFiletype}: the agent only needs to know whether a path is
 * never worth loading, or worth a section on demand.
 */
export type WasteKind = "binary" | "dump" | "output" | "prose";

export const WASTE_KIND_LABEL: Record<WasteKind, string> = {
  binary: "binary assets",
  dump: "lockfiles and data dumps",
  output: "build and CI output",
  prose: "oversized text",
};

const BINARY_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".eot",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".svg",
  ".ttf",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

const DUMP_EXTENSIONS = new Set([
  ".csv",
  ".json",
  ".jsonl",
  ".ndjson",
  ".tsv",
  ".xml",
  ".yaml",
  ".yml",
]);

function extensionOf(path: string): string {
  const name = fileName(path).toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot);
}

/** Bucket a path for policy text. */
export function wasteKindFor(path: string): WasteKind {
  const extension = extensionOf(path);
  if (BINARY_EXTENSIONS.has(extension)) {
    return "binary";
  }
  const fileClass = classifyFiletype(path);
  if (
    fileClass === "build_artifact" ||
    fileClass === "generated" ||
    fileClass === "test_output" ||
    fileClass === "ci_log"
  ) {
    return "output";
  }
  if (fileClass === "lockfile" || DUMP_EXTENSIONS.has(extension)) {
    return "dump";
  }
  return "prose";
}

/**
 * Waste kinds present in a finding set, heaviest first.
 *
 * Ranked by est. tokens so the intro names what actually drives the bill in
 * this repo rather than reciting every category the scanner knows about. The
 * weights stay inside the synthesizer — no counts reach the rendered file.
 */
export function dominantWasteKinds(
  findings: readonly TokenRiskFinding[],
  limit = 2,
): WasteKind[] {
  const weight = new Map<WasteKind, number>();
  for (const finding of findings) {
    if (finding.action !== "excluded" && finding.action !== "filtered") {
      continue;
    }
    const kind = wasteKindFor(finding.path);
    weight.set(kind, (weight.get(kind) ?? 0) + finding.estTokens);
  }
  return [...weight.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([kind]) => kind);
}

/** Join labels as an English list: `a`, `a and b`, `a, b, and c`. */
export function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}
