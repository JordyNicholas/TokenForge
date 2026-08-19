import { assessTab } from "./assessTab";
import { TrackedTab } from "./types";

interface InputSnapshot {
  path: string,
  bytes: number,
  focus?: boolean,
  edit?: boolean
}

export class TabRegistry {
  private tabs: Map<string, TrackedTab> = new Map();

  upsert(uri: string, input: InputSnapshot, nowMs: number = Date.now()): TrackedTab {
    const existing = this.tabs.get(uri);
    let lastFocusAt = existing?.lastFocusAt ?? nowMs;
    let lastEditAt = existing?.lastEditAt ?? nowMs;

    if (input.focus) lastEditAt = nowMs;
    if (input.edit) lastFocusAt = nowMs;

    const lastActivityAt = Math.max(lastFocusAt, lastEditAt);
    const tab: TrackedTab = {
      path: input.path,
      bytes: input.bytes,
      lastFocusAt,
      lastEditAt,
      lastActivityAt,
      assessment: assessTab({ path: input.path, bytes: input.bytes, lastActivityAt }, nowMs),
    }

    this.tabs.set(uri, tab);
    return tab;
  }

  remove(uri: string): void {
    const existing = this.tabs.get(uri);
    if (existing) this.tabs.delete(uri);
  }
  
  list(): readonly TrackedTab[] {
    return Array.from(this.tabs.values())
      .map((tab) => {
        return {
          ...tab,
          assessment: assessTab({ 
            path: tab.path,
            bytes: tab.bytes,
            lastActivityAt: tab.lastActivityAt
          })
        }
      })
  }

  listAtRisk(nowMs?: number): TrackedTab[] {
    return Array.from(this.tabs.values())
      .map((tab) => {
        return {
          ...tab,
          assessment: assessTab({ 
            path: tab.path,
            bytes: tab.bytes,
            lastActivityAt: tab.lastActivityAt
          }, nowMs ?? Date.now())
        }
      })
      .filter((tab) => tab.assessment.atRisk)
  }
}