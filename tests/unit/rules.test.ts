import path from "node:path";
import { describe, it, expect } from "vitest";
import { detectProjectContext } from "../../src/core/project/detector.js";
import { nodeVersionRule } from "../../src/rules/environment/node-version.js";
import { lockfileConflictRule } from "../../src/rules/dependencies/lockfile-conflict.js";
import { jsonInvalidRule } from "../../src/rules/configuration/json-invalid.js";

describe("Diagnostic Rules Suite (Phase 1)", () => {
  it("ENV_NODE_VERSION detects mismatch when runtime violates engines", async () => {
    const dir = path.resolve("tests/fixtures/node-version-mismatch");
    const ctx = await detectProjectContext(dir);
    const diags = await nodeVersionRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("ENV_NODE_VERSION");
    expect(diags[0].severity).toBe("error");
  });

  it("ENV_NODE_VERSION passes when engines are satisfied", async () => {
    const dir = path.resolve("tests/fixtures/clean-node");
    const ctx = await detectProjectContext(dir);
    const diags = await nodeVersionRule.check(ctx);

    expect(diags.length).toBe(0);
  });

  it("PKG_LOCKFILE_CONFLICT flags multiple competing lockfiles", async () => {
    const dir = path.resolve("tests/fixtures/lockfile-conflict");
    const ctx = await detectProjectContext(dir);
    const diags = await lockfileConflictRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("PKG_LOCKFILE_CONFLICT");
    expect(diags[0].severity).toBe("error");
    expect(diags[0].fixable).toBe(false);
  });

  it("CONFIG_JSON_INVALID detects malformed JSON syntax", async () => {
    const dir = path.resolve("tests/fixtures/invalid-json");
    const ctx = await detectProjectContext(dir);
    const diags = await jsonInvalidRule.check(ctx);

    expect(diags.length).toBe(1);
    expect(diags[0].id).toBe("CONFIG_JSON_INVALID");
    expect(diags[0].severity).toBe("error");
    expect(diags[0].file).toBe("package.json");
  });
});
