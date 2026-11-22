import path from "node:path";
import { describe, it, expect } from "vitest";
import { detectProjectContext } from "../../src/core/project/detector.js";
import { packageManagerMismatchRule } from "../../src/rules/dependencies/manager-mismatch.js";
import { tsconfigInvalidRule } from "../../src/rules/typescript/tsconfig-syntax.js";
import { scriptBinaryMissingRule } from "../../src/rules/scripts/binary-missing.js";
import { envExampleRule } from "../../src/rules/configuration/env-example.js";
import { gitHooksConfigRule } from "../../src/rules/git/hooks-config.js";
import { prettierConfigRule } from "../../src/rules/linting/prettier-config.js";

describe("Phase 2 Diagnostic Rules Suite", () => {
  it("PKG_MANAGER_MISMATCH detects contradiction between packageManager field and lockfile", async () => {
    const dir = path.resolve("tests/fixtures/package-manager-mismatch");
    const ctx = await detectProjectContext(dir);
    const diags = await packageManagerMismatchRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("PKG_MANAGER_MISMATCH");
    expect(diags[0].severity).toBe("error");
    expect(diags[0].description).toContain("yarn@1.22.22");
  });

  it("TSCONFIG_INVALID detects malformed jsonc syntax", async () => {
    const dir = path.resolve("tests/fixtures/invalid-tsconfig");
    const ctx = await detectProjectContext(dir);
    const diags = await tsconfigInvalidRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("TSCONFIG_INVALID");
    expect(diags[0].severity).toBe("error");
  });

  it("SCRIPT_BINARY_MISSING flags script calling nonexistent binary", async () => {
    const dir = path.resolve("tests/fixtures/script-binary-missing");
    const ctx = await detectProjectContext(dir);
    const diags = await scriptBinaryMissingRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("SCRIPT_BINARY_MISSING");
    expect(diags[0].description).toContain("nonexistent-bundler");
  });

  it("ENV_EXAMPLE_MISSING identifies missing env keys without exposing values", async () => {
    const dir = path.resolve("tests/fixtures/env-example-missing");
    const ctx = await detectProjectContext(dir);
    const diags = await envExampleRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("ENV_EXAMPLE_MISSING");
    expect(diags[0].severity).toBe("warning");

    // Security check: variable names are included, but NO values (e.g. postgres:// or passwords)
    expect(diags[0].description).toContain("API_SECRET_KEY");
    expect(diags[0].description).toContain("PORT");
    expect(diags[0].description).not.toContain("postgres://");
    expect(diags[0].description).not.toContain("3000");
  });

  it("GIT_HOOKS_CONFIG detects lint-staged dependency without config", async () => {
    const dir = path.resolve("tests/fixtures/missing-lint-staged");
    const ctx = await detectProjectContext(dir);
    const diags = await gitHooksConfigRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("GIT_HOOKS_CONFIG");
    expect(diags[0].fixable).toBe(true);
  });

  it("GIT_HOOKS_CONFIG detects missing .husky directory when husky is installed", async () => {
    const mockCtx = {
      rootDirectory: path.resolve("tests/fixtures/clean-node"),
      projectName: "mock-husky-app",
      framework: "node" as const,
      language: "javascript" as const,
      packageManager: "npm" as const,
      nodeVersion: "v20.0.0",
      packageJson: {
        devDependencies: {
          husky: "^9.0.0",
        },
      },
      packageJsonRaw: null,
      lockfiles: [],
      detectedTools: ["husky"],
      hasGit: true,
    };

    const diags = await gitHooksConfigRule.check(mockCtx);
    expect(diags.length).toBe(1);
    expect(diags[0].title).toContain("Husky is installed but .husky directory is missing");
  });

  it("PRETTIER_CONFIG_MISSING detects installed prettier without config file", async () => {
    const dir = path.resolve("tests/fixtures/missing-prettier-config");
    const ctx = await detectProjectContext(dir);
    const diags = await prettierConfigRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("PRETTIER_CONFIG_MISSING");
    expect(diags[0].fixable).toBe(true);
  });
});
