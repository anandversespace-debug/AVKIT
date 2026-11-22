import type { EnvironmentDetails } from "./environment.js";

export type Framework = "nextjs" | "vite-react" | "express" | "node" | "unknown";
export type Language = "javascript" | "typescript";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

export interface ProjectContext {
  rootDirectory: string;
  projectName: string;
  framework: Framework;
  language: Language;
  packageManager: PackageManager;
  nodeVersion: string;
  packageJson: Record<string, unknown> | null;
  packageJsonRaw: string | null;
  lockfiles: string[];
  detectedTools: string[];
  hasGit: boolean;
  environment: EnvironmentDetails;
}
