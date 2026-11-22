import type { ProjectContext } from "../project/context.js";
import { defaultRegistry, DiagnosticRegistry } from "./registry.js";
import type { Diagnostic, DiagnosticReport, RuleExecutionResult } from "./types.js";

export async function runDiagnostics(
  context: ProjectContext,
  registry: DiagnosticRegistry = defaultRegistry
): Promise<DiagnosticReport> {
  const rules = registry.getAll();
  const results: RuleExecutionResult[] = [];
  const allDiagnostics: Diagnostic[] = [];

  let passed = 0;
  let skipped = 0;

  for (const rule of rules) {
    try {
      const diagnostics = await rule.check(context);
      if (diagnostics.length === 0) {
        passed++;
        results.push({
          ruleId: rule.id,
          status: "passed",
          diagnostics: [],
        });
      } else {
        allDiagnostics.push(...diagnostics);
        results.push({
          ruleId: rule.id,
          status: "failed",
          diagnostics,
        });
      }
    } catch (err) {
      skipped++;
      results.push({
        ruleId: rule.id,
        status: "skipped",
        message: err instanceof Error ? err.message : String(err),
        diagnostics: [],
      });
    }
  }

  let errors = 0;
  let warnings = 0;
  let info = 0;

  for (const diag of allDiagnostics) {
    if (diag.severity === "error") errors++;
    else if (diag.severity === "warning") warnings++;
    else if (diag.severity === "info") info++;
  }

  return {
    context,
    results,
    diagnostics: allDiagnostics,
    summary: {
      errors,
      warnings,
      info,
      passed,
      skipped,
    },
  };
}
