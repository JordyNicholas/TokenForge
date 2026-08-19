import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TextDocument, Uri } from "vscode";
import { describe, expect, it } from "vitest";
import { tabBytes } from "./tabBytes";

function mockDocument(
  overrides: Partial<TextDocument> & Pick<TextDocument, "getText">,
): TextDocument {
  return {
    isUntitled: false,
    isDirty: false,
    uri: { scheme: "file", fsPath: "/tmp/missing-file" } as Uri,
    ...overrides,
  } as TextDocument;
}

describe("tabBytes", () => {
  it("uses buffer length for untitled documents", () => {
    const doc = mockDocument({
      isUntitled: true,
      getText: () => "abc",
    });

    expect(tabBytes(doc)).toBe(3);
  });

  it("uses buffer length for dirty saved documents", () => {
    const dir = mkdtempSync(join(tmpdir(), "tokenforge-tab-bytes-"));
    const filePath = join(dir, "dirty.ts");
    writeFileSync(filePath, "disk");

    try {
      const doc = mockDocument({
        isDirty: true,
        uri: { scheme: "file", fsPath: filePath } as Uri,
        getText: () => "buffer-content",
      });

      expect(tabBytes(doc)).toBe(Buffer.byteLength("buffer-content", "utf8"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("uses fs.stat size for clean on-disk file documents", () => {
    const dir = mkdtempSync(join(tmpdir(), "tokenforge-tab-bytes-"));
    const filePath = join(dir, "saved.ts");
    writeFileSync(filePath, "hello");

    try {
      const doc = mockDocument({
        uri: { scheme: "file", fsPath: filePath } as Uri,
        getText: () => {
          throw new Error("getText should not be called for clean on-disk tabs");
        },
      });

      expect(tabBytes(doc)).toBe(5);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("falls back to buffer length when stat fails", () => {
    const doc = mockDocument({
      uri: { scheme: "file", fsPath: "/tmp/does-not-exist-tokenforge" } as Uri,
      getText: () => "fallback",
    });

    expect(tabBytes(doc)).toBe(8);
  });

  it("falls back to buffer length for non-file schemes", () => {
    const doc = mockDocument({
      uri: { scheme: "git", fsPath: "/repo/file.ts" } as Uri,
      getText: () => "git-doc",
    });

    expect(tabBytes(doc)).toBe(7);
  });
});
