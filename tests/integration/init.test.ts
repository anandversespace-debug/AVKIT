import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { describe, it, expect } from "vitest";
import { initCommand } from "../../src/commands/init.js";

async function createTempFixture(sourceDir: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "avkit-init-test-"));
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

describe("Init Command & Tool Integration", () => {
  it("init --dry-run previews changes without writing files", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/clean-node"));

    try {
      const exitCode = await initCommand({
        cwd: tempDir,
        tools: "prettier",
        dryRun: true,
      });

      expect(exitCode).toBe(0);

      // Verify .prettierrc.json was NOT created
      const exists = await fs
        .access(path.join(tempDir, ".prettierrc.json"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("safeguards against non-interactive execution without explicit flags", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/clean-node"));

    try {
      // In vitest, process.stdin.isTTY is false/undefined
      const exitCode = await initCommand({
        cwd: tempDir,
      });

      expect(exitCode).toBe(3); // Code 3: Invalid usage in non-interactive environment
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("applies requested integrations with --yes", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/clean-node"));

    try {
      const exitCode = await initCommand({
        cwd: tempDir,
        tools: "prettier,vitest",
        yes: true,
      });

      expect(exitCode).toBe(0);

      // Verify files were created
      const prettierExists = await fs
        .access(path.join(tempDir, ".prettierrc.json"))
        .then(() => true)
        .catch(() => false);
      const vitestExists = await fs
        .access(path.join(tempDir, "vitest.config.js"))
        .then(() => true)
        .catch(() => false);

      expect(prettierExists).toBe(true);
      expect(vitestExists).toBe(true);

      // Verify package.json scripts were updated
      const pkgContent = await fs.readFile(path.join(tempDir, "package.json"), "utf-8");
      const pkg = JSON.parse(pkgContent);
      expect(pkg.scripts?.format).toBe("prettier --write .");
      expect(pkg.scripts?.test).toBe("vitest run");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("configures framework-specific ESLint for Next.js", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/nextjs-app"));

    try {
      const exitCode = await initCommand({
        cwd: tempDir,
        tools: "eslint",
        yes: true,
      });

      expect(exitCode).toBe(0);

      const eslintContent = await fs.readFile(path.join(tempDir, ".eslintrc.json"), "utf-8");
      expect(eslintContent).toContain("next/core-web-vitals");

      const pkgContent = await fs.readFile(path.join(tempDir, "package.json"), "utf-8");
      const pkg = JSON.parse(pkgContent);
      expect(pkg.scripts?.lint).toBe("next lint");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("configures Husky git hooks", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/clean-node"));

    try {
      const exitCode = await initCommand({
        cwd: tempDir,
        tools: "husky",
        yes: true,
      });

      expect(exitCode).toBe(0);

      const hookExists = await fs
        .access(path.join(tempDir, ".husky", "pre-commit"))
        .then(() => true)
        .catch(() => false);
      expect(hookExists).toBe(true);

      const pkgContent = await fs.readFile(path.join(tempDir, "package.json"), "utf-8");
      const pkg = JSON.parse(pkgContent);
      expect(pkg.scripts?.prepare).toBe("husky");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("reports when all tools are already configured", async () => {
    const tempDir = await createTempFixture(path.resolve("tests/fixtures/clean-node"));

    try {
      // First pass: install all tools
      await initCommand({
        cwd: tempDir,
        tools: "prettier,eslint,vitest,husky",
        yes: true,
      });

      // Second pass: all are configured
      const exitCode = await initCommand({
        cwd: tempDir,
        yes: true,
      });

      expect(exitCode).toBe(0);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
