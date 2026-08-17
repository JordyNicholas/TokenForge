import { describe, expect, it } from "vitest";
import { classifyFiletype } from "./classify";

describe("classifyFiletype", () => {
  it("classifies lockfiles by basename", () => {
    expect(classifyFiletype("package-lock.json")).toBe("lockfile");
    expect(classifyFiletype("apps/api/yarn.lock")).toBe("lockfile");
    expect(classifyFiletype("pnpm-lock.yaml")).toBe("lockfile");
  });

  it("classifies generated dirs before filename", () => {
    expect(classifyFiletype("dist/bundle.js")).toBe("generated");
    expect(classifyFiletype("packages/app/build/index.js")).toBe("generated");
    expect(classifyFiletype("coverage/lcov.info")).toBe("generated");
  });

  it("classifies minified and source-map suffixes", () => {
    expect(classifyFiletype("vendor.min.js")).toBe("generated");
    expect(classifyFiletype("app.js.map")).toBe("generated");
  });

  it("classifies source vs config vs unknown", () => {
    expect(classifyFiletype("src/index.ts")).toBe("source");
    expect(classifyFiletype("config/app-settings.json")).toBe("config");
    expect(classifyFiletype("README.md")).toBe("unknown");
  });

  it("accepts Windows separators", () => {
    expect(classifyFiletype("dist\\out.js")).toBe("generated");
  });
});
