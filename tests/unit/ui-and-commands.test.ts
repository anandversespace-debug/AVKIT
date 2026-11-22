import path from "node:path";
import { describe, it, expect, vi } from "vitest";
import { formatDoctor, formatInfo } from "../../src/ui/reporter.js";
import { detectProjectContext } from "../../src/core/project/detector.js";
import { runDiagnostics } from "../../src/core/diagnostics/engine.js";
import { defaultRegistry } from "../../src/core/diagnostics/registry.js";
import { doctorCommand } from "../../src/commands/doctor.js";
import { infoCommand } from "../../src/commands/info.js";
import { createProgram } from "../../src/cli/program.js";
import { readJsonSafe } from "../../src/infrastructure/filesystem.js";
import { registerDefaultRules } from "../../src/rules/index.js";

describe("UI Reporter, Commands & Program", () => {
  beforeEach(() => {
    registerDefaultRules();
  });
  it("formats info for terminal correctly across frameworks", async () => {
    const cleanDir = path.resolve("tests/fixtures/clean-node");
    const nextDir = path.resolve("tests/fixtures/nextjs-app");
    const viteDir = path.resolve("tests/fixtures/vite-react-app");

    const cleanCtx = await detectProjectContext(cleanDir);
    const nextCtx = await detectProjectContext(nextDir);
    const viteCtx = await detectProjectContext(viteDir);

    const cleanOut = formatInfo(cleanCtx);
    expect(cleanOut).toContain("Generic Node.js");
    expect(cleanOut).toContain("JavaScript");

    const nextOut = formatInfo(nextCtx);
    expect(nextOut).toContain("Next.js");

    const viteOut = formatInfo(viteCtx);
    expect(viteOut).toContain("Vite + React");
    expect(viteOut).toContain("TypeScript");
  });

  it("formats doctor output in verbose, quiet, and default modes", async () => {
    const dir = path.resolve("tests/fixtures/lockfile-conflict");
    const ctx = await detectProjectContext(dir);
    const report = await runDiagnostics(ctx);

    const defaultOut = formatDoctor(report);
    expect(defaultOut).toContain("PKG_LOCKFILE_CONFLICT");
    expect(defaultOut).toContain("1 error");

    const verboseOut = formatDoctor(report, { verbose: true });
    expect(verboseOut).toContain("Remediation:");

    const quietOut = formatDoctor(report, { quiet: true });
    expect(quietOut).toContain("PKG_LOCKFILE_CONFLICT");
  });

  it("handles skipped rules and fixable suggestions in doctor output", async () => {
    const mockReport = {
      context: await detectProjectContext(path.resolve("tests/fixtures/clean-node")),
      results: [
        {
          ruleId: "MOCK_SKIPPED",
          status: "skipped" as const,
          message: "Precondition not met",
          diagnostics: [],
        },
        {
          ruleId: "MOCK_FIXABLE",
          status: "failed" as const,
          diagnostics: [
            {
              id: "MOCK_FIXABLE",
              severity: "warning" as const,
              title: "Fixable Warning",
              description: "This issue can be fixed automatically.",
              category: "linting",
              fixable: true,
            },
          ],
        },
      ],
      diagnostics: [
        {
          id: "MOCK_FIXABLE",
          severity: "warning" as const,
          title: "Fixable Warning",
          description: "This issue can be fixed automatically.",
          category: "linting",
          fixable: true,
        },
      ],
      summary: {
        errors: 0,
        warnings: 1,
        info: 0,
        passed: 0,
        skipped: 1,
      },
    };

    const formatted = formatDoctor(mockReport);
    expect(formatted).toContain("MOCK_SKIPPED");
    expect(formatted).toContain("Precondition not met");
    expect(formatted).toContain("avkit fix --dry-run");
  });

  it("executes infoCommand and doctorCommand cleanly", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await infoCommand({ cwd: path.resolve("tests/fixtures/clean-node") });
    expect(consoleSpy).toHaveBeenCalled();

    const cleanExit = await doctorCommand({ cwd: path.resolve("tests/fixtures/clean-node") });
    expect(cleanExit).toBe(0);

    const errExit = await doctorCommand({ cwd: path.resolve("tests/fixtures/lockfile-conflict") });
    expect(errExit).toBe(2);

    consoleSpy.mockRestore();
  });

  it("creates Commander program and has expected configuration", () => {
    const program = createProgram();
    expect(program.name()).toBe("avkit");
    expect(program.commands.some((c) => c.name() === "info")).toBe(true);
    expect(program.commands.some((c) => c.name() === "doctor")).toBe(true);
  });

  it("tests readJsonSafe utility", async () => {
    const dir = path.resolve("tests/fixtures/clean-node");
    const { data, error } = await readJsonSafe(dir, "package.json");
    expect(error).toBeNull();
    expect(data).toHaveProperty("name", "clean-node-app");

    const nonExistent = await readJsonSafe(dir, "missing.json");
    expect(nonExistent.data).toBeNull();
    expect(nonExistent.error).not.toBeNull();

    const invalid = await readJsonSafe(path.resolve("tests/fixtures/invalid-json"), "package.json");
    expect(invalid.data).toBeNull();
    expect(invalid.error).not.toBeNull();
  });

  it("guards registry against duplicate rule IDs", () => {
    const testRule = {
      id: "DUPLICATE_ID",
      name: "Test",
      category: "test",
      check: async () => [],
    };
    defaultRegistry.register(testRule);
    expect(() => defaultRegistry.register(testRule)).toThrow("Rule with ID 'DUPLICATE_ID' is already registered");
    expect(defaultRegistry.get("DUPLICATE_ID")).toBe(testRule);
  });
});
