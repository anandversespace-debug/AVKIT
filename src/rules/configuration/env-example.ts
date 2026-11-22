import { fileExists, readFileSafe, safeResolvePath } from "../../infrastructure/filesystem.js";
import type { ProjectContext } from "../../core/project/context.js";
import type { Diagnostic, DiagnosticRule } from "../../core/diagnostics/types.js";

function parseEnvKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIdx = trimmed.indexOf("=");
    if (equalsIdx > 0) {
      const key = trimmed.slice(0, equalsIdx).trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        keys.add(key);
      }
    }
  }

  return keys;
}

export const envExampleRule: DiagnosticRule = {
  id: "ENV_EXAMPLE_MISSING",
  name: "Environment Variable Audit",
  category: "configuration",
  async check(context: ProjectContext): Promise<Diagnostic[]> {
    try {
      const examplePath = safeResolvePath(context.rootDirectory, ".env.example");
      if (!fileExists(examplePath)) {
        return [];
      }

      const exampleContent = await readFileSafe(context.rootDirectory, ".env.example");
      if (!exampleContent) {
        return [];
      }

      const expectedKeys = parseEnvKeys(exampleContent);
      if (expectedKeys.size === 0) {
        return [];
      }

      // Check local env files: .env, .env.local, .env.development
      const localEnvFiles = [".env", ".env.local", ".env.development"];
      const definedKeys = new Set<string>();

      for (const envFile of localEnvFiles) {
        try {
          const filePath = safeResolvePath(context.rootDirectory, envFile);
          if (fileExists(filePath)) {
            const content = await readFileSafe(context.rootDirectory, envFile);
            if (content) {
              const keys = parseEnvKeys(content);
              for (const k of keys) definedKeys.add(k);
            }
          }
        } catch {
          // Ignore
        }
      }

      // Find missing variable names
      const missingKeys: string[] = [];
      for (const key of expectedKeys) {
        if (!definedKeys.has(key)) {
          missingKeys.push(key);
        }
      }

      if (missingKeys.length > 0) {
        return [
          {
            id: "ENV_EXAMPLE_MISSING",
            severity: "warning",
            title: "Missing environment variables declared in .env.example",
            description: `The following environment variable name(s) are declared in .env.example but missing from local environment file(s): ${missingKeys.join(", ")}.`,
            category: "configuration",
            file: ".env.example",
            suggestion: `Add the missing variable names (${missingKeys.join(", ")}) to your local .env or .env.local file. Never commit secret values to git.`,
            fixable: false,
          },
        ];
      }
    } catch {
      // Ignore
    }

    return [];
  },
};
