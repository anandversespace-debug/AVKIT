import path from "node:path";
import { fileExists, readFileSafe, safeResolvePath } from "../../infrastructure/filesystem.js";
import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";

const CANDIDATE_JSON_FILES = [
  "package.json",
  ".eslintrc.json",
  ".prettierrc.json",
  "nest-cli.json",
  "components.json",
];

export const jsonInvalidRule: DiagnosticRule = {
  id: "CONFIG_JSON_INVALID",
  name: "JSON Configuration Syntax Validation",
  category: "configuration",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    for (const filename of CANDIDATE_JSON_FILES) {
      try {
        const fullPath = safeResolvePath(context.rootDirectory, filename);
        if (!fileExists(fullPath)) continue;

        const content = await readFileSafe(context.rootDirectory, filename);
        if (content === null) continue;

        try {
          JSON.parse(content);
        } catch (err) {
          diagnostics.push({
            id: "CONFIG_JSON_INVALID",
            severity: "error",
            title: `Invalid JSON syntax in ${filename}`,
            description: `Syntax error parsing ${filename}: ${err instanceof Error ? err.message : String(err)}`,
            category: "configuration",
            file: filename,
            suggestion: `Fix the syntax error in ${filename} to ensure tooling can parse it properly.`,
            fixable: false,
          });
        }
      } catch {
        // Skip inaccessible files
      }
    }

    return diagnostics;
  },
};
