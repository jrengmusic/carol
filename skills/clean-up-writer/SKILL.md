---
name: clean-up-writer
description: The format of CLEAN-UP-<subject>.md, the JANITOR campaign tracker at the repository root. Load it to read, review, or audit a tracker. JANITOR never writes the tracker by hand; the tools write it.
---

# Clean-Up Writer

This skill is the only source of the `CLEAN-UP-<subject>.md` format.

## File

- **Path:** the repository root, `CLEAN-UP-<subject>.md`. `<subject>` is kebab-case.
- **Writer:** `~/.carol/local/janitor/tracker.lua` only.
  - `scan.lua` creates the file.
  - `tracker.lua --flag` changes a row's action.
  - `fix.lua` marks rows and recounts.
- **Lifecycle:** each `fix.lua` batch commits the tracker with the batch files.

## Structure

```markdown
# CLEAN-UP — <subject>
Date: <YYYY-MM-DD>
Status: <In Progress | Complete>
Contract: <CODING.md heading>; <CODING.md heading>

## Objective
<One sentence: the invariant that the campaign enforces.>

## Scope
- <path>

## Tracker

| ID | File | Lines | Rule | Kind | Action | Status | Batch | Notes |
|----|------|-------|------|------|--------|--------|-------|-------|
| 001 | path/to/File.cpp | 8 | special-operators | `&&` operator | fix | PENDING |  |  |

## Progress
- Total: <N>
- Done: <N>
- Flagged: <N>
- Pending: <N>
```

## Rules

1. **Closed status set:** `PENDING`, `DONE`, `FLAGGED`.
2. **Closed action set:** `fix`, `flag`. Only a `PENDING` fix row can become a flag.
3. **DONE needs evidence:** `fix.lua` marks a row `DONE` only after `saw patch`, the parse check, and a rescan pass.
4. **A `|` in a cell is written `\|`.**
5. **Audit:** the batch commits name their row IDs. `git log` plus the tracker give the full trail. `scan.lua --check` after the campaign must list only `FLAGGED` rows.
