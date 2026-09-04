import type { PolicyWriteDisposition } from "../commands/apply/apply";

/** Count create / merge / replace dispositions for dry-run and apply output. */
export function summarizeWriteDispositions(
  writes: readonly { disposition: PolicyWriteDisposition | string }[],
): { create: number; merge: number; replace: number } {
  const counts = { create: 0, merge: 0, replace: 0 };
  for (const write of writes) {
    if (write.disposition === "create") {
      counts.create += 1;
    } else if (write.disposition === "merge") {
      counts.merge += 1;
    } else if (write.disposition === "replace") {
      counts.replace += 1;
    }
  }
  return counts;
}

/** Human-readable managed-section diff summary aligned with apply dry-run. */
export function formatWriteSummary(
  writes: readonly { disposition: PolicyWriteDisposition | string }[],
): string {
  const counts = summarizeWriteDispositions(writes);
  const parts: string[] = [];
  if (counts.create > 0) {
    parts.push(`${counts.create} create`);
  }
  if (counts.merge > 0) {
    parts.push(`${counts.merge} merge`);
  }
  if (counts.replace > 0) {
    parts.push(`${counts.replace} replace`);
  }
  if (parts.length === 0) {
    return "summary: no policy writes planned";
  }
  return `summary: ${parts.join(" · ")}`;
}
