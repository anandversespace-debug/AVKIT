import path from "node:path";
import { describe, it, expect } from "vitest";
import { detectProjectContext } from "../../src/core/project/detector.js";

describe("Project Detector", () => {
  it("detects a Next.js project", async () => {
    const dir = path.resolve("tests/fixtures/nextjs-app");
    const ctx = await detectProjectContext(dir);
    expect(ctx.framework).toBe("nextjs");
    expect(ctx.projectName).toBe("nextjs-app");
    expect(ctx.language).toBe("javascript");
  });

  it("detects a Vite + React project with TypeScript", async () => {
    const dir = path.resolve("tests/fixtures/vite-react-app");
    const ctx = await detectProjectContext(dir);
    expect(ctx.framework).toBe("vite-react");
    expect(ctx.language).toBe("typescript");
  });

  it("detects a generic Node.js project", async () => {
    const dir = path.resolve("tests/fixtures/clean-node");
    const ctx = await detectProjectContext(dir);
    expect(ctx.framework).toBe("node");
    expect(ctx.projectName).toBe("clean-node-app");
  });

  it("detects multiple lockfiles in conflicting project", async () => {
    const dir = path.resolve("tests/fixtures/lockfile-conflict");
    const ctx = await detectProjectContext(dir);
    expect(ctx.lockfiles).toContain("package-lock.json");
    expect(ctx.lockfiles).toContain("pnpm-lock.yaml");
    expect(ctx.lockfiles.length).toBe(2);
  });

  it("auto-detects environment details (OS, architecture, runtime)", async () => {
    const dir = path.resolve("tests/fixtures/clean-node");
    const ctx = await detectProjectContext(dir);

    expect(ctx.environment).toBeDefined();
    expect(["windows", "macos", "linux", "unknown"]).toContain(ctx.environment.platform);
    expect(ctx.environment.arch).toBe(process.arch);
    expect(typeof ctx.environment.isCI).toBe("boolean");
    expect(typeof ctx.environment.nodeManager).toBe("string");
  });
});
