import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SessionShieldEntry, SessionShieldFile } from "./types.js";
import { normalizeIgnorePattern } from "./ignore-merge.js";

export const SESSION_SHIELD_PATH = ".tokenforge/session-shield.json";

const EMPTY_SESSION_SHIELD: SessionShieldFile = {
  version: 1,
  entries: [],
};

/** Read `.tokenforge/session-shield.json`, returning an empty file when missing. */
export async function readSessionShield(root: string): Promise<SessionShieldFile> {
  const filePath = join(root, SESSION_SHIELD_PATH);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as SessionShieldFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      return { ...EMPTY_SESSION_SHIELD };
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...EMPTY_SESSION_SHIELD };
    }
    throw error;
  }
}

/** Persist session shield entries to `.tokenforge/session-shield.json`. */
export async function writeSessionShield(
  root: string,
  entries: readonly SessionShieldEntry[],
): Promise<void> {
  const filePath = join(root, SESSION_SHIELD_PATH);
  await mkdir(dirname(filePath), { recursive: true });
  const payload: SessionShieldFile = {
    version: 1,
    entries: [...entries],
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function upsertSessionShieldEntry(
  root: string,
  entry: SessionShieldEntry,
): Promise<void> {
  const normalizedPath = normalizeIgnorePattern(entry.path);
  const file = await readSessionShield(root);
  const entries = file.entries.filter((item) => item.path !== normalizedPath);
  entries.push({ ...entry, path: normalizedPath });
  await writeSessionShield(root, entries);
}

export async function removeSessionShieldEntry(
  root: string,
  path: string,
): Promise<void> {
  const normalizedPath = normalizeIgnorePattern(path);
  const file = await readSessionShield(root);
  await writeSessionShield(
    root,
    file.entries.filter((item) => item.path !== normalizedPath),
  );
}
