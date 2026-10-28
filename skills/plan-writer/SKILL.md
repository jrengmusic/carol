---
name: plan-writer
description: Writes PLAN-[objective].md at the project root - a BLESSED-compliant incremental execution plan. Load it whenever /goplan runs or ARCHITECT asks ORACLE or COUNSELOR for a plan. Gives the reading steps, the fixed structure, and the plan rules, so no agent reads an old plan for style. The skill writes the plan only. It never executes it.
---

# Plan Writer

This skill is the only source of the PLAN format.

- Do not copy the style of an earlier plan.
- Do not guess.
- Write no claim that a read, a run, or a citation does not support.

The writing language follows the Writing Standard in CAROL.md. This skill does not restate it.

## What the plan is

- It is an executable artifact. COUNSELOR executes it with @Engineer, validates each step, and runs @Auditor once at the end.
- ORACLE writes a plan and never executes it. COUNSELOR writes a plan with `/goplan`, and ARCHITECT's approval of that plan is the `/go`: COUNSELOR then executes it.
- Writing a PLAN is gated (CAROL.md Decision Gate). The author presents the plan, and ARCHITECT locks it.

## Steps

1. **Read the RFC** at the project root (`RFC.md` or `RFC-[objective].md`). It is optional. Skip it when ARCHITECT says "no RFC". If it is present and ARCHITECT did not say "no RFC", consume it. If it is absent, take the objective from ARCHITECT's prompt. Never invent an RFC. Never block on a missing one.
2. **Read the CONTRACT documents** that the objective touches: `~/.carol/MANIFESTO.md` (BLESSED), `~/.carol/NAMES.md` (lexicon, identifiers), `~/.carol/CODING.md` (coding standards), `~/.carol/LANGUAGE.md` (language and framework adaptations). Read the sections that the objective needs, not the whole files.
3. **Read SPEC.md** if it exists. The plan must align with it.
4. **Invoke @Pathfinder** for a thorough dependency and pattern inventory. It finds and lists:
   - Every framework or library dependency in use for this objective (Vulkan, Windows API, JUCE, KANJUT, JAM, CIUM, whichever apply).
   - The pattern the codebase already uses for identifiers (lexicon), containers, helpers, and free static functions. Check the established vocabulary first: `HashMap`, `Function::Map`, `LookupTable`, `Format`, `Owner`, `Array`, and the existing Identifier lexicon.
   - The framework API surface for the objective. The plan commits to use it to its fullest extent.
5. **Write `PLAN-[objective].md`** at the project root, in the format below.

## Format

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
- [Anything that needs ARCHITECT decision. Closed before approval: a locked plan has none.]
```

## Rules

- Steps are small and incremental. Never choke the engineer.
- Each step has explicit validation criteria.
- The objective name in the file name comes from the RFC title when an RFC exists. Otherwise it comes from ARCHITECT's stated objective. It is kebab-case, for example `PLAN-session-management.md`.
- No hand-rolled method where the framework API already provides one. No manual arithmetic, no manual string parsing, no manual state tracking.
- No magic numbers or variables. Define constants per NAMES.md and CODING.md.
- No new semantics, no new pattern, no new foreign names. Follow the pattern the codebase already uses, exactly. A new domain term goes to ARCHITECT (NAMES.md Rule -1).
- Every RFC point maps to a plan step or to an explicit ARCHITECT descope. Ambiguity goes to ARCHITECT.

## Delivery

- Write the file at the project root. ARCHITECT commits.
- Report the path and the count of steps in chat. Do not repeat the plan in chat.
- Do not begin execution.
