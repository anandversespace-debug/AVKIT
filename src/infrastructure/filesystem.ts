import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

export class FilesystemSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilesystemSecurityError";
  }
}

/**
 * Resolves a target path relative to a root directory and verifies
 * that the resolved path does not escape the root directory.
 */
export function safeResolvePath(rootDirectory: string, relativeOrAbsolutePath: string): string {
  const resolvedRoot = path.resolve(rootDirectory);
  const resolvedTarget = path.isAbsolute(relativeOrAbsolutePath)
    ? path.resolve(relativeOrAbsolutePath)
    : path.resolve(resolvedRoot, relativeOrAbsolutePath);

  const relative = path.relative(resolvedRoot, resolvedTarget);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new FilesystemSecurityError(
      `Access denied: Target path '${resolvedTarget}' escapes root directory '${resolvedRoot}'`
    );
  }

  return resolvedTarget;
}

/**
 * Checks if a file or directory exists synchronously.
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Safely reads a UTF-8 text file inside rootDirectory.
 */
export async function readFileSafe(rootDirectory: string, relativePath: string): Promise<string | null> {
  try {
    const fullPath = safeResolvePath(rootDirectory, relativePath);
    if (!fileExists(fullPath)) return null;
    return await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    if (error instanceof FilesystemSecurityError) throw error;
    return null;
  }
}

/**
 * Safely parses a JSON file inside rootDirectory.
 */
export async function readJsonSafe<T = Record<string, unknown>>(
  rootDirectory: string,
  relativePath: string
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const content = await readFileSafe(rootDirectory, relativePath);
    if (content === null) {
      return { data: null, error: new Error(`File not found: ${relativePath}`) };
    }
    const parsed = JSON.parse(content) as T;
    return { data: parsed, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
