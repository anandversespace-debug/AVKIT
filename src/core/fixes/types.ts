export type RiskLevel = "low" | "medium" | "high";
export type FileChangeType = "create" | "modify" | "delete";

export interface ProposedFileChange {
  relativePath: string;
  type: FileChangeType;
  description: string;
  originalContent: string | null;
  newContent: string;
  diffPreview: string;
}

export interface FixOperation {
  id: string;
  diagnosticId: string;
  title: string;
  description: string;
  risk: RiskLevel;
  affectedFiles: string[];
  changes: ProposedFileChange[];
  requiresConfirmation: boolean;
}

export interface FixPlan {
  operations: FixOperation[];
  affectedFiles: string[];
  hasHighRisk: boolean;
}

export interface FixExecutionResult {
  operationId: string;
  success: boolean;
  affectedFiles: string[];
  error?: string;
}

export interface FixSummary {
  dryRun: boolean;
  totalPlanned: number;
  appliedCount: number;
  failedCount: number;
  results: FixExecutionResult[];
}
