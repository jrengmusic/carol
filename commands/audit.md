---
description: Comprehensive audit of the last N sprints via @Auditor — code smells, contract violations, dead code, refactors, stale docs, clean sweep, COUNSELOR doxygen pass, then /log
argument-hint: [N sprints, default 1]
---

Primary must be active (COUNSELOR). Invoke `@Auditor` for a comprehensive audit of the **last $ARGUMENTS sprint(s)** recorded in `carol/SPRINT-LOG.md`. If `$ARGUMENTS` is empty, default to the **last 1 sprint**. Read the log, identify the sprint range (latest entries first), and hand Auditor the explicit file scope tracked for those sprints.

**Scope rule:** initial scope is the files tracked in the selected sprint entries. Auditor may discover broader scope through entanglement (callers, callees, shared headers, coupled modules, reverse dependencies). **Any finding within the discovered scope — narrow or broad — must be resolved.** Entanglement is not an excuse to defer.

Audit scope — all of the following, no omissions:

- **Code smells** — find smell signatures: god objects, long functions, deep conditional chains, magic values, shadow state. Cite the MANIFESTO.md rule each smell breaks.
- **Refactoring opportunities** — find repetition and redundancy. Find SSOT contract violations. Collapse duplicate truth into one definition.
- **BLESSED compliance / design-by-contract adherence** against `~/.carol/MANIFESTO.md`, `~/.carol/CODING.md`, `~/.carol/NAMES.md` — **violations introduced in prior sprints are NEVER ignored.** If Auditor encounters them anywhere in the discovered scope, they are in scope and must be resolved.
- **Dead code removal** — unused code, garbage helpers, unnecessary forwarders/dispatchers, leftover diagnostics.
- **Stale documentation** — needs updating or adding: README, inline prose comments, non-doxygen documentation. Doxygen is never an Auditor finding — it is COUNSELOR's dedicated pass, below.
- **Project root docs sync** — `DEBT.md`, `ARCHITECTURE.md`, `SPEC.md`, `README.md` must reflect current codebase state (codebase is SSOT): update stale references, signatures, paths, component names, data-flow descriptions; add missing documentation for new code; delete `PLAN-*.md` files whose objective is complete.
- **Clean sweep** — resolve every Auditor finding before the next sprint is logged. No deferral. No gate. No ratification needed to act on a confirmed finding. Check each finding and claim against BLESSED / Design by Contract before you accept it. Resolve a claim as a real violation only when it cites a contract clause.

Auditor reports findings to the active primary (COUNSELOR), who processes and resolves them. Auditor never runs `/log` — that command belongs to COUNSELOR only.

Once every finding is resolved, COUNSELOR — never Auditor — runs a comprehensive doxygen pass over the audited scope: header-only blocks, zero warnings, every `@param` matches the signature, `@file` matches the filename, markup escaped, no `@copydoc` to external targets (`~/.carol/CODING.md` Doxygen Discipline).

Only after the doxygen pass is clean does the primary run `/log` to close the sprint.
