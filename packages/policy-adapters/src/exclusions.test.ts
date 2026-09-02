import { describe, expect, it } from "vitest";
import { collapseExclusionPaths } from "./exclusions";

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
});
