import { Command } from "commander";
import { infoCommand } from "../commands/info.js";
import { doctorCommand } from "../commands/doctor.js";
import { fixCommand } from "../commands/fix.js";
import { initCommand } from "../commands/init.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("avkit")
    .description("Open-source developer workflow CLI for JS/TS configuration diagnosis and safe remediation")
    .version("0.1.0")
    .option("--cwd <path>", "Set working directory for project detection and checks")
    .option("--verbose", "Show detailed diagnostic explanations and remediations", false)
    .option("--quiet", "Suppress non-essential output", false)
    .option("--no-color", "Disable colored terminal output");

  // avkit info
  program
    .command("info")
    .description("Display project framework, runtime, package manager, and tooling status")
    .option("--json", "Output machine-readable JSON format", false)
    .action(async (cmdOptions, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        await infoCommand({
          cwd: globalOpts.cwd,
          json: cmdOptions.json,
        });
      } catch (err) {
        console.error("Execution error:", err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // avkit doctor
  program
    .command("doctor")
    .description("Run read-only project configuration diagnostics")
    .option("--json", "Output machine-readable JSON format", false)
    .action(async (cmdOptions, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const exitCode = await doctorCommand({
          cwd: globalOpts.cwd,
          json: cmdOptions.json,
          verbose: globalOpts.verbose,
          quiet: globalOpts.quiet,
        });
        process.exit(exitCode);
      } catch (err) {
        console.error("Execution error:", err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // avkit fix
  program
    .command("fix")
    .description("Safely preview and apply proposed configuration fixes")
    .option("--dry-run", "Preview proposed changes without modifying files", false)
    .option("--id <diagnostic-id>", "Apply fix only for a specific diagnostic ID")
    .option("-y, --yes", "Automatically confirm and apply changes", false)
    .action(async (cmdOptions, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const exitCode = await fixCommand({
          cwd: globalOpts.cwd,
          dryRun: cmdOptions.dryRun,
          id: cmdOptions.id,
          yes: cmdOptions.yes,
        });
        process.exit(exitCode);
      } catch (err) {
        console.error("Execution error:", err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // avkit init
  program
    .command("init")
    .description("Guided setup and safe integration of recommended developer tools")
    .option("--tools <tools>", "Comma-separated list of tools to initialize (prettier,eslint,vitest)")
    .option("--dry-run", "Preview proposed integration changes without writing files", false)
    .option("-y, --yes", "Confirm and apply recommended integrations", false)
    .action(async (cmdOptions, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const exitCode = await initCommand({
          cwd: globalOpts.cwd,
          tools: cmdOptions.tools,
          dryRun: cmdOptions.dryRun,
          yes: cmdOptions.yes,
        });
        process.exit(exitCode);
      } catch (err) {
        console.error("Execution error:", err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  return program;
}
