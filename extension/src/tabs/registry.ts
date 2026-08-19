import { TrackedTab } from "./types";

interface InputSnapshot {
  path: string,
  bytes: number,
  focus?: boolean,
  edit?: boolean
}

export class TabRegistry {
  upsert(uri: string, input: InputSnapshot, nowMs?: number): TrackedTab;
  remove(uri: string): void;
  list(): readonly TrackedTab[];
  listAtRisk(nowMs?: number): TrackedTab[];
}