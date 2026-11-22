import type { ProjectContext } from "../core/project/context.js";
import type { ProposedFileChange } from "../core/fixes/types.js";

export type IntegrationId = "prettier" | "eslint" | "vitest" | "husky";

export interface IntegrationOption {
  id: IntegrationId;
  name: string;
  description: string;
  isConfigured(context: ProjectContext): boolean;
  generateChanges(context: ProjectContext): ProposedFileChange[];
}
