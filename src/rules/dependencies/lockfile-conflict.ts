import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";

export const lockfileConflictRule: DiagnosticRule = {
  id: "PKG_LOCKFILE_CONFLICT",
  name: "Conflicting Lockfiles Detection",
  category: "dependencies",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    if (context.lockfiles.length > 1) {
      return [
        {
          id: "PKG_LOCKFILE_CONFLICT",
          severity: "error",
          title: "Multiple competing lockfiles detected",
          description: `Found ${context.lockfiles.length} competing lockfiles: ${context.lockfiles.join(", ")}. Competing lockfiles lead to non-deterministic installations, phantom dependencies, and build discrepancies across environments.`,
          category: "dependencies",
          suggestion: "Choose one package manager for this repository and delete the redundant lockfiles.",
          fixable: false,
        },
      ];
    }
    return [];
  },
};
