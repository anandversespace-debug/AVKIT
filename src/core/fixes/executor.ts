import path from "node:path";
import fs from "node:fs/promises";
import { fileExists, readFileSafe, safeResolvePath } from "../../infrastructure/filesystem.js";
import type { FixPlan, FixSummary, FixExecutionResult } from "./types.js";

export class ConcurrentModificationError extends Error {
  constructor(filePath: string) {
    super(`Concurrent modification detected: '${filePath}' was modified after the fix plan was generated.`);
    this.name = "ConcurrentModificationError";
  }
}

/**
 * Atomically writes content to a target file using a temporary file and rename.
 */
async function atomicWriteFile(targetPath: string, content: string): Promise<void> {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });

  const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tempPath, content, "utf-8");

  try {
    await fs.rename(tempPath, targetPath);
  } catch (err) {
    // Fallback if atomic rename fails across filesystems / Windows locks
    try {
      await fs.writeFile(targetPath, content, "utf-8");
      await fs.unlink(tempPath).catch(() => {});
    } catch {
      throw err;
    }
  }
}

/**
 * Executes a fix plan safely:
 * - Checks for dry-run
 * - Validates file contents against original baseline (concurrency check)
 * - Writes changes atomically
 * - Tracks partial failures without false success claims
 */
export async function executeFixPlan(
  rootDirectory: string,
  plan: FixPlan,
  options: { dryRun?: boolean } = {}
): Promise<FixSummary> {
  const isDryRun = Boolean(options.dryRun);
  const results: FixExecutionResult[] = [];

  let appliedCount = 0;
  let failedCount = 0;

  for (const operation of plan.operations) {
    if (isDryRun) {
      results.push({
        operationId: operation.id,
        success: true,
        affectedFiles: operation.affectedFiles,
      });
      appliedCount++;
      continue;
    }

    try {
      // 1. Precondition check: verify file has not changed since planning
      for (const change of operation.changes) {
        const fullPath = safeResolvePath(rootDirectory, change.relativePath);

        if (change.type === "modify") {
          const currentDiskContent = await readFileSafe(rootDirectory, change.relativePath);
          if (currentDiskContent !== change.originalContent) {
            throw new ConcurrentModificationError(change.relativePath);
          }
        } else if (change.type === "create") {
          if (fileExists(fullPath)) {
            throw new Error(`File '${change.relativePath}' already exists; will not overwrite unexpectedly.`);
          }
        }
      }

      // 2. Apply writes atomically
      for (const change of operation.changes) {
        const fullPath = safeResolvePath(rootDirectory, change.relativePath);
        await atomicWriteFile(fullPath, change.newContent);
      }

      results.push({
        operationId: operation.id,
        success: true,
        affectedFiles: operation.affectedFiles,
      });
      appliedCount++;
    } catch (err) {
      failedCount++;
      results.push({
        operationId: operation.id,
        success: false,
        affectedFiles: operation.affectedFiles,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    dryRun: isDryRun,
    totalPlanned: plan.operations.length,
    appliedCount,
    failedCount,
    results,
  };
}
