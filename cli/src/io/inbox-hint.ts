import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const INBOX_PATH_FILE = "inbox-path.txt";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Resolve inbox root from TOKENFORGE_INBOX env or `.tokenforge/inbox-path.txt`. */
export async function resolveInboxRoot(root: string): Promise<string | null> {
  const fromEnv = process.env.TOKENFORGE_INBOX?.trim();
  if (fromEnv) {
    return resolve(fromEnv);
  }
  const hintPath = join(root, ".tokenforge", INBOX_PATH_FILE);
  if (!(await exists(hintPath))) {
    return null;
  }
  try {
    const raw = (await readFile(hintPath, "utf8")).trim();
    return raw.length > 0 ? resolve(raw) : null;
  } catch {
    return null;
  }
}

/** Human hint for scan/apply output: `{inbox}/{team}/{repo}/.tokenforge/`. */
export function formatInboxDropHint(inboxRoot: string, team: string, repo: string): string {
  const drop = join(inboxRoot, team, repo, ".tokenforge");
  return `inbox drop: ${drop}`;
}
