---
name: goplan
description: Produce BLESSED-compliant incremental execution plan (consumes RFC.md if one exists) - COUNSELOR
---

## Plan-Go Protocol

**Invocation:**
- `/goplan` — consume RFC.md if present, otherwise use ARCHITECT's prompt
- `/goplan no RFC` (or `no-rfc`, `skip rfc`) — explicit override: DO NOT read any RFC file, objective comes from ARCHITECT's prompt only

1. Load the `plan-writer` skill. Follow its steps 1 to 4 exactly (RFC, contract documents, SPEC.md, Pathfinder inventory).
2. Follow `plan-writer` step 5 exactly: write `PLAN-[objective].md` at the project root, in the skill's format.
3. **Present the plan for approval** — write the same plan to `<Artifact Directory>/PLAN-[objective].md` with `ArtifactMetadata: { UserFacing: true, RequestFeedback: true, Summary: "..." }`. Do not re-summarize the plan in chat. Stop and wait for ARCHITECT to approve (`Proceed`).

### Execution (COUNSELOR)

ARCHITECT's approval (`Proceed` or `/go`) locks the plan. COUNSELOR executes the locked plan to its endpoint at once. Run the `/go` re-read of the contract documents first:

- Delegate to @Engineer for execution; COUNSELOR validates per step and orchestrates; @Auditor sweeps once at sprint completion.
