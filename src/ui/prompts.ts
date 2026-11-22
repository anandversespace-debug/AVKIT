import pc from "picocolors";
import { confirm } from "@inquirer/prompts";
import type { FixPlan } from "../core/fixes/types.js";

/**
 * Formats a fix plan preview for terminal display.
 */
export function formatFixPlan(plan: FixPlan): string {
  const lines: string[] = [];

  lines.push(pc.bold(pc.cyan("=== Proposed Fix Plan ===")));
  lines.push(`Total operations: ${plan.operations.length} | Affected files: ${plan.affectedFiles.join(", ") || "none"}`);
  lines.push("");

  for (const [idx, op] of plan.operations.entries()) {
    const riskBadge =
      op.risk === "high"
        ? pc.red("[HIGH RISK]")
        : op.risk === "medium"
        ? pc.yellow("[MEDIUM RISK]")
        : pc.green("[LOW RISK]");

    lines.push(`${pc.bold(`${idx + 1}. ${op.title}`)} ${riskBadge}`);
    lines.push(`   ${pc.dim(op.description)}`);

    for (const change of op.changes) {
      lines.push(`   ${pc.cyan("File:")} ${change.relativePath} (${change.type})`);
      lines.push("");
      lines.push(
        change.diffPreview
          .split("\n")
          .map((line) => {
            if (line.startsWith("+")) return `     ${pc.green(line)}`;
            if (line.startsWith("-")) return `     ${pc.red(line)}`;
            return `     ${pc.dim(line)}`;
          })
          .join("\n")
      );
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Requests user approval to proceed with fixes.
 */
export async function promptForApproval(message = "Do you want to apply these fixes?"): Promise<boolean> {
  // If not running in an interactive terminal, default to false unless explicitly confirmed
  if (!process.stdin.isTTY) {
    return false;
  }

  try {
    return await confirm({
      message,
      default: false,
    });
  } catch {
    // If prompt was interrupted/cancelled
    return false;
  }
}
