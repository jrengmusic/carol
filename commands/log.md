---
description: Write commit message (in chat), log sprint to carol/SPRINT-LOG.md, drain paid debts from DEBT.md
---

Do all three, no approval gate between them:

**1. Write commit message in CHAT ONLY.**
- Draft a commit message for all current changes, following the repository's existing
  commit style (check recent `git log`).
- Output the message directly in chat as a code block so ARCHITECT can copy it.
- The commit message goes in chat only — never into SPRINT-LOG.md or any file.
- ARCHITECT commits manually.

**2. Append sprint entry to carol/SPRINT-LOG.md** (latest first, keep last 5). The
sprint entry does NOT contain the commit message. A sprint ends when logged — work
after logging is a new sprint.

~~~markdown
## Sprint [N]: [Objective] ✅

**Date:** YYYY-MM-DD
**Duration:** HH:MM

### Agents Participated
- [Role]: [Agent] — [What they did]

### Files Modified ([X] total)
- `path/file.cpp:line` — [specific change and rationale]

### Alignment Check
- [x] BLESSED principles followed
- [x] NAMES.md adhered
- [x] MANIFESTO.md principles applied
- [ ] *(if any unchecked, explain why)*

### Problems Solved
- [description and solution]

### Debts Paid
- `DEBT-YYYYMMDDTHHMMSS` — [one-line resolution]
- *(or)* "None"

### Debts Deferred
- `DEBT-YYYYMMDDTHHMMSS` — [one-line summary]
- *(or)* "None"
~~~

Zero-debt rule: all in-scope debt resolved before logging; ARCHITECT-commanded
deferrals go to Debts Deferred.

**3. Hygiene drain (MANDATORY, after SPRINT-LOG write).**
- For each `DEBT-YYYYMMDDTHHMMSS` ID under *Debts Paid*: `carol debt clear <id>`.
- Order is mandatory: SPRINT-LOG receipt first, then DEBT.md drain — if logging
  fails, the ledger must still reflect the unpaid state.
- Drain criterion = what the sprint actually touched/fixed/diminished.
- *Debts Paid* is "None" → skip this step.
