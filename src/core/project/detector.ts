import path from "node:path";
import { fileExists, readFileSafe, safeResolvePath } from "../../infrastructure/filesystem.js";
import { analyzePackageManager } from "./package-manager.js";
import { detectEnvironment } from "./environment.js";
import type { Framework, Language, ProjectContext } from "./context.js";

/**
 * Detects project framework, language, tooling, and environment details.
 */
export async function detectProjectContext(targetDir: string): Promise<ProjectContext> {
  const rootDirectory = path.resolve(targetDir);

  // 1. Read package.json if present
  let packageJson: Record<string, unknown> | null = null;
  let packageJsonRaw: string | null = null;
  let projectName = path.basename(rootDirectory);

  try {
    packageJsonRaw = await readFileSafe(rootDirectory, "package.json");
    if (packageJsonRaw) {
      packageJson = JSON.parse(packageJsonRaw);
      if (packageJson && typeof packageJson.name === "string" && packageJson.name.trim()) {
        projectName = packageJson.name.trim();
      }
    }
  } catch {
    // Malformed JSON will be reported by diagnostics
  }

  // 2. Package manager and lockfiles
  const pmAnalysis = analyzePackageManager(rootDirectory, packageJson);

  // 3. Language detection (TypeScript vs JavaScript)
  let language: Language = "javascript";
  const hasTsConfig = fileExists(path.join(rootDirectory, "tsconfig.json"));
  if (hasTsConfig) {
    language = "typescript";
  }

  // 4. Framework detection
  const deps = {
    ...((packageJson?.dependencies as Record<string, string>) || {}),
    ...((packageJson?.devDependencies as Record<string, string>) || {}),
  };

  let framework: Framework = "unknown";
  if (packageJson) {
    if (
      deps["next"] ||
      fileExists(path.join(rootDirectory, "next.config.js")) ||
      fileExists(path.join(rootDirectory, "next.config.mjs")) ||
      fileExists(path.join(rootDirectory, "next.config.ts"))
    ) {
      framework = "nextjs";
    } else if (
      (deps["vite"] && (deps["react"] || deps["react-dom"])) ||
      fileExists(path.join(rootDirectory, "vite.config.js")) ||
      fileExists(path.join(rootDirectory, "vite.config.ts")) ||
      fileExists(path.join(rootDirectory, "vite.config.mjs"))
    ) {
      framework = "vite-react";
    } else if (deps["express"]) {
      framework = "express";
    } else {
      framework = "node";
    }
  }

  // 5. Detected tools detection
  const detectedTools: string[] = [];
  if (deps["eslint"] || fileExists(path.join(rootDirectory, "eslint.config.js")) || fileExists(path.join(rootDirectory, ".eslintrc.json"))) {
    detectedTools.push("eslint");
  }
  if (deps["prettier"] || fileExists(path.join(rootDirectory, ".prettierrc")) || fileExists(path.join(rootDirectory, ".prettierrc.json"))) {
    detectedTools.push("prettier");
  }
  if (deps["vitest"] || fileExists(path.join(rootDirectory, "vitest.config.ts")) || fileExists(path.join(rootDirectory, "vitest.config.js"))) {
    detectedTools.push("vitest");
  }
  if (deps["husky"] || fileExists(path.join(rootDirectory, ".husky"))) {
    detectedTools.push("husky");
  }
  if (deps["lint-staged"]) {
    detectedTools.push("lint-staged");
  }

  // 6. Git presence
  const hasGit = fileExists(path.join(rootDirectory, ".git"));

  // 7. Auto-detect environment details (OS, architecture, CI, Node Manager, Monorepo)
  const environment = detectEnvironment(rootDirectory, packageJson);

  return {
    rootDirectory,
    projectName,
    framework,
    language,
    packageManager: pmAnalysis.primaryManager,
    nodeVersion: process.version,
    packageJson,
    packageJsonRaw,
    lockfiles: pmAnalysis.lockfiles,
    detectedTools,
    hasGit,
    environment,
  };
}
