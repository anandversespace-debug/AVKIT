import pc from "picocolors";
import { checkbox } from "@inquirer/prompts";
import { detectProjectContext } from "../core/project/detector.js";
import { SUPPORTED_INTEGRATIONS } from "../integrations/registry.js";
import { executeFixPlan } from "../core/fixes/executor.js";
import { formatFixPlan, promptForApproval } from "../ui/prompts.js";
import type { FixOperation, FixPlan } from "../core/fixes/types.js";
import type { IntegrationOption } from "../integrations/types.js";

export interface InitOptions {
  cwd?: string;
  tools?: string;
  yes?: boolean;
  dryRun?: boolean;
}

export async function initCommand(options: InitOptions = {}): Promise<number> {
  const targetDir = options.cwd || process.cwd();
  const context = await detectProjectContext(targetDir);

  console.log(
    pc.bold(`\nAVKit Project Onboarding — ${pc.cyan(context.projectName)} (${context.framework})\n`)
  );

  // 1. Identify unconfigured integrations
  const available = SUPPORTED_INTEGRATIONS.filter((i) => !i.isConfigured(context));
  const alreadyConfigured = SUPPORTED_INTEGRATIONS.filter((i) => i.isConfigured(context));

  if (alreadyConfigured.length > 0) {
    console.log(
      pc.dim(`Already configured: ${alreadyConfigured.map((i) => i.name).join(", ")}`)
    );
  }

  if (available.length === 0) {
    console.log(pc.green("All supported integrations (Prettier, ESLint, Vitest) are already configured!"));
    return 0;
  }

  // 2. Determine selected integrations
  let selectedIntegrations: IntegrationOption[] = [];

  if (options.tools) {
    const requested = options.tools.split(",").map((t) => t.trim().toLowerCase());
    selectedIntegrations = available.filter((i) => requested.includes(i.id));
  } else if (options.yes) {
    selectedIntegrations = available;
  } else if (!process.stdin.isTTY) {
    console.error(
      pc.red("Error: Non-interactive terminal detected. Please pass --tools <tool1,tool2> or --yes to run init.")
    );
    return 3; // Invalid usage
  } else {
    try {
      const choices = available.map((i) => ({
        name: `${i.name} — ${i.description}`,
        value: i.id,
      }));

      const selectedIds = await checkbox({
        message: "Select integrations to add to your project:",
        choices,
      });

      selectedIntegrations = available.filter((i) => selectedIds.includes(i.id));
    } catch {
      console.log(pc.yellow("\nSetup cancelled."));
      return 0;
    }
  }

  if (selectedIntegrations.length === 0) {
    console.log(pc.yellow("No integrations selected. Exiting."));
    return 0;
  }

  // 3. Generate plan
  const operations: FixOperation[] = [];
  const affectedFilesSet = new Set<string>();
  const scriptAdditions: Record<string, string> = {};

  for (const integration of selectedIntegrations) {
    const rawChanges = integration.generateChanges(context);
    const nonPkgChanges = rawChanges.filter((c) => c.relativePath !== "package.json");

    if (integration.id === "prettier") scriptAdditions["format"] = "prettier --write .";
    if (integration.id === "eslint") {
      scriptAdditions["lint"] = context.framework === "nextjs" ? "next lint" : "eslint .";
    }
    if (integration.id === "vitest") scriptAdditions["test"] = "vitest run";
    if (integration.id === "husky") scriptAdditions["prepare"] = "husky";

    const affected = nonPkgChanges.map((c) => c.relativePath);
    affected.forEach((f) => affectedFilesSet.add(f));

    operations.push({
      id: `INIT_${integration.id.toUpperCase()}`,
      diagnosticId: `INIT_${integration.id.toUpperCase()}`,
      title: `Initialize ${integration.name}`,
      description: integration.description,
      risk: "low",
      affectedFiles: affected,
      changes: nonPkgChanges,
      requiresConfirmation: true,
    });
  }

  // Consolidate package.json script additions into a single unified update
  if (context.packageJsonRaw && Object.keys(scriptAdditions).length > 0) {
    try {
      const pkg = JSON.parse(context.packageJsonRaw);
      pkg.scripts = pkg.scripts || {};
      const scriptsToAdd: Record<string, string> = {};

      for (const [name, cmd] of Object.entries(scriptAdditions)) {
        if (!pkg.scripts[name]) {
          pkg.scripts[name] = cmd;
          scriptsToAdd[name] = cmd;
        }
      }

      if (Object.keys(scriptsToAdd).length > 0) {
        const updatedPkg = JSON.stringify(pkg, null, 2) + "\n";
        operations.push({
          id: "INIT_PACKAGE_SCRIPTS",
          diagnosticId: "INIT_PACKAGE_SCRIPTS",
          title: "Update package.json scripts",
          description: `Add standard script(s): ${Object.keys(scriptsToAdd).join(", ")}`,
          risk: "low",
          affectedFiles: ["package.json"],
          changes: [
            {
              relativePath: "package.json",
              type: "modify",
              description: `Add scripts (${Object.keys(scriptsToAdd).join(", ")}) to package.json`,
              originalContent: context.packageJsonRaw,
              newContent: updatedPkg,
              diffPreview:
                `--- a/package.json\n+++ b/package.json\n` +
                Object.entries(scriptsToAdd)
                  .map(([k, v]) => `+ "${k}": "${v}"`)
                  .join("\n"),
            },
          ],
          requiresConfirmation: true,
        });
        affectedFilesSet.add("package.json");
      }
    } catch {
      // Ignore
    }
  }

  const plan: FixPlan = {
    operations,
    affectedFiles: Array.from(affectedFilesSet),
    hasHighRisk: false,
  };

  // 4. Preview and Confirm
  console.log("\n" + formatFixPlan(plan));

  if (options.dryRun) {
    console.log(pc.bold(pc.yellow("\n[Dry-run Mode] No files were modified.")));
    return 0;
  }

  let approved = Boolean(options.yes);
  if (!approved) {
    approved = await promptForApproval("Proceed with initializing selected tools?");
  }

  if (!approved) {
    console.log(pc.yellow("\nSetup cancelled by user. No files were modified."));
    return 0;
  }

  console.log(pc.cyan("\nApplying configuration..."));
  const summary = await executeFixPlan(context.rootDirectory, plan, { dryRun: false });

  for (const res of summary.results) {
    if (res.success) {
      console.log(`${pc.green("✓")} Configured ${res.operationId} (affected: ${res.affectedFiles.join(", ")})`);
    } else {
      console.log(`${pc.red("✗")} Failed ${res.operationId}: ${res.error}`);
    }
  }

  console.log(
    pc.bold(pc.green(`\nSetup complete: ${summary.appliedCount} operation(s) applied successfully.`))
  );

  return summary.failedCount > 0 ? 4 : 0;
}
