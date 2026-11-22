import path from "node:path";
import { fileExists } from "../infrastructure/filesystem.js";
import type { ProjectContext } from "../core/project/context.js";
import type { ProposedFileChange } from "../core/fixes/types.js";
import type { IntegrationOption } from "./types.js";

export const vitestIntegration: IntegrationOption = {
  id: "vitest",
  name: "Vitest",
  description: "Fast unit test framework with native ESM & TypeScript support",
  isConfigured(context: ProjectContext): boolean {
    return (
      fileExists(path.join(context.rootDirectory, "vitest.config.ts")) ||
      fileExists(path.join(context.rootDirectory, "vitest.config.js"))
    );
  },
  generateChanges(context: ProjectContext): ProposedFileChange[] {
    const changes: ProposedFileChange[] = [];
    const isTs = context.language === "typescript";
    const configFile = isTs ? "vitest.config.ts" : "vitest.config.js";

    const configContent = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
`;

    changes.push({
      relativePath: configFile,
      type: "create",
      description: `Create ${configFile} configuration`,
      originalContent: null,
      newContent: configContent,
      diffPreview: `+++ [New File: ${configFile}]\n` + configContent.split("\n").map((l) => `+ ${l}`).join("\n"),
    });

    if (context.packageJsonRaw) {
      try {
        const pkg = JSON.parse(context.packageJsonRaw);
        pkg.scripts = pkg.scripts || {};
        if (!pkg.scripts["test"]) {
          pkg.scripts["test"] = "vitest run";
          const updatedPkg = JSON.stringify(pkg, null, 2) + "\n";
          changes.push({
            relativePath: "package.json",
            type: "modify",
            description: "Add 'test' script to package.json",
            originalContent: context.packageJsonRaw,
            newContent: updatedPkg,
            diffPreview: `--- a/package.json\n+++ b/package.json\n+ "test": "vitest run"`,
          });
        }
      } catch {
        // Ignore
      }
    }

    return changes;
  },
};
