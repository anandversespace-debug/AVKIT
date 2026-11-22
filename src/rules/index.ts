import { defaultRegistry } from "../core/diagnostics/registry.js";
import { nodeVersionRule } from "./environment/node-version.js";
import { lockfileConflictRule } from "./dependencies/lockfile-conflict.js";
import { packageManagerMismatchRule } from "./dependencies/manager-mismatch.js";
import { jsonInvalidRule } from "./configuration/json-invalid.js";
import { envExampleRule } from "./configuration/env-example.js";
import { tsconfigInvalidRule } from "./typescript/tsconfig-syntax.js";
import { scriptBinaryMissingRule } from "./scripts/binary-missing.js";
import { gitHooksConfigRule } from "./git/hooks-config.js";
import { prettierConfigRule } from "./linting/prettier-config.js";

export function registerDefaultRules(): void {
  defaultRegistry.clear();

  // 1. Environment
  defaultRegistry.register(nodeVersionRule);

  // 2. Dependencies
  defaultRegistry.register(lockfileConflictRule);
  defaultRegistry.register(packageManagerMismatchRule);

  // 3. Configuration
  defaultRegistry.register(jsonInvalidRule);
  defaultRegistry.register(envExampleRule);

  // 4. TypeScript
  defaultRegistry.register(tsconfigInvalidRule);

  // 5. Scripts
  defaultRegistry.register(scriptBinaryMissingRule);

  // 6. Git
  defaultRegistry.register(gitHooksConfigRule);

  // 7. Linting / Formatting
  defaultRegistry.register(prettierConfigRule);
}
