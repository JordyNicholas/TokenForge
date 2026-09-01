#!/usr/bin/env node
/**
 * Regenerate instruction files for fixtures/hybrid-eval-app using Cursor CLI.
 *
 * Usage: npm run tokenforge:generate-hybrid-eval-instructions
 * Requires: `agent` on PATH, logged in, --allow-external implied.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = join(repoRoot, "fixtures/hybrid-eval-app");
const briefPath = join(fixtureRoot, "GENERATION_BRIEF.md");
const model = process.env.TOKENFORGE_FIXTURE_LLM?.replace(/^cursor-cli:/, "") ?? "composer-2.5";

async function runAgent(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "agent",
      ["-p", "--output-format", "json", "--mode", "ask", "--trust", "--model", model, prompt],
      { cwd: fixtureRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `agent exit ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("agent output did not contain JSON");
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

/** Unwrap `agent -p --output-format json` (same envelope as cursor-cli enricher). */
function extractCursorPayload(stdout) {
  let envelope;
  try {
    envelope = extractJson(stdout);
  } catch {
    throw new Error("Cursor CLI did not return the expected --output-format json envelope");
  }
  if (
    envelope.is_error === true ||
    (typeof envelope.subtype === "string" && envelope.subtype !== "success")
  ) {
    const detail = typeof envelope.result === "string" ? envelope.result : "";
    throw new Error(detail.trim() || `Cursor CLI run failed (${envelope.subtype ?? "error"})`);
  }
  if (typeof envelope.result !== "string" || !envelope.result.trim()) {
    throw new Error("Cursor CLI returned an empty result");
  }
  return extractJson(envelope.result);
}

const REQUIRED_KEYS = [
  "agentsMd",
  "claudeMd",
  "copilotInstructionsMd",
  "cursorRulesMdc",
];

function assertPayload(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("agent JSON payload must be an object");
  }
  for (const key of REQUIRED_KEYS) {
    const value = payload[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`agent JSON missing or empty field: ${key}`);
    }
  }
  return payload;
}

async function main() {
  const brief = await readFile(briefPath, "utf8");
  const prompt = `Read this brief and return JSON only with keys agentsMd, claudeMd, copilotInstructionsMd, cursorRulesMdc (full file contents as strings).\n\n${brief}`;
  const stdout = await runAgent(prompt);
  const payload = assertPayload(extractCursorPayload(stdout));
  await mkdir(join(fixtureRoot, ".github"), { recursive: true });
  await mkdir(join(fixtureRoot, ".cursor/rules"), { recursive: true });
  await writeFile(join(fixtureRoot, "AGENTS.md"), payload.agentsMd, "utf8");
  await writeFile(join(fixtureRoot, "CLAUDE.md"), payload.claudeMd, "utf8");
  await writeFile(
    join(fixtureRoot, ".github/copilot-instructions.md"),
    payload.copilotInstructionsMd,
    "utf8",
  );
  await writeFile(
    join(fixtureRoot, ".cursor/rules/checkout-api.mdc"),
    payload.cursorRulesMdc,
    "utf8",
  );
  console.log("Wrote instruction files under fixtures/hybrid-eval-app/");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
