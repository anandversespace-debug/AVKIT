import { prettierIntegration } from "./prettier.js";
import { eslintIntegration } from "./eslint.js";
import { vitestIntegration } from "./vitest.js";
import { huskyIntegration } from "./husky.js";
import type { IntegrationOption } from "./types.js";

export const SUPPORTED_INTEGRATIONS: IntegrationOption[] = [
  prettierIntegration,
  eslintIntegration,
  vitestIntegration,
  huskyIntegration,
];
