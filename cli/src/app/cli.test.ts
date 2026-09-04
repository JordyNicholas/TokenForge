import { describe, expect, it } from "vitest";
import { runCli } from "./cli";

function captureIo() {
  let stdout = "";
  let stderr = "";
  const io = {
    stdout: { write: (chunk: string) => { stdout += chunk; } },
    stderr: { write: (chunk: string) => { stderr += chunk; } },
  };
  return {
    io,
    get stdout() { return stdout; },
    get stderr() { return stderr; },
  };
}

describe("runCli help", () => {
  it("shows overview for --help", async () => {
    const captured = captureIo();
    const code = await runCli(["--help"], captured.io);

    expect(code).toBe(0);
    expect(captured.stdout).toContain("TokenForge");
    expect(captured.stdout).toContain("tokenforge scan");
    expect(captured.stdout).toContain("npm run tokenforge --");
  });

  it("shows overview for help command", async () => {
    const captured = captureIo();
    const code = await runCli(["help"], captured.io);

    expect(code).toBe(0);
    expect(captured.stdout).toContain("Commands:");
    expect(captured.stdout).toContain("discover");
  });

  it("shows overview when invoked with no arguments", async () => {
    const captured = captureIo();
    const code = await runCli([], captured.io);

    expect(code).toBe(0);
    expect(captured.stdout).toContain("Getting started:");
  });

  it("lists org-seed in overview help", async () => {
    const captured = captureIo();
    const code = await runCli(["--help"], captured.io);

    expect(code).toBe(0);
    expect(captured.stdout).toContain("org-seed");
  });

  it("shows command-specific help", async () => {
    const captured = captureIo();
    const code = await runCli(["help", "scan"], captured.io);

    expect(code).toBe(0);
    expect(captured.stdout).toContain("tokenforge scan");
    expect(captured.stdout).toContain("--mode heuristic | hybrid");
  });

  it("shows command-specific help for scan --help", async () => {
    const captured = captureIo();
    const code = await runCli(["scan", "--help"], captured.io);

    expect(code).toBe(0);
    expect(captured.stdout).toContain("tokenforge scan");
    expect(captured.stdout).not.toContain("org-pack");
  });

  it("points unknown commands at help", async () => {
    const captured = captureIo();
    const code = await runCli(["not-a-command"], captured.io);

    expect(code).toBe(2);
    expect(captured.stderr).toContain('Unknown command "not-a-command"');
    expect(captured.stderr).toContain("tokenforge --help");
  });
});
