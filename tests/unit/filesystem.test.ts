import path from "node:path";
import { describe, it, expect } from "vitest";
import { safeResolvePath, FilesystemSecurityError, fileExists, readFileSafe } from "../../src/infrastructure/filesystem.js";

describe("Filesystem Security & Utilities", () => {
  const fixtureRoot = path.resolve("tests/fixtures/clean-node");

  it("safely resolves child paths inside root", () => {
    const resolved = safeResolvePath(fixtureRoot, "package.json");
    expect(resolved).toBe(path.join(fixtureRoot, "package.json"));
  });

  it("throws FilesystemSecurityError when path traverses outside root", () => {
    expect(() => safeResolvePath(fixtureRoot, "../nextjs-app/package.json")).toThrow(
      FilesystemSecurityError
    );
  });

  it("correctly checks file existence and reads content", async () => {
    const exists = fileExists(path.join(fixtureRoot, "package.json"));
    expect(exists).toBe(true);

    const content = await readFileSafe(fixtureRoot, "package.json");
    expect(content).toContain("clean-node-app");
  });

  it("returns null for non-existent file", async () => {
    const content = await readFileSafe(fixtureRoot, "non-existent.txt");
    expect(content).toBeNull();
  });
});
