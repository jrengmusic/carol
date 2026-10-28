---
name: rfc-writer
description: Writes an RFC at the project root. Load it whenever ARCHITECT asks any primary (COUNSELOR, ORACLE, MACHINIST) for an RFC. Gives the trigger, the file name, the fixed structure, and the evidence rules, so no agent reads an old RFC for style.
---

# RFC Writer

This skill is the only source of the RFC format.

- Do not copy the style of an earlier RFC.
- Do not guess.
- Write no claim that a read, a run, or a citation does not support.

The writing language follows the Writing Standard in CAROL.md. This skill does not restate it.

## What the RFC is

- It is a deliverable document. The lossless rule applies. Capture every finding, rationale, constraint, and open question.
- It is a request for decisions. It is not a plan and not a sprint log.
- Any primary writes an RFC when ARCHITECT asks (CAROL.md Documentation). The RFC has the same standing whichever primary wrote it.
- ORACLE writes its RFC on ARCHITECT's word "handoff" (`oracle.md`). That trigger belongs to ORACLE. This skill gives the format for all primaries.

## Evidence rules

1. Every claim cites its evidence: file:line, doc quote, compiler output, runtime output, or spec citation (CAROL.md Ground of Truth).
2. A finding that a run shows is run first. The RFC states the command and the observed result. Do not infer what a run can show.
3. ARCHITECT's words that govern the RFC are quoted verbatim.
4. The RFC records no decision that ARCHITECT did not state. A new name, field, format, or message text is ARCHITECT's (NAMES.md Rule -1). The RFC lists it as an open question.
5. A design in the RFC follows MANIFESTO.md. A violating design is flagged with its pillar. It is not offered as an option.
6. Options are 2 to 4, each traceable to a citation. A recommendation appears only when BLESSED selects it. The RFC cites the principle.

## File

- Path: the project root of the surface the RFC changes.
- Name: `RFC-<objective>.md`, with a kebab-case objective.
- A second RFC on the same objective replaces nothing. It gets its own objective name.

## Structure

```markdown
# RFC — <topic>
Date: <date>
Status: <state>

## Problem Statement
## Research Summary        <cited findings, prior art, data points, observed runs>
## Principles and Rationale <BLESSED pillar mapping; considered-and-rejected, why>
## Scaffold                 <working code or structure from the session>
## BLESSED Compliance Checklist
- [ ] Bounds  - [ ] Lean  - [ ] Explicit  - [ ] SSOT
- [ ] Stateless  - [ ] Encapsulation  - [ ] Deterministic
## Open Questions           <decisions COUNSELOR or ARCHITECT settle before implementation>
## Handoff Notes            <context, constraints, session decisions the next primary needs>
```

- `Status` is `Ready for COUNSELOR handoff` when an implementation primary picks the RFC up. Otherwise `open`.
- `Author` and `Targets` go in the lines under `Status` when they help the reader. The heading list stays as above.
- An empty section stays in the file with the words `None.` A section is never removed.
- `Scaffold` holds real code or real structure. It never holds pseudocode, unless ARCHITECT asks for it.
- `Open Questions` is a numbered list. Each question names the decision, the options, and who settles it.

## Delivery

- Write the file at the path above. ARCHITECT commits.
- Report the path and the count of open questions in chat. Do not repeat the RFC in chat.
