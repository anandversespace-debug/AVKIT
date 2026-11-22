import path from "node:path";
import { describe, it, expect } from "vitest";
import { detectProjectContext } from "../../src/core/project/detector.js";
import { planFixes } from "../../src/core/fixes/planner.js";
import type { Diagnostic } from "../../src/core/diagnostics/types.js";

describe("Pure Fix Planner", () => {
  it("plans .prettierrc.json creation for PRETTIER_CONFIG_MISSING", async () => {
    const dir = path.resolve("tests/fixtures/missing-prettier-config");
    const ctx = await detectProjectContext(dir);

    const diagnostics: Diagnostic[] = [
      {
        id: "PRETTIER_CONFIG_MISSING",
        severity: "warning",
        title: "Prettier is installed but has no configuration file",
        description: "Missing .prettierrc.json",
        category: "linting",
        fixable: true,
      },
    ];

    const plan = planFixes(ctx, diagnostics);
    expect(plan.operations.length).toBe(1);
    expect(plan.operations[0].id).toBe("FIX_PRETTIER_CONFIG");
    expect(plan.operations[0].affectedFiles).toEqual([".prettierrc.json"]);
    expect(plan.operations[0].changes[0].type).toBe("create");
    expect(plan.operations[0].changes[0].newContent).toContain('"semi": true');
  });

  it("plans package.json update for missing node engine", async () => {
    const dir = path.resolve("tests/fixtures/missing-prettier-config");
    const ctx = await detectProjectContext(dir);

    const diagnostics: Diagnostic[] = [
      {
        id: "ENV_NODE_VERSION",
        severity: "info",
        title: "Node engines constraint missing",
        description: "No engines.node in package.json",
        category: "environment",
        fixable: true,
      },
    ];

    const plan = planFixes(ctx, diagnostics);
    expect(plan.operations.length).toBe(1);
    expect(plan.operations[0].id).toBe("FIX_NODE_ENGINE");
    expect(plan.operations[0].changes[0].newContent).toContain('"engines"');
    expect(plan.operations[0].changes[0].newContent).toContain('">=18.0.0"');
  });

  it("filters operations by specific diagnostic id", async () => {
    const dir = path.resolve("tests/fixtures/missing-prettier-config");
    const ctx = await detectProjectContext(dir);

    const diagnostics: Diagnostic[] = [
      {
        id: "PRETTIER_CONFIG_MISSING",
        severity: "warning",
        title: "Prettier missing",
        description: "Missing prettier",
        category: "linting",
        fixable: true,
      },
      {
        id: "ENV_NODE_VERSION",
        severity: "info",
        title: "Node engines missing",
        description: "Missing engines",
        category: "environment",
        fixable: true,
      },
    ];

    const plan = planFixes(ctx, diagnostics, "PRETTIER_CONFIG_MISSING");
    expect(plan.operations.length).toBe(1);
    expect(plan.operations[0].diagnosticId).toBe("PRETTIER_CONFIG_MISSING");
  });

  it("plans lint-staged configuration for GIT_HOOKS_CONFIG", async () => {
    const dir = path.resolve("tests/fixtures/missing-lint-staged");
    const ctx = await detectProjectContext(dir);

    const diagnostics: Diagnostic[] = [
      {
        id: "GIT_HOOKS_CONFIG",
        severity: "warning",
        title: "lint-staged missing config",
        description: "Missing",
        category: "git",
        fixable: true,
      },
    ];

    const plan = planFixes(ctx, diagnostics);
    expect(plan.operations.length).toBe(1);
    expect(plan.operations[0].id).toBe("FIX_LINT_STAGED_CONFIG");
    expect(plan.operations[0].changes[0].newContent).toContain('"lint-staged"');
  });
});
