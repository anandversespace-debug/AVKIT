# AVKit (`@anandverse/avkit`)

Open-source developer workflow CLI for diagnosing and safely repairing project configuration problems in JavaScript and TypeScript repositories.

---

## Commands

- `avkit info`: Inspect project framework, runtime, package manager, and tooling status.
- `avkit doctor`: Run deterministic, read-only configuration diagnostics.
- `avkit fix`: Preview and safely apply remediations with explicit approval.
- `avkit init`: Guided onboarding for Prettier, ESLint, and Vitest.

---

## Safety Invariants

- **Read-Only by Default:** `avkit doctor` and `avkit info` perform 0 writes and 0 installs.
- **Preview First:** `avkit fix` provides exact diff previews and requires explicit confirmation.
- **Concurrency Guard:** Aborts if any target file was modified after the plan was created.
- **Zero Secret Leakage:** Audits environment variables without reading or printing secret values.
- **Path Traversal Protection:** All filesystem operations verify boundaries inside the project root.

---

## License

MIT (c) 2026 AnandVerse Technologies.
