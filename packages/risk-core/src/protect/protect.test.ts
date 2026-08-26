import { describe, expect, it } from "vitest";
import {
  isApiContractPath,
  isAuxiliaryDataPath,
  isNecessaryGeneratedPath,
  isProtectedConfigPath,
  isSecretPath,
  protectionFor,
} from "./protect";

describe("isProtectedConfigPath", () => {
  it("matches build/lint config an agent needs", () => {
    expect(isProtectedConfigPath("tsconfig.json")).toBe(true);
    expect(isProtectedConfigPath("packages/api/tsconfig.build.json")).toBe(true);
    expect(isProtectedConfigPath(".eslintrc.json")).toBe(true);
    expect(isProtectedConfigPath("vite.config.ts")).toBe(true);
    expect(isProtectedConfigPath("config/feature-flags.json")).toBe(true);
    expect(isProtectedConfigPath("config/release-flags.json")).toBe(true);
  });

  it("does not match ordinary config", () => {
    expect(isProtectedConfigPath("config/app-settings.json")).toBe(false);
    expect(isProtectedConfigPath("config/locales.json")).toBe(false);
    expect(isProtectedConfigPath("package-lock.json")).toBe(false);
  });
});

describe("isApiContractPath", () => {
  it("matches OpenAPI / Swagger / AsyncAPI contracts in either format", () => {
    expect(isApiContractPath("openapi.json")).toBe(true);
    expect(isApiContractPath("docs/openapi.v2.yaml")).toBe(true);
    expect(isApiContractPath("swagger.yml")).toBe(true);
    expect(isApiContractPath("schema.graphql")).toBe(true);
  });

  it("does not match files that merely mention the API", () => {
    expect(isApiContractPath("src/openapi-client.ts")).toBe(false);
    expect(isApiContractPath("docs/api-guide.md")).toBe(false);
  });
});

describe("isNecessaryGeneratedPath", () => {
  it("requires a generated/<api-ish> pairing", () => {
    expect(isNecessaryGeneratedPath("src/generated/graphql/schema.json")).toBe(true);
    expect(isNecessaryGeneratedPath("generated/openapi/types.ts")).toBe(true);
    expect(isNecessaryGeneratedPath(".generated/api/client.ts")).toBe(true);
  });

  it("does not sweep in hand-written API code or plain build output", () => {
    // No `generated` segment — a hand-written GraphQL layer stays unprotected.
    expect(isNecessaryGeneratedPath("src/graphql/resolvers.ts")).toBe(false);
    // Generated, but not an API surface: compiled output stays high-risk.
    expect(isNecessaryGeneratedPath("generated/styles/theme.css")).toBe(false);
    expect(isNecessaryGeneratedPath("dist/bundle.js")).toBe(false);
  });
});

describe("isSecretPath", () => {
  it("matches credential-shaped names", () => {
    expect(isSecretPath(".env")).toBe(true);
    expect(isSecretPath(".env.production")).toBe(true);
    expect(isSecretPath("config/firebase-service-account.json")).toBe(true);
    expect(isSecretPath("deploy/credentials.json")).toBe(true);
    expect(isSecretPath("secrets.yaml")).toBe(true);
    expect(isSecretPath("certs/server.pem")).toBe(true);
    expect(isSecretPath("id_rsa")).toBe(true);
    expect(isSecretPath(".npmrc")).toBe(true);
  });

  it("does not match templates that only carry the shape of a secret", () => {
    expect(isSecretPath(".env.example")).toBe(false);
    expect(isSecretPath(".env.sample")).toBe(false);
    expect(isSecretPath("credentials.json.template")).toBe(false);
  });

  it("does not match ordinary paths", () => {
    expect(isSecretPath("src/auth/token.ts")).toBe(false);
    expect(isSecretPath("docs/secrets-policy.md")).toBe(false);
  });
});

describe("isAuxiliaryDataPath", () => {
  it("matches recognized fixture / mock trees by directory", () => {
    expect(isAuxiliaryDataPath("test/fixtures/user-a.json")).toBe(true);
    expect(isAuxiliaryDataPath("src/__mocks__/api.json")).toBe(true);
    expect(isAuxiliaryDataPath("test-data/orders.csv")).toBe(true);
  });

  it("ignores a file merely named like one", () => {
    expect(isAuxiliaryDataPath("src/fixtures.ts")).toBe(false);
    expect(isAuxiliaryDataPath("src/index.ts")).toBe(false);
  });
});

describe("protectionFor", () => {
  it("suppresses both exclusion drivers for a protected config", () => {
    expect(protectionFor("tsconfig.json")).toEqual({
      kind: "protected_config",
      suppresses: ["oversized", "high_risk_filetype"],
    });
  });

  it("suppresses only size for an API contract — a huge contract is still a contract", () => {
    expect(protectionFor("openapi.json")).toEqual({
      kind: "api_contract",
      suppresses: ["oversized"],
    });
  });

  it("suppresses only class for a necessary generated tree — size still counts", () => {
    expect(protectionFor("src/generated/graphql/schema.json")).toEqual({
      kind: "necessary_generated",
      suppresses: ["high_risk_filetype"],
    });
  });

  it("never suppresses inactive_tab — that stays the developer's Keep/Filter call", () => {
    for (const path of ["tsconfig.json", "openapi.json", "generated/api/client.ts"]) {
      expect(protectionFor(path)?.suppresses).not.toContain("inactive_tab");
    }
  });

  it("returns undefined for an ordinary path", () => {
    expect(protectionFor("src/index.ts")).toBeUndefined();
    expect(protectionFor("package-lock.json")).toBeUndefined();
  });
});
