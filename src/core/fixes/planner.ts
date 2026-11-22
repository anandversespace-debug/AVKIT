import type { ProjectContext } from "../project/context.js";
import type { Diagnostic } from "../diagnostics/types.js";
import type { FixOperation, FixPlan, ProposedFileChange } from "./types.js";

/**
 * Creates a readable text diff preview for console display.
 */
function generateDiffPreview(
  filePath: string,
  original: string | null,
  updated: string
): string {
  if (original === null) {
    return `+++ [New File: ${filePath}]\n` + updated.split("\n").map((l) => `+ ${l}`).join("\n");
  }

  const origLines = original.split("\n");
  const newLines = updated.split("\n");

  const diff: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

  // Simple line-level preview
  for (let i = 0; i < Math.max(origLines.length, newLines.length); i++) {
    const origLine = origLines[i];
    const newLine = newLines[i];

    if (origLine !== newLine) {
      if (origLine !== undefined) diff.push(`- ${origLine}`);
      if (newLine !== undefined) diff.push(`+ ${newLine}`);
    }
  }

  return diff.join("\n");
}

/**
 * Pure Fix Planner: Evaluates diagnostics and produces a safe remediation plan
 * with exact file diffs without touching the filesystem.
 */
export function planFixes(
  context: ProjectContext,
  diagnostics: Diagnostic[],
  filterId?: string
): FixPlan {
  const operations: FixOperation[] = [];
  const affectedFilesSet = new Set<string>();

  for (const diag of diagnostics) {
    if (!diag.fixable) continue;
    if (filterId && diag.id !== filterId) continue;

    // Recipe 1: Missing Prettier Configuration
    if (diag.id === "PRETTIER_CONFIG_MISSING") {
      const prettierConfig = JSON.stringify(
        {
          semi: true,
          singleQuote: false,
          tabWidth: 2,
          trailingComma: "es5",
        },
        null,
        2
      ) + "\n";

      const change: ProposedFileChange = {
        relativePath: ".prettierrc.json",
        type: "create",
        description: "Generate standard Prettier configuration file",
        originalContent: null,
        newContent: prettierConfig,
        diffPreview: generateDiffPreview(".prettierrc.json", null, prettierConfig),
      };

      operations.push({
        id: "FIX_PRETTIER_CONFIG",
        diagnosticId: diag.id,
        title: "Create standard .prettierrc.json",
        description: "Add a default Prettier configuration with 2 spaces and semicolons enabled.",
        risk: "low",
        affectedFiles: [".prettierrc.json"],
        changes: [change],
        requiresConfirmation: true,
      });

      affectedFilesSet.add(".prettierrc.json");
    }

    // Recipe 2: Missing Node.js engines specification
    if (diag.id === "ENV_NODE_VERSION" && context.packageJsonRaw) {
      try {
        const pkg = JSON.parse(context.packageJsonRaw);
        if (!pkg.engines || !pkg.engines.node) {
          pkg.engines = {
            ...(pkg.engines || {}),
            node: ">=18.0.0",
          };

          const newPkgRaw = JSON.stringify(pkg, null, 2) + "\n";
          const change: ProposedFileChange = {
            relativePath: "package.json",
            type: "modify",
            description: "Add node engine compatibility constraint (>=18.0.0)",
            originalContent: context.packageJsonRaw,
            newContent: newPkgRaw,
            diffPreview: generateDiffPreview("package.json", context.packageJsonRaw, newPkgRaw),
          };

          operations.push({
            id: "FIX_NODE_ENGINE",
            diagnosticId: diag.id,
            title: "Add engines.node constraint to package.json",
            description: "Explicitly declare 'node: >=18.0.0' under 'engines' in package.json.",
            risk: "low",
            affectedFiles: ["package.json"],
            changes: [change],
            requiresConfirmation: true,
          });

          affectedFilesSet.add("package.json");
        }
      } catch {
        // Skip on malformed JSON
      }
    }

    // Recipe 3: Missing lint-staged configuration in package.json
    if (diag.id === "GIT_HOOKS_CONFIG" && context.packageJsonRaw) {
      try {
        const pkg = JSON.parse(context.packageJsonRaw);
        if (!pkg["lint-staged"]) {
          pkg["lint-staged"] = {
            "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
          };

          const newPkgRaw = JSON.stringify(pkg, null, 2) + "\n";
          const change: ProposedFileChange = {
            relativePath: "package.json",
            type: "modify",
            description: "Add standard lint-staged configuration to package.json",
            originalContent: context.packageJsonRaw,
            newContent: newPkgRaw,
            diffPreview: generateDiffPreview("package.json", context.packageJsonRaw, newPkgRaw),
          };

          operations.push({
            id: "FIX_LINT_STAGED_CONFIG",
            diagnosticId: diag.id,
            title: "Add lint-staged configuration to package.json",
            description: "Add automated linting and formatting hooks for staged JS/TS files.",
            risk: "low",
            affectedFiles: ["package.json"],
            changes: [change],
            requiresConfirmation: true,
          });

          affectedFilesSet.add("package.json");
        }
      } catch {
        // Skip on malformed JSON
      }
    }
  }

  return {
    operations,
    affectedFiles: Array.from(affectedFilesSet),
    hasHighRisk: operations.some((o) => o.risk === "high"),
  };
}
