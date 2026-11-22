import type { ProjectContext } from "../project/context.js";

export type Severity = "error" | "warning" | "info";
export type CheckStatus = "passed" | "failed" | "skipped";

export interface Diagnostic {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  category: string;
  file?: string;
  suggestion?: string;
  fixable: boolean;
}

export interface RuleExecutionResult {
  ruleId: string;
  status: CheckStatus;
  message?: string;
  diagnostics: Diagnostic[];
}

export interface DiagnosticRule {
  id: string;
  name: string;
  category: string;
  check(context: ProjectContext): Promise<Diagnostic[]>;
}

export interface DiagnosticReport {
  context: ProjectContext;
  results: RuleExecutionResult[];
  diagnostics: Diagnostic[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    passed: number;
    skipped: number;
  };
}
