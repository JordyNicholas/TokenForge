import { describe, expect, it } from "vitest";
import { collapseExclusionPaths } from "./collapse";

describe("collapseExclusionPaths", () => {
  it("collapses Prisma client files to a directory glob", () => {
    expect(
      collapseExclusionPaths([
        "package-lock.json",
        "src/shared/infra/database/client/models/Tenant.ts",
        "src/shared/infra/database/client/models/User.ts",
        "src/shared/infra/database/client/models/Report.ts",
        "src/shared/infra/database/client/internal/class.ts",
        "src/shared/infra/database/client/internal/prismaNamespace.ts",
        "src/shared/infra/database/client/commonInputTypes.ts",
      ]),
    ).toEqual([
      "package-lock.json",
      "src/shared/infra/database/client/**",
    ]);
  });

  it("leaves solitary paths alone", () => {
    expect(collapseExclusionPaths(["package-lock.json"])).toEqual([
      "package-lock.json",
    ]);
  });

  it("does not collapse unrelated pairs under src", () => {
    expect(
      collapseExclusionPaths([
        "src/a.ts",
        "src/b.ts",
        "package-lock.json",
      ]),
    ).toEqual(["package-lock.json", "src/a.ts", "src/b.ts"]);
  });

  it("never widens a repo-root directory that only holds stray assets", () => {
    // Two fonts and a flag under `core/` must not speak for the library source
    // that lives beside them.
    expect(
      collapseExclusionPaths([
        "core/fonts/geist-sans/Geist-Variable.ttf",
        "core/fonts/geist-mono/GeistMono-Variable.ttf",
        "core/img/flags/sa.svg",
      ]),
    ).toEqual([
      "core/fonts/geist-mono/GeistMono-Variable.ttf",
      "core/fonts/geist-sans/Geist-Variable.ttf",
      "core/img/flags/sa.svg",
    ]);
  });

  it("claims the deepest cluster instead of the shallowest heavy directory", () => {
    const paths = [
      "shared/static/emails/order.jpg",
      "shared/static/emails/welcome.jpg",
      "shared/static/emails/invoice.jpg",
      "shared/static/photos/team.jpg",
      "shared/static/photos/desk.jpg",
      "shared/static/photos/office.jpg",
      "shared/data/icons.json",
      "shared/data/free-illustrations.json",
    ];
    expect(collapseExclusionPaths(paths)).toEqual([
      "shared/data/free-illustrations.json",
      "shared/data/icons.json",
      "shared/static/emails/**",
      "shared/static/photos/**",
    ]);
  });

  it("keeps an ancestor from mopping up what deeper globs left behind", () => {
    const paths = [
      "assets/emails/a.jpg",
      "assets/emails/b.jpg",
      "assets/emails/c.jpg",
      "assets/one.png",
      "assets/two.png",
      "assets/three.png",
    ];
    // `assets/**` would also cover whatever is not in this list.
    expect(collapseExclusionPaths(paths)).toEqual([
      "assets/emails/**",
      "assets/one.png",
      "assets/three.png",
      "assets/two.png",
    ]);
  });

  it("still collapses a hinted tree wholesale from its outermost directory", () => {
    expect(
      collapseExclusionPaths([
        "dist/assets/a.js",
        "dist/assets/b.js",
        "dist/assets/c.js",
        "dist/index.js",
      ]),
    ).toEqual(["dist/**"]);
  });

  it("leaves a hinted directory with a single file as that file", () => {
    expect(
      collapseExclusionPaths(["dist/bundle.js", "package-lock.json"]),
    ).toEqual(["dist/bundle.js", "package-lock.json"]);
  });
});
