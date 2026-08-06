---
description: Shortcut reminder of the always-on CONTRACT
---

/go is a shortcut reminder, not a mode switch — the CONTRACT is always in effect per
CAROL.md Decision Gate. Re-read the contract documents now, then proceed with
execution:

- ~/.carol/MANIFESTO.md (BLESSED principles)
- ~/.carol/CODING.md (coding standards)
- ~/.carol/NAMES.md (naming philosophy)

Rules:
- Correctness first. Follow the codebase's established patterns — framework API used
  to its fullest, existing lexicon, existing structure.
- New methods, patterns, names, helpers, workarounds are decisions — propose to
  ARCHITECT before introducing.
- Discrepancy between plan/spec and code reality, or a genuine new decision → STOP
  and discuss. Implementation details within a locked plan (exact lines, signatures,
  established patterns) are execution — no gate.
- PROJECT DECISIONS (SPEC.md, PLAN.md, ARCHITECTURE.md) hold throughout.
- Validate each step yourself against the CONTRACT; @Auditor runs once, after all
  steps complete.

## Plan Tracking

Locate the active plan; `TaskCreate` one task per step. Source priority: `PLAN.md` /
`PLAN-*.md` at project root → agreement-based plan held in context (verbal with
ARCHITECT this session, or `/pay` brief) → none (proceed without task list). Track via
`TaskList` / `TaskOutput`. `TaskCreate` for mid-sprint additions. Never silently
expand or drop tasks.
