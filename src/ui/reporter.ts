import pc from "picocolors";
import type { ProjectContext } from "../core/project/context.js";
import type { DiagnosticReport } from "../core/diagnostics/types.js";

export function formatInfo(context: ProjectContext, options: { json?: boolean } = {}): string {
  if (options.json) {
    return JSON.stringify(
      {
        projectName: context.projectName,
        rootDirectory: context.rootDirectory,
        framework: context.framework,
        language: context.language,
        packageManager: context.packageManager,
        nodeVersion: context.nodeVersion,
        lockfiles: context.lockfiles,
        detectedTools: context.detectedTools,
        hasGit: context.hasGit,
      },
      null,
      2
    );
  }

  const lines: string[] = [
    pc.bold("AVKit Project Information"),
    pc.dim("-------------------------"),
    `  ${pc.cyan("Project:")}         ${context.projectName}`,
    `  ${pc.cyan("Root:")}            ${context.rootDirectory}`,
    `  ${pc.cyan("Framework:")}       ${formatFramework(context.framework)}`,
    `  ${pc.cyan("Language:")}        ${context.language === "typescript" ? pc.blue("TypeScript") : pc.yellow("JavaScript")}`,
    `  ${pc.cyan("Package Manager:")} ${context.packageManager} ${context.lockfiles.length > 0 ? pc.dim(`(${context.lockfiles.join(", ")})`) : pc.red("(no lockfile)")}`,
    `  ${pc.cyan("Node Version:")}    ${context.nodeVersion}`,
    `  ${pc.cyan("Git:")}             ${context.hasGit ? pc.green("Initialized") : pc.dim("Not detected")}`,
    `  ${pc.cyan("Tooling:")}         ${context.detectedTools.length > 0 ? context.detectedTools.join(", ") : pc.dim("None detected")}`,
  ];

  return lines.join("\n");
}

function formatFramework(framework: string): string {
  switch (framework) {
    case "nextjs":
      return pc.bold(pc.white("Next.js"));
    case "vite-react":
      return pc.magenta("Vite + React");
    case "express":
      return pc.green("Express");
    case "node":
      return pc.cyan("Generic Node.js");
    default:
      return pc.dim("Unknown / Unrecognized");
  }
}

export function formatDoctor(
  report: DiagnosticReport,
  options: { json?: boolean; verbose?: boolean; quiet?: boolean } = {}
): string {
  if (options.json) {
    return JSON.stringify(report, null, 2);
  }

  const lines: string[] = [];

  // Header line
  lines.push(
    `Project: ${pc.bold(report.context.projectName)} | Framework: ${report.context.framework} | Package manager: ${report.context.packageManager}`
  );
  lines.push("");

  // Rule execution / findings
  for (const res of report.results) {
    if (res.status === "passed" && !options.quiet) {
      lines.push(`${pc.green("✓")} ${pc.dim(res.ruleId)} — Passed`);
    } else if (res.status === "skipped" && !options.quiet) {
      lines.push(`${pc.yellow("○")} ${pc.dim(res.ruleId)} — Skipped ${res.message ? `(${res.message})` : ""}`);
    } else if (res.status === "failed") {
      for (const diag of res.diagnostics) {
        const symbol = diag.severity === "error" ? pc.red("✗") : diag.severity === "warning" ? pc.yellow("!") : pc.blue("i");
        lines.push(`${symbol} ${pc.bold(diag.id)} — ${diag.title}`);
        if (options.verbose || diag.severity === "error") {
          lines.push(`  ${pc.dim(diag.description)}`);
          if (diag.suggestion) {
            lines.push(`  ${pc.cyan("Remediation:")} ${diag.suggestion}`);
          }
        }
      }
    }
  }

  lines.push("");
  const { errors, warnings, info, passed, skipped } = report.summary;
  const summaryParts: string[] = [];

  if (errors > 0) summaryParts.push(pc.red(`${errors} error${errors === 1 ? "" : "s"}`));
  if (warnings > 0) summaryParts.push(pc.yellow(`${warnings} warning${warnings === 1 ? "" : "s"}`));
  if (info > 0) summaryParts.push(pc.blue(`${info} info`));
  if (passed > 0) summaryParts.push(pc.green(`${passed} passed`));
  if (skipped > 0) summaryParts.push(pc.dim(`${skipped} skipped`));

  lines.push(`Summary: ${summaryParts.join(", ")}`);

  if (report.diagnostics.some((d) => d.fixable)) {
    lines.push(`Try: ${pc.cyan("avkit fix --dry-run")}`);
  }

  return lines.join("\n");
}
