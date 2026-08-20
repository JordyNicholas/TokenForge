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

  it("classifies Prisma generated client trees", () => {
    expect(
      classifyFiletype(
        "src/shared/infra/database/client/models/Tenant.ts",
      ),
    ).toBe("generated");
    expect(
      classifyFiletype(
        "src/shared/infra/database/client/commonInputTypes.ts",
      ),
    ).toBe("generated");
    expect(classifyFiletype("node_modules/.prisma/client/index.js")).toBe(
      "generated",
    );
    expect(classifyFiletype("src/generated/prisma/client.ts")).toBe(
      "generated",
    );
    expect(classifyFiletype("prisma/generated/client/index.ts")).toBe(
      "generated",
    );
  });

  it("does not treat unrelated client paths as Prisma generated", () => {
    expect(classifyFiletype("src/infra/http/client/api.ts")).toBe("source");
    expect(classifyFiletype("packages/api-client/src/index.ts")).toBe("source");
  });

  it("accepts Windows separators", () => {
    expect(classifyFiletype("dist\\out.js")).toBe("generated");
  });
});
