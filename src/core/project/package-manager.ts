import path from "node:path";
import { fileExists, safeResolvePath } from "../../infrastructure/filesystem.js";
import type { PackageManager } from "./context.js";

export const LOCKFILE_MAPPINGS: Record<string, PackageManager> = {
  "package-lock.json": "npm",
  "npm-shrinkwrap.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lockb": "bun",
  "bun.lock": "bun",
};

export interface LockfileAnalysis {
  lockfiles: string[];
  primaryManager: PackageManager;
  packageManagerField?: string;
}

/**
 * Detects lockfiles and package manager specifications in the project root.
 */
export function analyzePackageManager(
  rootDirectory: string,
  packageJson: Record<string, unknown> | null
): LockfileAnalysis {
  const foundLockfiles: string[] = [];

  for (const lockfileName of Object.keys(LOCKFILE_MAPPINGS)) {
    try {
      const fullPath = safeResolvePath(rootDirectory, lockfileName);
      if (fileExists(fullPath)) {
        foundLockfiles.push(lockfileName);
      }
    } catch {
      // Ignore security/path issues for non-existent files
    }
  }

  let packageManagerField: string | undefined;
  let primaryManager: PackageManager = "unknown";

  if (packageJson && typeof packageJson.packageManager === "string") {
    packageManagerField = packageJson.packageManager;
    const prefix = packageManagerField.split("@")[0].toLowerCase();
    if (prefix === "npm" || prefix === "pnpm" || prefix === "yarn" || prefix === "bun") {
      primaryManager = prefix;
    }
  }

  if (primaryManager === "unknown" && foundLockfiles.length > 0) {
    const firstLockfile = foundLockfiles[0];
    primaryManager = LOCKFILE_MAPPINGS[firstLockfile] || "unknown";
  }

  return {
    lockfiles: foundLockfiles,
    primaryManager,
    packageManagerField,
  };
}
