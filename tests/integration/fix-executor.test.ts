import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { describe, it, expect } from "vitest";
import { detectProjectContext } from "../../src/core/project/detector.js";
import { planFixes } from "../../src/core/fixes/planner.js";
import { executeFixPlan, ConcurrentModificationError } from "../../src/core/fixes/executor.js";
import { fixCommand } from "../../src/commands/fix.js";

async function createTempFixture(sourceDir: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "avkit-test-"));
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name);
    const destPath = path.join(tempDir, entry.name);
    if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }

  return tempDir;
}

describe("Fix Executor Integration & Safety", () => {
  it("dry-run produces zero writes and modifies no files", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/missing-prettier-config"));

    try {
      const ctx = await detectProjectContext(tempDir);
      const diags = [
        {
          id: "PRETTIER_CONFIG_MISSING",
          severity: "warning" as const,
          title: "Prettier config missing",
          description: "Missing",
          category: "linting",
          fixable: true,
        },
      ];

      const plan = planFixes(ctx, diags);
      const summary = await executeFixPlan(tempDir, plan, { dryRun: true });

      expect(summary.dryRun).toBe(true);
      expect(summary.appliedCount).toBe(1);

      // Verify .prettierrc.json was NOT written
      const exists = await fs
        .access(path.join(tempDir, ".prettierrc.json"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("applies planned fix safely and atomically", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/missing-prettier-config"));

    try {
      const ctx = await detectProjectContext(tempDir);
      const diags = [
        {
          id: "PRETTIER_CONFIG_MISSING",
          severity: "warning" as const,
          title: "Prettier config missing",
          description: "Missing",
          category: "linting",
          fixable: true,
        },
      ];

      const plan = planFixes(ctx, diags);
      const summary = await executeFixPlan(tempDir, plan, { dryRun: false });

      expect(summary.dryRun).toBe(false);
      expect(summary.appliedCount).toBe(1);
      expect(summary.failedCount).toBe(0);

      // Verify file now exists with correct content
      const content = await fs.readFile(path.join(tempDir, ".prettierrc.json"), "utf-8");
      expect(content).toContain('"semi": true');

      // Idempotency: Re-running fix plan will not overwrite unexpectedly
      const summary2 = await executeFixPlan(tempDir, plan, { dryRun: false });
      expect(summary2.failedCount).toBe(1); // Fails safely because file already exists
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("aborts when concurrent file modification occurs before applying", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/missing-prettier-config"));

    try {
      const ctx = await detectProjectContext(tempDir);
      const diags = [
        {
          id: "ENV_NODE_VERSION",
          severity: "info" as const,
          title: "Missing node engine",
          description: "Missing",
          category: "environment",
          fixable: true,
        },
      ];

      const plan = planFixes(ctx, diags);

      // Simulate concurrent modification of package.json on disk
      await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({ name: "concurrent-modified-app" }, null, 2),
        "utf-8"
      );

      const summary = await executeFixPlan(tempDir, plan, { dryRun: false });
      expect(summary.failedCount).toBe(1);
      expect(summary.results[0].error).toContain("Concurrent modification detected");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fixCommand CLI works cleanly with --dry-run and -y", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/missing-prettier-config"));

    try {
      // Test dry-run
      const dryExit = await fixCommand({ cwd: tempDir, dryRun: true });
      expect(dryExit).toBe(0);

      // Test applied fix with -y
      const applyExit = await fixCommand({ cwd: tempDir, yes: true });
      expect(applyExit).toBe(0);

      // Verify file was created
      const exists = await fs
        .access(path.join(tempDir, ".prettierrc.json"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
