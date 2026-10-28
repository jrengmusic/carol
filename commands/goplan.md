---
description: Produce BLESSED-compliant incremental execution plan (consumes RFC.md if one exists) - COUNSELOR
---

## Plan-Go Protocol

**Invocation:**
- `/goplan` — consume RFC.md if present, otherwise use ARCHITECT's prompt
- `/goplan no RFC` (or `no-rfc`, `skip rfc`) — explicit override: DO NOT read any RFC file, objective comes from ARCHITECT's prompt only

1. Load the `plan-writer` skill. Follow its steps 1 to 4 exactly (RFC, contract documents, SPEC.md, Pathfinder inventory).
2. **Enter plan mode** — invoke `EnterPlanMode` before writing.
3. Follow `plan-writer` step 5 exactly: write `PLAN-[objective].md` at the project root, in the skill's format.
4. **Present the plan** to ARCHITECT for approval — do not begin execution.

### Execution (COUNSELOR)

After ARCHITECT approves and runs `/go`, COUNSELOR executes the locked plan:

- Delegate to @Engineer for execution; COUNSELOR validates per step and orchestrates; @Auditor sweeps once at sprint completion.
