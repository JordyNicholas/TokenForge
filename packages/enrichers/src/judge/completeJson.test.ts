import { describe, expect, it } from "vitest";
import { completeJson } from "./completeJson";

describe("completeJson", () => {
  it("refuses noop", async () => {
    await expect(
      completeJson({
        backend: "noop",
        model: "none",
        prompt: "{}",
      }),
    ).rejects.toThrow(/noop/);
  });

  it("refuses unsupported backends so callers keep the heuristic path", async () => {
    await expect(
      completeJson({
        backend: "anthropic",
        model: "claude",
        prompt: "{}",
      }),
    ).rejects.toThrow(/not supported yet/);
  });
});
