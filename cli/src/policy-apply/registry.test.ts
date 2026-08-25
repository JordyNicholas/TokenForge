import { describe, expect, it } from "vitest";
import { getPolicyApplyProvider } from "./registry";

describe("PolicyApply registry", () => {
  it("resolves fixture and live providers", async () => {
    const fixture = getPolicyApplyProvider("fixture");
    const result = await fixture.applyOrgPolicy({
      org: "demo",
      files: [{ path: "a.yml", contents: "x" }],
      exclusionPaths: ["dist/**"],
    });
    expect(result.status).toBe("applied");

    const copilot = getPolicyApplyProvider("copilot");
    expect(
      (
        await copilot.applyOrgPolicy({
          org: "acme",
          files: [],
          exclusionPaths: ["lock"],
        })
      ).status,
    ).toBe("manual");

    expect(
      (
        await getPolicyApplyProvider("cursor").applyOrgPolicy({
          org: "org_1",
          files: [],
          exclusionPaths: [],
        })
      ).status,
    ).toBe("unsupported");
  });

  it("rejects unknown providers", () => {
    expect(() => getPolicyApplyProvider("codex")).toThrow(/Unknown policy-apply/);
  });
});
