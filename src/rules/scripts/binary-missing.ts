import path from "node:path";
import { fileExists } from "../../infrastructure/filesystem.js";
import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";

const SYSTEM_BINARIES = new Set([
  "node",
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "npx",
  "echo",
  "rimraf",
  "mkdir",
  "rm",
  "sh",
  "bash",
]);

export const scriptBinaryMissingRule: DiagnosticRule = {
  id: "SCRIPT_BINARY_MISSING",
  name: "Missing Script Binary Check",
  category: "scripts",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    const pkg = context.packageJson;
    if (!pkg || typeof pkg.scripts !== "object" || pkg.scripts === null) {
      return [];
    }

    const nodeModulesBin = path.join(context.rootDirectory, "node_modules", ".bin");
    const nodeModulesExist = fileExists(path.join(context.rootDirectory, "node_modules"));

    const deps = {
      ...((pkg.dependencies as Record<string, string>) || {}),
      ...((pkg.devDependencies as Record<string, string>) || {}),
    };

    const diagnostics: Diagnostic[] = [];
    const scripts = pkg.scripts as Record<string, string>;

    for (const [scriptName, command] of Object.entries(scripts)) {
      if (typeof command !== "string" || !command.trim()) continue;

      // Extract first binary token (e.g. "eslint" from "eslint . --fix" or "cross-env" from "cross-env NODE_ENV=dev")
      const tokens = command.trim().split(/\s+/);
      let binaryName = tokens[0];

      // Handle common wrappers like 'cross-env FOO=bar binary'
      if (binaryName === "cross-env" && tokens.length > 2) {
        for (let i = 1; i < tokens.length; i++) {
          if (!tokens[i].includes("=")) {
            binaryName = tokens[i];
            break;
          }
        }
      }

      if (SYSTEM_BINARIES.has(binaryName) || binaryName.startsWith("./") || binaryName.startsWith("../")) {
        continue;
      }

      let binaryFound = false;

      if (nodeModulesExist) {
        const possiblePaths = [
          path.join(nodeModulesBin, binaryName),
          path.join(nodeModulesBin, `${binaryName}.cmd`),
          path.join(nodeModulesBin, `${binaryName}.ps1`),
        ];

        binaryFound = possiblePaths.some((p) => {
          try {
            return fileExists(p);
          } catch {
            return false;
          }
        });
      } else {
        // If node_modules does not exist, check if binary is declared in project dependencies
        binaryFound = Boolean(deps[binaryName]);
      }

      if (!binaryFound) {
        diagnostics.push({
          id: "SCRIPT_BINARY_MISSING",
          severity: "warning",
          title: `Script '${scriptName}' references missing binary '${binaryName}'`,
          description: `The npm script "${scriptName}": "${command}" references command '${binaryName}', which is not installed in node_modules/.bin.`,
          category: "scripts",
          file: "package.json",
          suggestion: `Install '${binaryName}' as a dependency or devDependency using '${context.packageManager} add -D ${binaryName}'.`,
          fixable: false,
        });
      }
    }

    return diagnostics;
  },
};
