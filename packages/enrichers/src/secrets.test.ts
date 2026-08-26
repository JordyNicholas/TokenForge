import { describe, expect, it } from "vitest";
import { hasSecretContent } from "./secrets";

describe("hasSecretContent", () => {
  it("catches a private key in an innocuously named file", () => {
    expect(
      hasSecretContent(
        "-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----",
      ),
    ).toBe(true);
  });

  it("catches provider key formats", () => {
    expect(hasSecretContent('{"aws": "AKIAIOSFODNN7EXAMPLE"}')).toBe(true);
    expect(
      hasSecretContent("token=ghp_abcdefghijklmnopqrstuvwxyz0123456789"),
    ).toBe(true);
    expect(hasSecretContent("key: sk-abcdefghijklmnopqrstuvwxyz")).toBe(true);
  });

  it("catches a service-account JSON body", () => {
    expect(hasSecretContent('{\n  "private_key_id": "abc123",\n')).toBe(true);
  });

  it("catches an assigned secret with a plausible value", () => {
    expect(hasSecretContent('api_key: "a1b2c3d4e5f6g7h8i9j0"')).toBe(true);
    expect(hasSecretContent("client_secret = 'Zm9vYmFyYmF6cXV4MTIzNA=='")).toBe(
      true,
    );
  });

  it("does not fire on prose or short placeholder values", () => {
    // This product says "token" constantly — the word alone must not block.
    expect(
      hasSecretContent(
        "TokenForge estimates tokens per message and reports token bleed.",
      ),
    ).toBe(false);
    expect(hasSecretContent('api_key: "changeme"')).toBe(false);
    expect(hasSecretContent('{"tokensPerMessage": 8000}')).toBe(false);
  });

  it("treats an empty or unreadable excerpt as clean", () => {
    expect(hasSecretContent("")).toBe(false);
  });
});
