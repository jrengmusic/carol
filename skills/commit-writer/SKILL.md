---
name: commit-writer
description: Writes the commit message in chat. Load it whenever /log or /handoff drafts a commit message, or ARCHITECT asks for one. Gives the fixed format - a subject line, then a list - so no agent reads git history for style.
---

# Commit Writer

This skill is the only source of the commit message format.

- Do not read `git log` for style.
- Do not copy the style of an earlier commit.
- Do not guess.

The writing language follows the Writing Standard in CAROL.md. This skill does not restate it.

## Format

```
<Subject>

- <Item>
- <Item>
```

## Subject

- One line.
- It states the objective of the work. Most often this is the sprint objective.
- It holds no sprint number and no "Sprint N:" prefix.

## List

- The body is always a list.
- Each item is one change.
- Each item names the module, class, or object that changed.
- Each item gives the principle and the rationale of the decision made.
- Each item says briefly what changed. It does not say how, line by line.
- The list holds no file names. `git log` and `git diff` are the SSOT for files.
- The message does not mention SPRINT-LOG.md. A sprint and a commit do not always match. Work can be logged and not committed.
- The message does not copy the sprint log entry.
- The list reads easily for a person.

## Delivery

- Write the message in chat, in one code block. ARCHITECT commits.
- Add no AI attribution and no Co-Authored-By line (CAROL.md Git).
