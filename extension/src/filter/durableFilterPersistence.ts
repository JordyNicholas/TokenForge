import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TabDecision } from "./types";
import { isDurableFilterEnabled } from "./durableFilterSettings";

export const FILTER_DECISIONS_FILE = "filter-decisions.json";

type StoredDecision = Exclude<TabDecision, "pending">;

type DurableFilterFile = {
  version: 1;
  decisions: Record<string, StoredDecision>;
};

const SAVE_DEBOUNCE_MS = 800;

/**
 * Workspace-scoped Keep/Filter overrides keyed by repo-relative path.
 * Written to `.tokenforge/filter-decisions.json` when the setting is on.
 */
export class DurableFilterPersistence {
  private readonly decisions = new Map<string, StoredDecision>();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private workspaceRoot: string | undefined;

  get(path: string): StoredDecision | undefined {
    return this.decisions.get(path);
  }

  set(path: string, decision: StoredDecision): void {
    this.decisions.set(path, decision);
    this.scheduleSave();
  }

  remove(path: string): void {
    if (!this.decisions.delete(path)) {
      return;
    }
    this.scheduleSave();
  }

  clearAll(): void {
    if (this.decisions.size === 0) {
      return;
    }
    this.decisions.clear();
    this.scheduleSave();
  }

  async load(workspaceRoot: string): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    this.decisions.clear();
    const filePath = join(workspaceRoot, ".tokenforge", FILTER_DECISIONS_FILE);
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as DurableFilterFile;
      if (parsed.version !== 1 || typeof parsed.decisions !== "object") {
        return;
      }
      for (const [path, decision] of Object.entries(parsed.decisions)) {
        if (decision === "filtered" || decision === "kept") {
          this.decisions.set(path, decision);
        }
      }
    } catch {
      /* missing or invalid file — start empty */
    }
  }

  syncDecision(path: string, decision: TabDecision): void {
    if (!isDurableFilterEnabled()) {
      return;
    }
    if (decision === "pending") {
      this.remove(path);
      return;
    }
    this.set(path, decision);
  }

  dispose(): void {
    if (this.saveTimer !== undefined) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
  }

  private scheduleSave(): void {
    if (!isDurableFilterEnabled() || !this.workspaceRoot) {
      return;
    }
    if (this.saveTimer !== undefined) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      void this.flush(this.workspaceRoot!);
    }, SAVE_DEBOUNCE_MS);
  }

  private async flush(workspaceRoot: string): Promise<void> {
    const dir = join(workspaceRoot, ".tokenforge");
    await mkdir(dir, { recursive: true });
    const payload: DurableFilterFile = {
      version: 1,
      decisions: Object.fromEntries(this.decisions.entries()),
    };
    await writeFile(
      join(dir, FILTER_DECISIONS_FILE),
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
  }
}
