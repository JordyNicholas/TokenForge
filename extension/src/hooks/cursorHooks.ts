import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const HOOKS_REL = ".cursor/hooks.json";
const SCRIPT_REL = ".cursor/hooks/tokenforge-shield-read.js";

const HOOKS_TEMPLATE = {
  version: 1,
  hooks: {
    beforeTabFileRead: [{ command: ".cursor/hooks/tokenforge-shield-read.js" }],
    stop: [{ command: ".cursor/hooks/tokenforge-post-turn.js" }],
  },
};

const POST_TURN_SCRIPT = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const input = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
const roots = input.workspace_roots || [process.cwd()];
const readPaths = input.read_paths || input.files_read || [];

for (const root of roots) {
  const logPath = path.join(root, ".tokenforge", "post-turn-paths.jsonl");
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const line = JSON.stringify({ at: new Date().toISOString(), readPaths }) + "\\n";
    fs.appendFileSync(logPath, line, "utf8");
  } catch {
    /* best effort */
  }
}
process.exit(0);
`;

/** Hook script: deny reads when path is in session-shield.json (best-effort). */
const HOOK_SCRIPT = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const input = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
const filePath = input.file_path || "";
const roots = input.workspace_roots || [process.cwd()];

function loadShielded(root) {
  const p = path.join(root, ".tokenforge", "session-shield.json");
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    return new Set((data.entries || []).map((e) => e.path));
  } catch {
    return new Set();
  }
}

for (const root of roots) {
  const rel = path.relative(root, filePath).replace(/\\\\/g, "/");
  const shielded = loadShielded(root);
  if (shielded.has(rel)) {
    process.stdout.write(JSON.stringify({ permission: "deny" }));
    process.exit(0);
  }
}
process.stdout.write(JSON.stringify({ permission: "allow" }));
process.exit(0);
`;

const POST_TURN_REL = ".cursor/hooks/tokenforge-post-turn.js";

export async function installCursorShieldHooks(root: string): Promise<void> {
  const hooksPath = join(root, HOOKS_REL);
  const scriptPath = join(root, SCRIPT_REL);
  const postTurnPath = join(root, POST_TURN_REL);
  await mkdir(join(root, ".cursor", "hooks"), { recursive: true });

  let existing = "";
  try {
    existing = await readFile(hooksPath, "utf8");
  } catch {
    /* create fresh */
  }

  if (!existing.includes("tokenforge-shield-read")) {
    await writeFile(hooksPath, `${JSON.stringify(HOOKS_TEMPLATE, null, 2)}\n`, "utf8");
  }
  await writeFile(scriptPath, HOOK_SCRIPT, { mode: 0o755 });
  await writeFile(postTurnPath, POST_TURN_SCRIPT, { mode: 0o755 });
}

export async function isCursorHooksInstalled(root: string): Promise<boolean> {
  try {
    const content = await readFile(join(root, HOOKS_REL), "utf8");
    return content.includes("tokenforge-shield-read");
  } catch {
    return false;
  }
}
