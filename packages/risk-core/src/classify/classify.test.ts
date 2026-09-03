import { describe, expect, it } from "vitest";
import { classifyFiletype } from "./classify";

describe("classifyFiletype", () => {
  it("classifies lockfiles by basename", () => {
    expect(classifyFiletype("package-lock.json")).toBe("lockfile");
    expect(classifyFiletype("apps/api/yarn.lock")).toBe("lockfile");
    expect(classifyFiletype("pnpm-lock.yaml")).toBe("lockfile");
  });

  it("classifies generated dirs before filename", () => {
    expect(classifyFiletype("dist/bundle.js")).toBe("build_artifact");
    expect(classifyFiletype("packages/app/build/index.js")).toBe("build_artifact");
    expect(classifyFiletype("coverage/lcov.info")).toBe("test_output");
  });

  it("classifies output-shape paths (#171)", () => {
    expect(classifyFiletype("test-results/junit.xml")).toBe("test_output");
    expect(classifyFiletype("playwright-report/index.html")).toBe("test_output");
    expect(classifyFiletype("logs/ci-pipeline.log")).toBe("ci_log");
    expect(classifyFiletype("ci.log")).toBe("ci_log");
    expect(classifyFiletype("artifacts/app.jar")).toBe("build_artifact");
    expect(classifyFiletype("release/app.whl")).toBe("build_artifact");
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

  it("classifies any generated/ tree as generated, API clients included", () => {
    expect(classifyFiletype("src/generated/graphql/schema.json")).toBe("generated");
    expect(classifyFiletype(".generated/api/client.ts")).toBe("generated");
  });

  it("accepts Windows separators", () => {
    expect(classifyFiletype("dist\\out.js")).toBe("build_artifact");
  });

  it("classifies rendered assets as media, whatever their size would be", () => {
    expect(classifyFiletype("shared/static/avatars/001.jpg")).toBe("media");
    expect(classifyFiletype("docs/assets/img/icons/package-astro.png")).toBe("media");
    expect(classifyFiletype("docs/assets/favicon.ico")).toBe("media");
    expect(classifyFiletype("core/fonts/geist-sans/Geist-Regular.woff2")).toBe("media");
    expect(classifyFiletype("core/fonts/geist-mono/GeistMono-Bold.ttf")).toBe("media");
    expect(classifyFiletype("marketing/promo.mp4")).toBe("media");
    expect(classifyFiletype("design/brand.fig")).toBe("media");
    expect(classifyFiletype("docs/whitepaper.pdf")).toBe("media");
  });

  it("classifies .svg as media, not config or unknown", () => {
    // The icon sets this class exists to catch are SVG: 260 flags in `core/img`,
    // 338 payment marks, 73 brand logos — every one of them under any size bar.
    expect(classifyFiletype("core/img/flags/sa.svg")).toBe("media");
    expect(classifyFiletype("shared/static/brands/netflix.svg")).toBe("media");
  });

  it("keeps output-shape and artifact classes ahead of media", () => {
    // A `.png` under `dist/` is build output first — that is the more useful
    // thing to tell an agent, and the copy differs per class.
    expect(classifyFiletype("dist/logo.png")).toBe("build_artifact");
    expect(classifyFiletype("coverage/badge.svg")).toBe("test_output");
    expect(classifyFiletype("node_modules/pkg/icon.png")).toBe("generated");
    expect(classifyFiletype("release/bundle.zip")).toBe("build_artifact");
  });
});
