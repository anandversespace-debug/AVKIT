import type { DiagnosticRule } from "./types.js";

export class DiagnosticRegistry {
  private rules: Map<string, DiagnosticRule> = new Map();

  register(rule: DiagnosticRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with ID '${rule.id}' is already registered.`);
    }
    this.rules.set(rule.id, rule);
  }

  get(id: string): DiagnosticRule | undefined {
    return this.rules.get(id);
  }

  getAll(): DiagnosticRule[] {
    return Array.from(this.rules.values());
  }

  clear(): void {
    this.rules.clear();
  }
}

export const defaultRegistry = new DiagnosticRegistry();
