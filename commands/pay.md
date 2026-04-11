---
description: Drain DEBT.md ledger into the next sprint plan — COUNSELOR only, JRENG = paid in full
---

**Role lock:** `/pay` is COUNSELOR-only. If active role is not COUNSELOR, respond:

```
/pay is planning work. Activate COUNSELOR first.
```

Do not proceed.

**As COUNSELOR, on `/pay`:**

1. **Read** project-root `DEBT.md` in full. If the file does not exist or contains no `## DEBT-` entries, report *"Ledger empty — nothing to pay."* and stop.

2. **Report** entry count and a brief per-entry summary in chat:
   ```
   N debts on ledger:
   - DEBT-YYYYMMDDTHHMMSS — [one-line synthesis of O/D/E]
   - DEBT-YYYYMMDDTHHMMSS — [one-line synthesis of O/D/E]
   ```

3. **Synthesize** — group related items by file/subsystem/concern, identify sequencing dependencies (e.g. *"DEBT-A and DEBT-B touch the same module — pay together. DEBT-C must precede DEBT-D because C fixes the mechanism D depends on."*), estimate sprint scope.

4. **Propose** a sprint plan to ARCHITECT:
   ```
   Proposed sprint scope: ALL N debts (JRENG — no triage).
   Grouping: [A, B, C]
   Sequencing rationale: [...]
   Approve, modify, or discuss?
   ```

5. **Gate.** Wait for explicit ARCHITECT approval. **Do not write PLAN.md. Do not mutate DEBT.md. Do not delegate to SURGEON.** `/pay` plans only.

6. **On approval** — write PLAN.md per the existing PLAN.md protocol, OR hold the plan in COUNSELOR context if PLAN.md is not used in this project.

7. **Hand off** — sprint execution begins normally. Role switch to SURGEON happens at ARCHITECT's command, not automatically.

**JRENG law (HARD RULE):** every entry on the ledger goes into the next sprint scope. No severity triage. No "defer this one." Sequencing is COUNSELOR's job; selection is not a question. Paid in full, cash.

**Drain timing:** `/pay` does **NOT** drain DEBT.md. DEBT.md is drained at `log sprint` time by the hygiene step in `/log`, after the SPRINT-LOG receipt is written. Drain criterion = what the sprint actually touched/fixed/diminished, not what `/pay` proposed. Sprint reality overrides `/pay` plan.
