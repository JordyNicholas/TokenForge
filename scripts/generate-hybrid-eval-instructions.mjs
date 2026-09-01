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

function extractJson(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("agent output did not contain JSON");
  }
  return JSON.parse(stdout.slice(start, end + 1));
}

async function main() {
  const brief = await readFile(briefPath, "utf8");
  const prompt = `Read this brief and return JSON only with keys agentsMd, claudeMd, copilotInstructionsMd, cursorRulesMdc (full file contents as strings).\n\n${brief}`;
  const stdout = await runAgent(prompt);
  const payload = extractJson(stdout.result ?? stdout);
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
