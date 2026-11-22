import path from "node:path";
import { fileExists } from "../infrastructure/filesystem.js";
import type { ProjectContext } from "../core/project/context.js";
import type { ProposedFileChange } from "../core/fixes/types.js";
import type { IntegrationOption } from "./types.js";

export const prettierIntegration: IntegrationOption = {
  id: "prettier",
  name: "Prettier",
  description: "Code formatting with opinionated defaults",
  isConfigured(context: ProjectContext): boolean {
    const pkg = context.packageJson;
    return (
      Boolean(pkg?.prettier) ||
      fileExists(path.join(context.rootDirectory, ".prettierrc")) ||
      fileExists(path.join(context.rootDirectory, ".prettierrc.json")) ||
      fileExists(path.join(context.rootDirectory, "prettier.config.js"))
    );
  },
  generateChanges(context: ProjectContext): ProposedFileChange[] {
    const changes: ProposedFileChange[] = [];

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

    changes.push({
      relativePath: ".prettierrc.json",
      type: "create",
      description: "Create .prettierrc.json formatting configuration",
      originalContent: null,
      newContent: prettierConfig,
      diffPreview: `+++ [New File: .prettierrc.json]\n` + prettierConfig.split("\n").map((l) => `+ ${l}`).join("\n"),
    });

    if (context.packageJsonRaw) {
      try {
        const pkg = JSON.parse(context.packageJsonRaw);
        pkg.scripts = pkg.scripts || {};
        if (!pkg.scripts["format"]) {
          pkg.scripts["format"] = "prettier --write .";
          const updatedPkg = JSON.stringify(pkg, null, 2) + "\n";
          changes.push({
            relativePath: "package.json",
            type: "modify",
            description: "Add 'format' script to package.json",
            originalContent: context.packageJsonRaw,
            newContent: updatedPkg,
            diffPreview: `--- a/package.json\n+++ b/package.json\n+ "format": "prettier --write ."`,
          });
        }
      } catch {
        // Ignore
      }
    }

    return changes;
  },
};
