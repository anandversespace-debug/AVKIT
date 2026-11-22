import path from "node:path";
import { describe, it, expect } from "vitest";
import { detectProjectContext } from "../../src/core/project/detector.js";
import { runDiagnostics } from "../../src/core/diagnostics/engine.js";
import { registerDefaultRules } from "../../src/rules/index.js";
import { formatDoctor, formatInfo } from "../../src/ui/reporter.js";

describe("CLI Formatting and Reporting", () => {
  beforeEach(() => {
    registerDefaultRules();
  });

  it("produces valid JSON output for doctor", async () => {
    const dir = path.resolve("tests/fixtures/clean-node");
    const ctx = await detectProjectContext(dir);
    const report = await runDiagnostics(ctx);
    const jsonOutput = formatDoctor(report, { json: true });

    const parsed = JSON.parse(jsonOutput);
    expect(parsed.context.projectName).toBe("clean-node-app");
    expect(parsed.summary.errors).toBe(0);
    expect(parsed.summary.passed).toBeGreaterThanOrEqual(1);
  });

  it("produces valid JSON output for info", async () => {
    const dir = path.resolve("tests/fixtures/nextjs-app");
    const ctx = await detectProjectContext(dir);
    const jsonOutput = formatInfo(ctx, { json: true });

    const parsed = JSON.parse(jsonOutput);
    expect(parsed.projectName).toBe("nextjs-app");
    expect(parsed.framework).toBe("nextjs");
  });
});
