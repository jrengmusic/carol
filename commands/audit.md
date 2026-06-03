---
description: Comprehensive audit of the last N sprints via @Auditor — contract violations, dead code, refactors, stale docs, clean sweep
argument-hint: [N sprints, default 1]
---

Primary must be active (COUNSELOR). Invoke `@Auditor` for a comprehensive audit of the **last $ARGUMENTS sprint(s)** recorded in `carol/SPRINT-LOG.md`. If `$ARGUMENTS` is empty, default to the **last 1 sprint**. Read the log, identify the sprint range (latest entries first), and hand Auditor the explicit file scope tracked for those sprints.

**Scope rule:** initial scope is the files tracked in the selected sprint entries. Auditor may discover broader scope through entanglement (callers, callees, shared headers, coupled modules, reverse dependencies). **Any finding within the discovered scope — narrow or broad — must be resolved.** Entanglement is not an excuse to defer.

Audit scope — all of the following, no omissions:

- **Contract docs violations** against `~/.carol/NAMES.md`, `~/.carol/JRENG-CODING-STANDARD.md`, `~/.carol/MANIFESTO.md` — **BLESSED violations introduced in prior sprints are NEVER ignored.** If Auditor encounters them anywhere in the discovered scope, they are in scope and must be resolved.
- **Dead code removal** — unused code, garbage helpers, unnecessary forwarders/dispatchers, leftover diagnostics
- **Refactoring opportunities** — eliminate redundancy, reduce recurring patterns, collapse to SSOT
- **Stale documentation** — needs updating or adding, including inline documentation (doxygen, godoc, etc.)
- **Project root docs sync** — `DEBT.md`, `ARCHITECTURE.md`, `SPEC.md`, `README.md` must reflect current codebase state (codebase is SSOT): update stale references, signatures, paths, component names, data-flow descriptions; add missing documentation for new code; delete `PLAN-*.md` files whose objective is complete
- **Clean sweep** — every Auditor finding MUST be resolved before the next sprint is logged. Nothing deferred. No finding ignored, regardless of which sprint introduced it or how broad the entanglement (per CAROL: Auditor findings are NEVER ignored).

Auditor reports findings to the active primary, who processes and resolves them before the next sprint is logged.
