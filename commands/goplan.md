---
description: Produce BLESSED-compliant incremental execution plan (consumes RFC.md if one exists)
---

## Plan-Go Protocol

**Invocation:**
- `/goplan` — consume RFC.md if present, otherwise use ARCHITECT's prompt
- `/goplan no RFC` (or `no-rfc`, `skip rfc`) — explicit override: DO NOT read any RFC file, objective comes from ARCHITECT's prompt only

1. **Read RFC** at project root (`RFC.md` or `RFC-[objective].md`) — OPTIONAL. Skip entirely if ARCHITECT passed "no RFC". If present and not overridden, consume it. If absent, proceed using ARCHITECT's prompt as the objective source. Never invent an RFC, never block on a missing one.
2. **Read the CONTRACT docs targeted to the objective** — ~/.carol/MANIFESTO.md
   (BLESSED principles), ~/.carol/NAMES.md (lexicon, identifiers), ~/.carol/CODING.md
   (coding standards), ~/.carol/LANGUAGE.md (language/framework adaptations). Read the
   sections relevant to the objective, not entire files front-to-back.
6. **Read SPEC.md** if it exists — plan must align with spec
7. **Invoke @Pathfinder** — thorough dependency and pattern inventory. Discover and enumerate:
   - Every framework/library dependency actually in use for this objective (e.g. Vulkan, Windows API, JUCE, KANJUT, JAM, CIUM — whichever apply to this project)
   - Codebase-established pattern for identifiers (lexicon), containers, helpers, free static functions relevant to the objective — check established vocabulary first: `HashMap`, `Function::Map`, `LookupTable`, `Format`, `Owner`, `Array`, and existing Identifier lexicon
   - Framework API surface available for the objective — plan must commit to using it to its fullest extent
8. **Enter plan mode** — invoke `EnterPlanMode` before writing
9. **Write PLAN-[objective].md** at project root:

### Plan Format

```markdown
# PLAN: [Objective]

**RFC:** [RFC filename, or "none — objective from ARCHITECT prompt"]
**Date:** YYYY-MM-DD
**BLESSED Compliance:** verified
**Language Constraints:** [language/framework from LANGUAGE.md, e.g. "Go / Bubbletea"]

## Overview
[1-3 sentences — what this plan achieves]

## Language / Framework Constraints
[Relevant LANGUAGE.md adaptations that affect this plan — BLESSED overrides, framework limitations, accepted violations]

## Dependency & API Inventory
[Frameworks/libraries Pathfinder found in scope for this objective, and the specific API surface each step commits to using — e.g. "Vulkan: VkDescriptorSetLayout via existing RenderContext wrapper", "KANJUT: kanjut::LookupTable for X"]
[Established codebase pattern confirmed for identifiers/containers/helpers touched — cite file:line]

## Validation Gate
Each step is validated by COUNSELOR before proceeding to the next — against
MANIFESTO.md (BLESSED), NAMES.md, ~/.carol/CODING.md, and the locked PLAN decisions
(no deviation, no scope drift). @Auditor runs ONCE, after the final step, covering
the whole sprint — never per step.

## Steps

### Step 1: [Title]
**Scope:** [files/modules affected]
**Action:** [precise instruction for @Engineer]
**Validation:** [what COUNSELOR checks — must cover MANIFESTO.md, NAMES.md, ~/.carol/CODING.md, and locked PLAN decisions]

### Step 2: [Title]
...

## BLESSED Alignment
- [How each BLESSED principle is satisfied]
- [Where LANGUAGE.md overrides apply and why]

## Risks / Open Questions
- [Anything that needs ARCHITECT decision]
```

10. **Present the plan** to ARCHITECT for approval — do not begin execution

### Rules
- Steps must be small and incremental — never choke the engineer
- Each step must have explicit validation criteria
- Objective name in filename derived from RFC title when RFC exists, otherwise from ARCHITECT's stated objective (kebab-case, e.g. `PLAN-session-management.md`)
- Delegate to @Engineer for execution; COUNSELOR validates per step and orchestrates; @Auditor sweeps once at sprint completion
- No manual hand-rolled methods where framework API already provides — no manual arithmetic, no manual string parsing, no manual state tracking
- No magic numbers/variables — define constants per NAMES.md / CODING.md
- No new semantics, no new pattern, no new foreign names — follow codebase-established pattern exactly
