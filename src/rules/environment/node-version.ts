import semver from "semver";
import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";

export const nodeVersionRule: DiagnosticRule = {
  id: "ENV_NODE_VERSION",
  name: "Node.js Runtime Compatibility",
  category: "environment",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    const pkg = context.packageJson;
    if (!pkg) {
      return [];
    }

    const engines = pkg.engines as Record<string, string> | undefined;
    if (!engines || typeof engines.node !== "string") {
      return [
        {
          id: "ENV_NODE_VERSION",
          severity: "info",
          title: "Node.js engines constraint not specified",
          description: "package.json does not declare an 'engines.node' field to guarantee consistent Node.js runtimes across team members.",
          category: "environment",
          file: "package.json",
          suggestion: `Add "engines": { "node": ">=${process.version.slice(1)}" } to package.json.`,
          fixable: true,
        },
      ];
    }

    const requiredRange = engines.node.trim();
    const currentVersion = context.nodeVersion;

    if (!semver.satisfies(currentVersion, requiredRange)) {
      return [
        {
          id: "ENV_NODE_VERSION",
          severity: "error",
          title: "Incompatible Node.js runtime version",
          description: `Current Node.js version (${currentVersion}) does not satisfy required range '${requiredRange}' in package.json.`,
          category: "environment",
          file: "package.json",
          suggestion: `Switch to a Node.js version satisfying '${requiredRange}' using nvm, fnm, or volta.`,
          fixable: false,
        },
      ];
    }

    return [];
  },
};
