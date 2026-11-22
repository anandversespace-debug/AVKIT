import path from "node:path";
import { fileExists } from "../../infrastructure/filesystem.js";
import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";

const PRETTIER_CONFIG_CANDIDATES = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.mjs",
  ".prettierrc.toml",
  "prettier.config.js",
  "prettier.config.cjs",
  "prettier.config.mjs",
];

export const prettierConfigRule: DiagnosticRule = {
  id: "PRETTIER_CONFIG_MISSING",
  name: "Prettier Configuration Check",
  category: "linting",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    const pkg = context.packageJson;
    const deps = {
      ...((pkg?.dependencies as Record<string, string>) || {}),
      ...((pkg?.devDependencies as Record<string, string>) || {}),
    };

    const hasPrettierDep = Boolean(deps["prettier"]);
    const hasPrettierInPkg = Boolean(pkg?.["prettier"]);
    const hasPrettierFile = PRETTIER_CONFIG_CANDIDATES.some((filename) =>
      fileExists(path.join(context.rootDirectory, filename))
    );

    if (hasPrettierDep && !hasPrettierInPkg && !hasPrettierFile) {
      return [
        {
          id: "PRETTIER_CONFIG_MISSING",
          severity: "warning",
          title: "Prettier is installed but has no configuration file",
          description: "Prettier is listed in project dependencies, but no configuration file (.prettierrc.json or prettier.config.js) was detected.",
          category: "linting",
          file: ".prettierrc.json",
          suggestion: "Generate a standard .prettierrc.json configuration file to ensure consistent team formatting.",
          fixable: true,
        },
      ];
    }

    return [];
  },
};
