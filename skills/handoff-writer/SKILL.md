---
name: handoff-writer
description: Writes a handoff entry that freezes session state so a later session resumes exactly where this one stopped. Load it whenever /handoff runs or ARCHITECT asks COUNSELOR or MACHINIST for a handoff. Gives the destination rule, the fixed structure, and the evidence rules, so no agent reads an old handoff for style.
---

# Handoff Writer

This skill is the only source of the handoff format.

- Do not copy the style of an earlier handoff.
- Do not guess.
- Write no claim that a read, a run, or a citation does not support.

The writing language follows the Writing Standard in CAROL.md. This skill does not restate it.

## What the handoff is

- It is an ephemeral artifact. It freezes the state of work in progress for a later session.
- The later session can be a different session of the same primary. The entry names the primary that wrote it.
- It is not an RFC. An RFC asks for decisions (`rfc-writer` skill). A handoff records where the work stopped and what comes next.
- It is lossless for the facts a later session needs: every ruling, every file, every pending check.

## When

- ARCHITECT runs `/handoff`, or asks COUNSELOR or MACHINIST for a handoff.
- No primary writes a handoff on its own initiative.

## Destination

The primary decides the destination.

1. COUNSELOR appends the entry to `carol/SPRINT-LOG.md`. Never replace the log.
2. MACHINIST writes the entry to `HANDOFF-<subject>.md`. `<subject>` is a kebab-case name for the work, like the objective of an RFC. MACHINIST has no SPRINT-LOG (machinist.md, Completion).
3. The folder of the MACHINIST file is the one ARCHITECT names. If ARCHITECT says "here", it is the working directory.
4. A new entry for the same subject replaces the whole `HANDOFF-<subject>.md`. The file holds one handoff: the latest for that subject. A second subject gets its own file.

## Evidence rules

1. Every fact cites its evidence: file:line, doc quote, command output, or the RFC section that holds it.
2. ARCHITECT's rulings are quoted verbatim in `Key Decisions`. A ruling that the entry paraphrases is a new decision, and no entry records one.
3. State what is verified and what is not. A check not yet run goes in `Remaining`, with the exact command.
4. A decision that ARCHITECT did not make is an open question. It is not a key decision.
5. The entry holds no commit message. The commit message goes in chat (`commit-writer` skill).

## Structure

```markdown
## Handoff to <primary>: <Objective>

**From:** <primary that wrote it>
**Date:** YYYY-MM-DD
**Status:** In Progress | Blocked | Ready for Implementation

### Read First
- <file or document, with the reason to read it>

### Context
<what the work was and why>

### Completed
- <what was done, with file:line or command evidence>

### Remaining
- <what still needs to happen, in order. Each item names its owner and, for a check, the exact command>

### Key Decisions
- <ARCHITECT's ruling, quoted verbatim>

### Files Modified
- `path/file` — <what changed>

### Open Questions
- <unresolved items, with the decider>

### Next Steps
- <where to pick up, and the trigger that starts it>
```

- `Read First` is an ordered list. The first item is the document that holds the plan, usually an RFC.
- An empty section stays in the entry with the words `None.` A section is never removed.
- `Next Steps` names the trigger when ARCHITECT gave one, for example "when ARCHITECT says scout is updated".

## Delivery

- Write the entry at the destination above. ARCHITECT commits.
- Report the path in chat. Do not repeat the entry in chat.
