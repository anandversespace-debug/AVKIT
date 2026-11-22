import os from "node:os";
import path from "node:path";
import { fileExists } from "../../infrastructure/filesystem.js";

export type PlatformType = "windows" | "macos" | "linux" | "unknown";
export type NodeManagerType = "nvm" | "fnm" | "volta" | "asdf" | "system";
export type MonorepoType = "pnpm-workspaces" | "npm-workspaces" | "turborepo" | "lerna" | "nx";

export interface EnvironmentDetails {
  platform: PlatformType;
  arch: string;
  osRelease: string;
  isCI: boolean;
  ciProvider: string | null;
  nodeManager: NodeManagerType;
  isInteractive: boolean;
  isMonorepo: boolean;
  monorepoType?: MonorepoType;
}

/**
 * Automatically inspects system, runtime, CI, and workspace environment.
 */
export function detectEnvironment(
  rootDirectory: string,
  packageJson: Record<string, unknown> | null
): EnvironmentDetails {
  // 1. Operating system & architecture
  let platform: PlatformType = "unknown";
  if (process.platform === "win32") platform = "windows";
  else if (process.platform === "darwin") platform = "macos";
  else if (process.platform === "linux") platform = "linux";

  const arch = process.arch;
  const osRelease = os.release();

  // 2. CI detection
  const env = process.env;
  let isCI = false;
  let ciProvider: string | null = null;

  if (env.GITHUB_ACTIONS) {
    isCI = true;
    ciProvider = "GitHub Actions";
  } else if (env.GITLAB_CI) {
    isCI = true;
    ciProvider = "GitLab CI";
  } else if (env.VERCEL) {
    isCI = true;
    ciProvider = "Vercel";
  } else if (env.NETLIFY) {
    isCI = true;
    ciProvider = "Netlify";
  } else if (env.CIRCLECI) {
    isCI = true;
    ciProvider = "CircleCI";
  } else if (env.TRAVIS) {
    isCI = true;
    ciProvider = "Travis CI";
  } else if (env.CI) {
    isCI = true;
    ciProvider = "Generic CI";
  }

  // 3. Node version manager detection
  let nodeManager: NodeManagerType = "system";
  if (env.FNM_DIR || env.FNM_MULTISHELL_PATH) {
    nodeManager = "fnm";
  } else if (env.NVM_DIR || env.NVM_BIN) {
    nodeManager = "nvm";
  } else if (env.VOLTA_HOME) {
    nodeManager = "volta";
  } else if (env.ASDF_DIR) {
    nodeManager = "asdf";
  }

  // 4. Interactive TTY
  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  // 5. Monorepo detection
  let isMonorepo = false;
  let monorepoType: MonorepoType | undefined;

  if (fileExists(path.join(rootDirectory, "pnpm-workspace.yaml"))) {
    isMonorepo = true;
    monorepoType = "pnpm-workspaces";
  } else if (fileExists(path.join(rootDirectory, "turbo.json"))) {
    isMonorepo = true;
    monorepoType = "turborepo";
  } else if (fileExists(path.join(rootDirectory, "nx.json"))) {
    isMonorepo = true;
    monorepoType = "nx";
  } else if (fileExists(path.join(rootDirectory, "lerna.json"))) {
    isMonorepo = true;
    monorepoType = "lerna";
  } else if (packageJson && packageJson.workspaces) {
    isMonorepo = true;
    monorepoType = "npm-workspaces";
  }

  return {
    platform,
    arch,
    osRelease,
    isCI,
    ciProvider,
    nodeManager,
    isInteractive,
    isMonorepo,
    monorepoType,
  };
}
