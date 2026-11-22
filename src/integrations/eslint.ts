import path from "node:path";
import { fileExists } from "../infrastructure/filesystem.js";
import type { ProjectContext } from "../core/project/context.js";
import type { ProposedFileChange } from "../core/fixes/types.js";
import type { IntegrationOption } from "./types.js";

export const eslintIntegration: IntegrationOption = {
  id: "eslint",
  name: "ESLint",
  description: "Linting with framework-recommended rules",
  isConfigured(context: ProjectContext): boolean {
    const pkg = context.packageJson;
    return (
      Boolean(pkg?.eslintConfig) ||
      fileExists(path.join(context.rootDirectory, "eslint.config.js")) ||
      fileExists(path.join(context.rootDirectory, "eslint.config.mjs")) ||
      fileExists(path.join(context.rootDirectory, ".eslintrc.json")) ||
      fileExists(path.join(context.rootDirectory, ".eslintrc.js"))
    );
  },
  generateChanges(context: ProjectContext): ProposedFileChange[] {
    const changes: ProposedFileChange[] = [];

    // Framework-specific ESLint config
    if (context.framework === "nextjs") {
      const nextEslintConfig = JSON.stringify(
        {
          extends: ["next/core-web-vitals"],
        },
        null,
        2
      ) + "\n";

      changes.push({
        relativePath: ".eslintrc.json",
        type: "create",
        description: "Create Next.js ESLint configuration (.eslintrc.json)",
        originalContent: null,
        newContent: nextEslintConfig,
        diffPreview: `+++ [New File: .eslintrc.json]\n` + nextEslintConfig.split("\n").map((l) => `+ ${l}`).join("\n"),
      });
    } else {
      const flatConfig = `import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn"
    }
  }
];
`;

      changes.push({
        relativePath: "eslint.config.js",
        type: "create",
        description: "Create modern flat eslint.config.js file",
        originalContent: null,
        newContent: flatConfig,
        diffPreview: `+++ [New File: eslint.config.js]\n` + flatConfig.split("\n").map((l) => `+ ${l}`).join("\n"),
      });
    }

    if (context.packageJsonRaw) {
      try {
        const pkg = JSON.parse(context.packageJsonRaw);
        pkg.scripts = pkg.scripts || {};
        const lintCmd = context.framework === "nextjs" ? "next lint" : "eslint .";

        if (!pkg.scripts["lint"]) {
          pkg.scripts["lint"] = lintCmd;
          const updatedPkg = JSON.stringify(pkg, null, 2) + "\n";
          changes.push({
            relativePath: "package.json",
            type: "modify",
            description: `Add 'lint': '${lintCmd}' script to package.json`,
            originalContent: context.packageJsonRaw,
            newContent: updatedPkg,
            diffPreview: `--- a/package.json\n+++ b/package.json\n+ "lint": "${lintCmd}"`,
          });
        }
      } catch {
        // Ignore
      }
    }

    return changes;
  },
};
