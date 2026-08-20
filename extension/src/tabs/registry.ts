import { assessTab } from "./assessTab";
import type { TrackedTab } from "./types";

export interface InputSnapshot {
  path: string;
  bytes: number;
  focus?: boolean;
  edit?: boolean;
}

type ChangeListener = () => void;

export class TabRegistry {
  private tabs: Map<string, TrackedTab> = new Map();
  private readonly listeners = new Set<ChangeListener>();
  private activeUri: string | undefined;

  setActiveUri(uri: string | undefined, nowMs: number = Date.now()): void {
    if (this.activeUri === uri) {
      return;
    }
    this.activeUri = uri;
    if (this.tabs.size > 0) {
      this.refresh(nowMs);
    } else {
      this.notify();
    }
  }

  getActiveUri(): string | undefined {
    return this.activeUri;
  }

  upsert(uri: string, input: InputSnapshot, nowMs: number = Date.now()): TrackedTab {
    const existing = this.tabs.get(uri);
    let lastFocusAt = existing?.lastFocusAt ?? nowMs;
    let lastEditAt = existing?.lastEditAt ?? nowMs;

    if (input.focus) {
      lastFocusAt = nowMs;
      this.activeUri = uri;
    }
    if (input.edit) lastEditAt = nowMs;

    const lastActivityAt = Math.max(lastFocusAt, lastEditAt);
    const tab: TrackedTab = {
      uri,
      path: input.path,
      bytes: input.bytes,
      lastFocusAt,
      lastEditAt,
      lastActivityAt,
      assessment: assessTab(
        { path: input.path, bytes: input.bytes, lastActivityAt },
        nowMs,
        { background: this.activeUri !== uri },
      ),
    };

    this.tabs.set(uri, tab);
    // Rescore siblings when focus moves so background thresholds apply.
    if (input.focus) {
      for (const [otherUri, other] of this.tabs) {
        if (otherUri === uri) continue;
        this.tabs.set(otherUri, this.rescore(other, nowMs));
      }
    }
    this.notify();
    return tab;
  }

  remove(uri: string): void {
    if (!this.tabs.delete(uri)) {
      return;
    }
    if (this.activeUri === uri) {
      this.activeUri = undefined;
    }
    this.notify();
  }

  list(nowMs: number = Date.now()): readonly TrackedTab[] {
    return Array.from(this.tabs.values()).map((tab) => this.rescore(tab, nowMs));
  }

  listAtRisk(nowMs: number = Date.now()): TrackedTab[] {
    return this.list(nowMs).filter((tab) => tab.assessment.atRisk);
  }

  refresh(nowMs: number = Date.now()): void {
    if (this.tabs.size === 0) {
      return;
    }
    for (const [uri, tab] of this.tabs) {
      this.tabs.set(uri, this.rescore(tab, nowMs));
    }
    this.notify();
  }

  onDidChange(listener: ChangeListener): { dispose(): void } {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private rescore(tab: TrackedTab, nowMs: number): TrackedTab {
    return {
      ...tab,
      assessment: assessTab(
        { path: tab.path, bytes: tab.bytes, lastActivityAt: tab.lastActivityAt },
        nowMs,
        { background: this.activeUri !== tab.uri },
      ),
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
