import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const HOOKS_REL = ".cursor/hooks.json";
const SCRIPT_REL = ".cursor/hooks/tokenforge-shield-read.js";
const POST_TURN_REL = ".cursor/hooks/tokenforge-post-turn.js";
const POST_TURN_MARKER_REL = ".tokenforge/post-turn-enabled";

const SHIELD_READ_HOOK = ".cursor/hooks/tokenforge-shield-read.js";
const POST_TURN_HOOK = ".cursor/hooks/tokenforge-post-turn.js";

export type InstallCursorHooksOptions = {
  /** When true, install the post-turn observe hook and write the marker file. */
  postTurnLogging?: boolean;
};

const POST_TURN_SCRIPT = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const input = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
const roots = input.workspace_roots || [process.cwd()];
const readPaths = input.read_paths || input.files_read || [];

for (const root of roots) {
  const marker = path.join(root, ".tokenforge", "post-turn-enabled");
  if (!fs.existsSync(marker)) {
    continue;
  }
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

type HooksJson = {
  version?: number;
  hooks?: Record<string, Array<{ command: string }>>;
};

function hookCommands(hooks: HooksJson, name: string): Array<{ command: string }> {
  return hooks.hooks?.[name] ?? [];
}

function setHookCommands(
  hooks: HooksJson,
  name: string,
  commands: Array<{ command: string }>,
): void {
  hooks.hooks ??= {};
  if (commands.length === 0) {
    delete hooks.hooks[name];
    return;
  }
  hooks.hooks[name] = commands;
}

function mergeTokenForgeHooks(
  existing: HooksJson,
  postTurnLogging: boolean,
): HooksJson {
  const merged: HooksJson = {
    version: existing.version ?? 1,
    hooks: { ...existing.hooks },
  };

  const readHooks = hookCommands(merged, "beforeTabFileRead");
  if (!readHooks.some((entry) => entry.command.includes("tokenforge-shield-read"))) {
    readHooks.push({ command: SHIELD_READ_HOOK });
  }
  setHookCommands(merged, "beforeTabFileRead", readHooks);

  const stopHooks = hookCommands(merged, "stop").filter(
    (entry) => !entry.command.includes("tokenforge-post-turn"),
  );
  if (postTurnLogging) {
    stopHooks.push({ command: POST_TURN_HOOK });
  }
  setHookCommands(merged, "stop", stopHooks);

  if (merged.hooks && Object.keys(merged.hooks).length === 0) {
    delete merged.hooks;
  }

  return merged;
}

async function syncPostTurnMarker(root: string, enabled: boolean): Promise<void> {
  const markerPath = join(root, POST_TURN_MARKER_REL);
  if (enabled) {
    await mkdir(join(root, ".tokenforge"), { recursive: true });
    await writeFile(markerPath, `${new Date().toISOString()}\n`, "utf8");
    return;
  }
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(markerPath);
  } catch {
    /* absent */
  }
}

export async function installCursorShieldHooks(
  root: string,
  options: InstallCursorHooksOptions = {},
): Promise<void> {
  const postTurnLogging = options.postTurnLogging === true;
  const hooksPath = join(root, HOOKS_REL);
  const scriptPath = join(root, SCRIPT_REL);
  const postTurnPath = join(root, POST_TURN_REL);
  await mkdir(join(root, ".cursor", "hooks"), { recursive: true });

  let existing: HooksJson = { version: 1, hooks: {} };
  try {
    existing = JSON.parse(await readFile(hooksPath, "utf8")) as HooksJson;
  } catch {
    /* create fresh */
  }

  const merged = mergeTokenForgeHooks(existing, postTurnLogging);
  await writeFile(hooksPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  await writeFile(scriptPath, HOOK_SCRIPT, { mode: 0o755 });
  await writeFile(postTurnPath, POST_TURN_SCRIPT, { mode: 0o755 });
  await syncPostTurnMarker(root, postTurnLogging);
}

export async function isCursorHooksInstalled(root: string): Promise<boolean> {
  try {
    const content = await readFile(join(root, HOOKS_REL), "utf8");
    return content.includes("tokenforge-shield-read");
  } catch {
    return false;
  }
}
