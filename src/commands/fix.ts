import pc from "picocolors";
import { detectProjectContext } from "../core/project/detector.js";
import { runDiagnostics } from "../core/diagnostics/engine.js";
import { registerDefaultRules } from "../rules/index.js";
import { planFixes } from "../core/fixes/planner.js";
import { executeFixPlan } from "../core/fixes/executor.js";
import { formatFixPlan, promptForApproval } from "../ui/prompts.js";

export interface FixCommandOptions {
  cwd?: string;
  dryRun?: boolean;
  id?: string;
  yes?: boolean;
}

export async function fixCommand(options: FixCommandOptions = {}): Promise<number> {
  const targetDir = options.cwd || process.cwd();
  registerDefaultRules();

  const context = await detectProjectContext(targetDir);
  const report = await runDiagnostics(context);

  const plan = planFixes(context, report.diagnostics, options.id);

  if (plan.operations.length === 0) {
    console.log(pc.green("✓ No fixable issues found. Your project is in good shape!"));
    return 0;
  }

  // Display proposed plan
  console.log(formatFixPlan(plan));

  if (options.dryRun) {
    console.log(pc.bold(pc.yellow("\n[Dry-run Mode] No files were modified.")));
    const summary = await executeFixPlan(context.rootDirectory, plan, { dryRun: true });
    console.log(`Dry-run verified ${summary.totalPlanned} planned operation(s).`);
    return 0;
  }

  // Confirmation handling
  let approved = Boolean(options.yes);
  if (!approved) {
    approved = await promptForApproval();
  }

  if (!approved) {
    console.log(pc.yellow("\nFixes cancelled by user. No files were modified."));
    return 0;
  }

  console.log(pc.cyan("\nApplying fixes..."));
  const summary = await executeFixPlan(context.rootDirectory, plan, { dryRun: false });

  for (const res of summary.results) {
    if (res.success) {
      console.log(`${pc.green("✓")} Applied ${res.operationId} to: ${res.affectedFiles.join(", ")}`);
    } else {
      console.log(`${pc.red("✗")} Failed ${res.operationId}: ${res.error}`);
    }
  }

  console.log(
    `\nSummary: ${summary.appliedCount} applied, ${summary.failedCount} failed.`
  );

  if (summary.failedCount > 0) {
    return 4; // Exit code 4: Failed fix
  }

  return 0;
}
