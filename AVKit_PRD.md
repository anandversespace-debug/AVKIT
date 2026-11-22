# AVKit — Product Requirements Document

**Brand:** AnandVerse Technologies  
**Package (proposed):** `@anandverse/avkit`  
**Product:** Open-source developer workflow CLI  
**Status:** Proposed specification  
**Date:** 2026-11-22  
**Target:** 30-day MVP and public launch  
**License:** MIT (proposed)

## 1. Executive summary
AVKit helps JavaScript and TypeScript developers diagnose and safely repair configuration problems in existing Next.js, Vite/React, Express, and generic Node.js projects. Its primary commands are `init`, `doctor`, `fix`, and `info`. It does not replace ESLint, Prettier, or framework CLIs; it coordinates checks and guided setup across them.

## 2. Goals and non-goals
### Goals
- Zero-config, read-only diagnostics by default.
- Explain confirmed errors versus potential risks.
- Preview every change and obtain approval before applying fixes.
- Work across Windows, macOS, and Linux.
- Provide machine-readable diagnostics for CI.
- Publish a reliable, documented npm package in 30 days.

### Non-goals for v1
- AI debugging, hosted dashboard, telemetry, cloud sync.
- Arbitrary project migrations or dependency upgrades.
- Full monorepo orchestration.
- Replacing dedicated linters, formatters, or test runners.
- Guaranteeing daily active usage or a particular install count.

## 3. Audience and positioning
Primary users: freelance web developers, students, maintainers of existing JS/TS applications, and small teams. Positioning: **“Diagnose project setup problems and apply safe, reviewable fixes.”**

Competitive tools include framework starters, npm doctor, ESLint, Biome, and Knip. AVKit must distinguish itself with actionable cross-tool diagnosis and conservative remediation, not duplicate their analysis engines.

## 4. Supported environments
- Node.js: target maintained LTS releases; verify final minimum version against dependencies before publishing.
- Projects: Next.js, Vite/React, Express, generic Node.js.
- Languages: JavaScript and TypeScript (AVKit implemented in TypeScript).
- Package managers: npm, pnpm, Yarn, Bun detection; only execute a package-manager action where its integration is tested.
- Operating systems: Windows, macOS, Linux.
- ESM-first CLI, distributed with an executable `bin` entry.

## 5. Commands and functional requirements

### 5.1 `avkit info`
Read project metadata and display framework, language, Node version, package manager, lockfile status, Git presence, and detected tooling. Support `--json`. Unknown or ambiguous detections must be labeled explicitly.

### 5.2 `avkit doctor`
Read-only checks:
- `ENV_NODE_VERSION`: compare runtime with `engines.node` when specified.
- `PKG_LOCKFILE_CONFLICT`: flag multiple competing lockfiles.
- `PKG_MANAGER_MISMATCH`: compare `packageManager` field with lockfile.
- `CONFIG_JSON_INVALID`: parse supported JSON configuration and report syntax errors.
- `TSCONFIG_INVALID`: detect invalid JSONC syntax via a TypeScript-compatible parser.
- `SCRIPT_BINARY_MISSING`: check known local script executables without executing scripts.
- `ENV_EXAMPLE_MISSING`: compare variable *names* from `.env.example` with locally available environment names, never print values.
- `GIT_HOOKS_CONFIG`: report recognized missing or broken hook configuration, when applicable.

Every finding includes stable ID, severity (`error`, `warning`, `info`), title, explanation, location if known, remediation guidance, and fix availability. A check that cannot run is `skipped`, not `passed`. Support `--json`, `--verbose`, `--cwd`, and `--quiet`. Doctor must not install packages or write files.

### 5.3 `avkit fix`
Generate a plan from diagnostics, show proposed file changes and risks, then request explicit confirmation. Support `--dry-run` and `--id <diagnostic-id>`. Default to non-destructive operations; never delete lockfiles automatically. Detect concurrent edits before applying, write atomically where possible, preserve formatting when feasible, and accurately report partial failures. No claim of rollback unless verified.

**MVP fix recipes:**
1. Create a missing Prettier configuration only after explicit user selection.
2. Add a validated missing npm script while preserving existing scripts.
3. Repair a narrowly defined, recognized config reference with an exact-match precondition.

Conflicting lockfiles, major migrations, and ambiguous dependency issues remain manual-only in v1.

### 5.4 `avkit init`
Detect the current project, offer supported optional integrations (Prettier, ESLint, Vitest, Husky, lint-staged), inspect existing files, and preview changes. Do not overwrite or duplicate existing setup. Only enable integrations with tested framework/version combinations. Allow cancellation with no changes.

### 5.5 Global options
`--help`, `--version`, `--cwd <path>`, `--verbose`, `--quiet`, `--no-color`; `--json` on supported read-only commands. Respect `NO_COLOR` and noninteractive terminals. In noninteractive mode, fixes require explicit flags/approval semantics; never silently modify files.

## 6. Example user journeys
**Diagnosis:** Developer runs `npx @anandverse/avkit doctor` in a project with `package-lock.json` and `pnpm-lock.yaml`. AVKit reports a lockfile conflict, explains why it matters, and suggests manual resolution. It does not delete either file.

**Safe fix:** Developer runs `avkit fix --dry-run`, sees an exact proposed diff for a missing supported configuration, then runs `avkit fix`, reviews the same plan, and confirms. AVKit checks that source files have not changed since planning.

**Setup:** Developer runs `avkit init`, chooses Prettier, reviews files and dependency actions, and confirms. Existing configuration is retained.

## 7. Technical architecture
**Stack:** TypeScript, Commander, @inquirer/prompts, picocolors, tsup, Vitest, GitHub Actions. Validate dependency compatibility and package size.

```text
CLI parser
  -> command handlers
  -> project context detector
  -> diagnostic registry + rule runners
  -> fix planner (pure, no writes)
  -> approved executor (filesystem/process adapters)
  -> terminal / JSON reporter
```

### Data contracts
```ts
type Severity = "error" | "warning" | "info";
type CheckStatus = "passed" | "failed" | "skipped";

interface Diagnostic {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  category: string;
  file?: string;
  suggestion?: string;
  fixable: boolean;
}

interface ProjectContext {
  rootDirectory: string;
  projectName: string;
  framework: "nextjs" | "vite-react" | "express" | "node" | "unknown";
  language: "javascript" | "typescript";
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  nodeVersion: string;
}

interface DiagnosticRule {
  id: string;
  check(context: ProjectContext): Promise<Diagnostic[]>;
}

interface FixOperation {
  id: string;
  description: string;
  risk: "low" | "medium" | "high";
  affectedFiles: string[];
  requiresConfirmation: boolean;
}
```

Rules must be individually testable; command handlers must not contain filesystem mutation logic. Keep report rendering separate from checks.

## 8. Suggested repository structure
```text
avkit/
├── .github/workflows/{ci.yml,release.yml}
├── docs/{getting-started.md,commands.md,diagnostics.md,safety.md}
├── src/
│   ├── cli/{index.ts,program.ts}
│   ├── commands/{init.ts,doctor.ts,fix.ts,info.ts}
│   ├── core/project/{detector.ts,package-manager.ts,context.ts}
│   ├── core/diagnostics/{engine.ts,registry.ts,types.ts}
│   ├── core/fixes/{planner.ts,executor.ts,types.ts}
│   ├── rules/{environment,dependencies,typescript,linting,git}/
│   ├── integrations/{nextjs,vite,express,node}/
│   ├── infrastructure/{filesystem,process}/
│   └── ui/{reporter.ts,prompts.ts}
├── tests/{unit,integration,e2e,fixtures}/
├── examples/{nextjs,vite-react,node}/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

Create directories incrementally; avoid empty placeholder modules.

## 9. Security, privacy, and safety
- Read-only by default. No telemetry or network calls during local diagnosis.
- Never print, upload, or persist environment variable values or credentials.
- Resolve all file paths; reject traversal and unsafe symlink escapes outside project root.
- Never construct shell commands from untrusted package metadata; use executable + argument arrays.
- Validate file contents before write and check for concurrent modifications.
- Require explicit approval for package installs, removals, Git hooks, or existing-file changes.
- Dry-run must have zero writes and zero installation side effects.
- Handle cancellation, permission errors, and partial failures without false success claims.

## 10. UX and output
Use compact terminal results with ✓ passed, ✗ error, ! warning, ○ skipped. Color is optional, never the only signal. Errors should explain what happened, why it matters, and the next safe action.

Example:
```text
$ avkit doctor
Project: portfolio | Framework: Next.js | Package manager: npm
✓ Node version compatible
✗ PKG_LOCKFILE_CONFLICT — Multiple lockfiles detected
! Missing optional Prettier configuration
Summary: 1 error, 1 warning, 1 passed
Try: avkit fix --dry-run
```

**Exit codes:** `0` successful/no blocking findings; `1` execution failure; `2` diagnostic errors; `3` invalid usage; `4` failed fix. Document exact semantics for warning-only findings.

## 11. Nonfunctional requirements
- No hidden network access; avoid expensive recursive scans of `node_modules` and build output.
- Targets on a reference small project: help startup <500 ms, info <1 s, core doctor <3 s (excluding external tools); benchmark before claiming achieved.
- Idempotent setup and fixes when possible.
- Support paths containing spaces and Unicode.
- Stable JSON schema with documented versioning.
- Unit, integration, and end-to-end coverage; cross-platform CI.
- Target ≥85% line coverage for core diagnostic/fix modules; test critical safety scenarios exhaustively.

## 12. npm distribution
Proposed package manifest excerpt:
```json
{
  "name": "@anandverse/avkit",
  "version": "0.1.0",
  "type": "module",
  "bin": { "avkit": "./dist/cli.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "license": "MIT"
}
```
Add verified Node engine range, scripts, dependencies, repository, exports/types if exposing a programmatic API. Ensure CLI output has a portable Node shebang and executable packaging.

**Publishing checklist:** Create npm account; confirm control of `@anandverse` scope and package-name availability; enable account security; configure trusted publishing where available; run `npm test`, build, `npm pack --dry-run`; install tarball in clean fixtures; publish beta then stable; verify `npx` execution. Scoped public publishing requires appropriate access configuration.

## 13. Quality gates and acceptance criteria
- `doctor` does not alter files in any fixture.
- `fix --dry-run` produces no modifications or package installs.
- Re-running an applied fix does not duplicate configuration.
- All proposed file changes are displayed before confirmation.
- Unknown framework/package manager is handled without crashes or guessed fixes.
- JSON output parses and has stable IDs.
- CLI works in Windows PowerShell, macOS shell, and Linux shell.
- Every released fix has a negative test and a regression test.
- npm tarball contains the actual runnable binary and required assets.

## 14. 30-day roadmap
| Window | Deliverables | Exit gate |
|---|---|---|
| Days 1–7 | Repo, CLI, project detector, `info`, 3 diagnostic rules | Tests pass on fixtures |
| Days 8–14 | Remaining MVP diagnostics, JSON reporter, `fix --dry-run`, 1 safe fix | No-write and safety tests pass |
| Days 15–21 | `init` integrations, cross-platform CI, docs, beta npm release | Clean-install smoke tests pass |
| Days 22–30 | Beta feedback, bug fixes, demos, public release, community launch | No release-blocking defects |

If quality gates fail, ship a smaller stable scope rather than unsafe features.

## 15. Adoption and measurement
**North-star metric:** weekly distinct projects running `doctor` successfully, measured only through explicit opt-in reporting or privacy-preserving user feedback; do not claim install counts equal active users.

Track public npm downloads, GitHub stars/issues, documentation visits (if enabled), reported successful installations, and repeat-use feedback. Aspirational first-month target: 100–500 npm downloads; not a forecast or guarantee. Promote via concise demos, reproducible bug-fix examples, GitHub README, community posts that follow forum rules, and feedback-driven releases.

## 16. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Crowded developer tooling market | Narrow focus on actionable diagnostics and safe fixes |
| Incorrect fixes break projects | Exact preconditions, previews, approval, tests |
| Framework version drift | Explicit support matrix and fixture tests |
| Package manager differences | Detect ambiguity and disable untested actions |
| Low daily engagement | Optimize recurring `doctor` use and CI workflows |
| Scope/name unavailable | Verify npm ownership before publishing |

## 17. Future roadmap
**v1.1:** additional rules, improved JSON/CI output, configurable rule selection.  
**v1.2:** plugin API, additional framework integrations, optional monorepo awareness.  
**v2:** organization policies, IDE integrations, optional privacy-preserving analytics, carefully scoped AI assistance.

## 18. Definition of done
AVKit v1 is ready when it can be installed from npm, identify supported projects, run deterministic read-only diagnostics, preview and safely apply its documented fix recipes, pass cross-platform automated tests, and provide clear installation, usage, troubleshooting, and security documentation.

**Ownership:** AnandVerse Technologies  
**Brand:** AVKit — Build Faster. Fix Smarter.
