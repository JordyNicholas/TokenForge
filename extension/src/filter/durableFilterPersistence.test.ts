import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DurableFilterPersistence,
  FILTER_DECISIONS_FILE,
} from "./durableFilterPersistence";

const isEnabled = vi.fn(() => true);

vi.mock("./durableFilterSettings", () => ({
  isDurableFilterEnabled: () => isEnabled(),
}));

describe("DurableFilterPersistence", () => {
  let root: string;
  let persistence: DurableFilterPersistence;

  beforeEach(async () => {
    root = join(tmpdir(), `tokenforge-durable-${Date.now()}`);
    await mkdir(root, { recursive: true });
    persistence = new DurableFilterPersistence();
    isEnabled.mockReturnValue(true);
  });

  afterEach(async () => {
    persistence.dispose();
    await rm(root, { recursive: true, force: true });
  });

  it("round-trips decisions through disk", async () => {
    await persistence.load(root);
    persistence.set("package-lock.json", "filtered");
    persistence.set("src/app.ts", "kept");
    await new Promise((resolve) => setTimeout(resolve, 900));

    const raw = await readFile(join(root, ".tokenforge", FILTER_DECISIONS_FILE), "utf8");
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      decisions: {
        "package-lock.json": "filtered",
        "src/app.ts": "kept",
      },
    });

    const reloaded = new DurableFilterPersistence();
    await reloaded.load(root);
    expect(reloaded.get("package-lock.json")).toBe("filtered");
    expect(reloaded.get("src/app.ts")).toBe("kept");
    reloaded.dispose();
  });

  it("remove clears a path and clearAll empties the file", async () => {
    await persistence.load(root);
    persistence.set("a.lock", "filtered");
    persistence.remove("a.lock");
    await new Promise((resolve) => setTimeout(resolve, 900));

    const reloaded = new DurableFilterPersistence();
    await reloaded.load(root);
    expect(reloaded.get("a.lock")).toBeUndefined();
    reloaded.dispose();
  });

  it("does not write when the setting is off", async () => {
    isEnabled.mockReturnValue(false);
    await persistence.load(root);
    persistence.set("package-lock.json", "filtered");
    await new Promise((resolve) => setTimeout(resolve, 900));

    await expect(
      readFile(join(root, ".tokenforge", FILTER_DECISIONS_FILE), "utf8"),
    ).rejects.toThrow();
  });
});
