import { detectProjectContext } from "../core/project/detector.js";
import { runDiagnostics } from "../core/diagnostics/engine.js";
import { registerDefaultRules } from "../rules/index.js";
import { formatDoctor } from "../ui/reporter.js";

export interface DoctorOptions {
  cwd?: string;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export async function doctorCommand(options: DoctorOptions = {}): Promise<number> {
  const targetDir = options.cwd || process.cwd();
  registerDefaultRules();

  const context = await detectProjectContext(targetDir);
  const report = await runDiagnostics(context);

  const output = formatDoctor(report, {
    json: options.json,
    verbose: options.verbose,
    quiet: options.quiet,
  });

  console.log(output);

  // Return exit code
  if (report.summary.errors > 0) {
    return 2; // Diagnostic errors found
  }
  return 0; // Success
}
