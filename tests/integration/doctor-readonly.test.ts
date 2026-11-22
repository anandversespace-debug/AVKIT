import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { detectProjectContext } from "../../src/core/project/detector.js";
import { runDiagnostics } from "../../src/core/diagnostics/engine.js";
import { registerDefaultRules } from "../../src/rules/index.js";

async function getDirectoryState(dir: string): Promise<Map<string, string>> {
  const state = new Map<string, string>();
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile()) {
      const content = await fs.readFile(fullPath);
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      state.set(entry.name, hash);
    }
  }

  return state;
}

describe("Doctor Read-Only Invariant Test", () => {
  it("doctor never alters, creates, or deletes any files during execution", async () => {
    registerDefaultRules();
    const testDirs = [
      path.resolve("tests/fixtures/clean-node"),
      path.resolve("tests/fixtures/nextjs-app"),
      path.resolve("tests/fixtures/lockfile-conflict"),
      path.resolve("tests/fixtures/invalid-json"),
    ];

    for (const dir of testDirs) {
      const beforeState = await getDirectoryState(dir);

      const ctx = await detectProjectContext(dir);
      await runDiagnostics(ctx);

      const afterState = await getDirectoryState(dir);

      expect(afterState.size).toBe(beforeState.size);
      for (const [file, hash] of beforeState.entries()) {
        expect(afterState.get(file)).toBe(hash);
      }
    }
  });
});
