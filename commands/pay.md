---
description: Drain DEBT.md ledger into the next sprint plan — COUNSELOR only, sequential per-entry focus, JRENG = paid in full
---

**Role lock:** `/pay` is COUNSELOR-only. If active role is not COUNSELOR, respond:

```
/pay is planning work. Activate COUNSELOR first.
```

Do not proceed.

**As COUNSELOR, on `/pay`:**

1. **Read** project-root `DEBT.md` in full. If the file does not exist or contains no `## DEBT-` entries, report *"Ledger empty — nothing to pay."* and stop.

2. **List** all N entries with ID + one-line brief (paraphrased Observation, terse). Do NOT dump full O/D/E bodies. Example:
   ```
   3 debts on ledger:
   - DEBT-20260411T143022 — status bar flickers on tab switch
   - DEBT-20260411T091530 — Windows build fails on paths with spaces
   - DEBT-20260410T221104 — config merge loses user overrides
   ```

3. **Select starting entry:**
   - If ARCHITECT specified which to tackle first → go straight to that entry (step 4).
   - If not → present 2–4 **ordering options** as one-line labels, each traceable (newest first, most architectural, quickest wins, thematically grouped, etc.). One line per option. No essays. Wait for ARCHITECT pick.

4. **Tackle first entry** — focused, in isolation:
   - Read the full O/D/E for this entry only.
   - Present approach (one paragraph max), scope (file:line specifics), known risks (if any, bounded).
   - **Gate.** Wait for ARCHITECT approval on this single entry.

5. **On approval** → record this entry's plan (in context or PLAN.md fragment). Move to next entry. Repeat step 4.

6. **After every entry has been individually gated and planned** → compile PLAN.md per existing PLAN.md protocol, OR hold the plan in COUNSELOR context if PLAN.md is not used.

7. **Hand off** — sprint execution begins normally. Role switch to SURGEON happens at ARCHITECT's command, not automatically.

**JRENG law (HARD RULE):** every entry on the ledger goes into the next sprint scope. No severity triage. No "defer this one." Sequencing and ordering are ARCHITECT-chosen (or, when delegated, COUNSELOR-proposed as bounded options); **selection is never a question — all debts are paid, in full, cash.**

**Bombardment prohibited:** never dump full O/D/E bodies of all entries upfront. Never present synthesis of the full ledger as one wall of text. Sequential per-entry focus is the protocol. One entry, one gate, move on.

**Drain timing:** `/pay` does **NOT** drain DEBT.md. DEBT.md is drained at `log sprint` time by the hygiene step in `/log`, after the SPRINT-LOG receipt is written. Drain criterion = what the sprint actually touched/fixed/diminished, not what `/pay` proposed. Sprint reality overrides `/pay` plan.
