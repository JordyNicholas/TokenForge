import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import {
  hasGitRepository,
  hasProjectMarker,
  isEligibleWorkspaceRoot,
} from "./eligibility";

describe("workspace eligibility", () => {
  let root: string;

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects a git repository via .git/HEAD", async () => {
    root = join(tmpdir(), `tf-eligible-git-${Date.now()}`);
    await mkdir(join(root, ".git"), { recursive: true });
    await writeFile(join(root, ".git", "HEAD"), "ref: refs/heads/main\n", "utf8");

    expect(hasGitRepository(root)).toBe(true);
    expect(hasProjectMarker(root)).toBe(false);
    expect(isEligibleWorkspaceRoot(root, "auto")).toBe(true);
    expect(isEligibleWorkspaceRoot(root, "git-only")).toBe(true);
    expect(isEligibleWorkspaceRoot(root, "manifest-only")).toBe(false);
  });

  it("detects a project via root manifest markers", async () => {
    root = join(tmpdir(), `tf-eligible-manifest-${Date.now()}`);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "package.json"), "{}\n", "utf8");

    expect(hasGitRepository(root)).toBe(false);
    expect(hasProjectMarker(root)).toBe(true);
    expect(isEligibleWorkspaceRoot(root, "auto")).toBe(true);
    expect(isEligibleWorkspaceRoot(root, "manifest-only")).toBe(true);
    expect(isEligibleWorkspaceRoot(root, "git-only")).toBe(false);
  });

  it("treats arbitrary folders like Downloads as ineligible in auto mode", async () => {
    root = join(tmpdir(), `tf-eligible-downloads-${Date.now()}`);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "readme.txt"), "notes\n", "utf8");

    expect(isEligibleWorkspaceRoot(root, "auto")).toBe(false);
    expect(isEligibleWorkspaceRoot(root, "always")).toBe(true);
  });
});
