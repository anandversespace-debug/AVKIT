import path from "node:path";
import { fileExists, readFileSafe, safeResolvePath } from "../../infrastructure/filesystem.js";
import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";

export const gitHooksConfigRule: DiagnosticRule = {
  id: "GIT_HOOKS_CONFIG",
  name: "Git Hooks Configuration Validation",
  category: "git",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    const pkg = context.packageJson;
    const deps = {
      ...((pkg?.dependencies as Record<string, string>) || {}),
      ...((pkg?.devDependencies as Record<string, string>) || {}),
    };

    const diagnostics: Diagnostic[] = [];

    // 1. Check lint-staged configuration
    const hasLintStagedDep = Boolean(deps["lint-staged"]);
    const hasLintStagedInPkg = Boolean(pkg?.["lint-staged"]);
    const hasLintStagedFile =
      fileExists(path.join(context.rootDirectory, ".lintstagedrc")) ||
      fileExists(path.join(context.rootDirectory, ".lintstagedrc.json")) ||
      fileExists(path.join(context.rootDirectory, ".lintstagedrc.js")) ||
      fileExists(path.join(context.rootDirectory, ".lintstagedrc.mjs")) ||
      fileExists(path.join(context.rootDirectory, "lint-staged.config.js"));

    if (hasLintStagedDep && !hasLintStagedInPkg && !hasLintStagedFile) {
      diagnostics.push({
        id: "GIT_HOOKS_CONFIG",
        severity: "warning",
        title: "lint-staged is installed but has no configuration",
        description: "lint-staged is present in devDependencies, but no 'lint-staged' configuration exists in package.json or a .lintstagedrc file.",
        category: "git",
        file: "package.json",
        suggestion: "Add a 'lint-staged' configuration to package.json defining target file patterns and linters/formatters.",
        fixable: true,
      });
    }

    // 2. Check Husky setup if husky is installed
    const hasHuskyDep = Boolean(deps["husky"]);
    const huskyDir = path.join(context.rootDirectory, ".husky");
    const hasHuskyDir = fileExists(huskyDir);

    if (hasHuskyDep && context.hasGit && !hasHuskyDir) {
      diagnostics.push({
        id: "GIT_HOOKS_CONFIG",
        severity: "warning",
        title: "Husky is installed but .husky directory is missing",
        description: "Husky is listed in devDependencies, but the .husky directory was not found. Git hooks are likely not active.",
        category: "git",
        file: ".husky",
        suggestion: "Run 'npx husky init' to initialize Git hooks.",
        fixable: false,
      });
    }

    return diagnostics;
  },
};
