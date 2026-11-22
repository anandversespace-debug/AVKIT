import { parseTree, printParseErrorCode, type ParseError } from "jsonc-parser";
import { fileExists, readFileSafe, safeResolvePath } from "../../infrastructure/filesystem.js";
import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";

export const tsconfigInvalidRule: DiagnosticRule = {
  id: "TSCONFIG_INVALID",
  name: "TypeScript Configuration Validation",
  category: "typescript",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    try {
      const fullPath = safeResolvePath(context.rootDirectory, "tsconfig.json");
      if (!fileExists(fullPath)) {
        return [];
      }

      const content = await readFileSafe(context.rootDirectory, "tsconfig.json");
      if (content === null) {
        return [];
      }

      const errors: ParseError[] = [];
      parseTree(content, errors, { allowTrailingComma: true });

      if (errors.length > 0) {
        const errorDescriptions = errors
          .map((e) => `Offset ${e.offset}: ${printParseErrorCode(e.error)}`)
          .join("; ");

        return [
          {
            id: "TSCONFIG_INVALID",
            severity: "error",
            title: "Invalid tsconfig.json syntax",
            description: `tsconfig.json contains syntax or formatting errors: ${errorDescriptions}`,
            category: "typescript",
            file: "tsconfig.json",
            suggestion: "Fix the syntax errors in tsconfig.json to restore TypeScript project configuration.",
            fixable: false,
          },
        ];
      }
    } catch {
      // Inaccessible file
    }

    return [];
  },
};
