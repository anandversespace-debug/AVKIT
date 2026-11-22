import path from "node:path";
import { fileExists } from "../infrastructure/filesystem.js";
import type { ProjectContext } from "../core/project/context.js";
import type { ProposedFileChange } from "../core/fixes/types.js";
import type { IntegrationOption } from "./types.js";

export const huskyIntegration: IntegrationOption = {
  id: "husky",
  name: "Husky",
  description: "Modern native Git hooks for automated pre-commit validation",
  isConfigured(context: ProjectContext): boolean {
    return fileExists(path.join(context.rootDirectory, ".husky"));
  },
  generateChanges(context: ProjectContext): ProposedFileChange[] {
    const changes: ProposedFileChange[] = [];

    const preCommitHook = `#!/usr/bin/env sh
npx lint-staged || npm test
`;

    changes.push({
      relativePath: path.join(".husky", "pre-commit"),
      type: "create",
      description: "Create .husky/pre-commit Git hook",
      originalContent: null,
      newContent: preCommitHook,
      diffPreview: `+++ [New File: .husky/pre-commit]\n+ #!/usr/bin/env sh\n+ npx lint-staged || npm test`,
    });

    if (context.packageJsonRaw) {
      try {
        const pkg = JSON.parse(context.packageJsonRaw);
        pkg.scripts = pkg.scripts || {};
        if (!pkg.scripts["prepare"]) {
          pkg.scripts["prepare"] = "husky";
          const updatedPkg = JSON.stringify(pkg, null, 2) + "\n";
          changes.push({
            relativePath: "package.json",
            type: "modify",
            description: "Add 'prepare': 'husky' script to package.json",
            originalContent: context.packageJsonRaw,
            newContent: updatedPkg,
            diffPreview: `--- a/package.json\n+++ b/package.json\n+ "prepare": "husky"`,
          });
        }
      } catch {
        // Ignore
      }
    }

    return changes;
  },
};
