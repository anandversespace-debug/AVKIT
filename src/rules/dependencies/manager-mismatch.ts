import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";
import { LOCKFILE_MAPPINGS } from "../../core/project/package-manager.js";

export const packageManagerMismatchRule: DiagnosticRule = {
  id: "PKG_MANAGER_MISMATCH",
  name: "Package Manager Field & Lockfile Consistency",
  category: "dependencies",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    const pkg = context.packageJson;
    if (!pkg || typeof pkg.packageManager !== "string") {
      return [];
    }

    const declaredManager = pkg.packageManager.split("@")[0].toLowerCase();
    if (context.lockfiles.length === 0) {
      return [];
    }

    // Check if any existing lockfile corresponds to the declared packageManager
    const matchingLockfile = context.lockfiles.some(
      (lockfile) => LOCKFILE_MAPPINGS[lockfile] === declaredManager
    );

    if (!matchingLockfile) {
      return [
        {
          id: "PKG_MANAGER_MISMATCH",
          severity: "error",
          title: "Package manager mismatch with existing lockfile",
          description: `package.json declares '${pkg.packageManager}', but the repository contains lockfile(s) for other package managers (${context.lockfiles.join(", ")}).`,
          category: "dependencies",
          file: "package.json",
          suggestion: `Run '${declaredManager} install' to generate a matching lockfile, or update the 'packageManager' field in package.json.`,
          fixable: false,
        },
      ];
    }

    return [];
  },
};
