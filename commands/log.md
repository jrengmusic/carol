---
description: Write commit message (in chat), log sprint to carol/SPRINT-LOG.md, drain paid debts from DEBT.md
---

Do all three, no approval gate between them:

**1. Write commit message in CHAT ONLY.**
- Draft a commit message for all current changes, following the repository's existing commit style (check recent `git log`).
- Output the message directly in chat as a code block so ARCHITECT can copy it.
- Do NOT write the commit message into SPRINT-LOG.md or any other file.
- Do NOT run `git commit` yourself — ARCHITECT commits manually.

**2. Append sprint entry to carol/SPRINT-LOG.md** using the format defined in CAROL.md (Sprint [N]: [Objective], Date, Duration, Agents Participated, Files Modified, Alignment Check, Problems Solved, Debts Paid, Debts Deferred). The sprint entry does NOT contain the commit message.

**3. Hygiene drain (MANDATORY, after SPRINT-LOG write).**
- For each `DEBT-YYYYMMDDTHHMMSS` ID listed under *Debts Paid* in the sprint entry, run: `carol debt clear <id>`.
- This removes the paid entry from project-root `DEBT.md`.
- Order is mandatory: **SPRINT-LOG receipt first, then DEBT.md drain.** SPRINT-LOG is the receipt; DEBT.md is the working ledger. Do not drain before logging — if logging fails, the ledger must still reflect the unpaid state.
- If *Debts Paid* is "None", skip this step.
