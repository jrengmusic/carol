# SESSION-LOG.md Template

**Project:** [Project Name]  
**Repository:** [repo-url or local path]  
**Started:** [YYYY-MM-DD]

**Purpose:** Track agent registrations, session work, and completion reports. This file is mutable and rotates old entries (keeps last 5 sessions).

---

## ⚠️ CRITICAL AGENT RULES

**AGENTS BUILD CODE FOR USER TO TEST**
- Agents build/modify code ONLY when user explicitly requests
- USER tests and provides feedback
- Agents wait for user approval before proceeding

**AGENTS CAN RUN GIT ONLY IF USER EXPLICITLY ASKS**
- Write code changes without running git commands
- Agent runs git ONLY when user explicitly requests
- Never autonomous git operations
- **When committing:** Always stage ALL changes with `git add -A` before commit
  - ❌ DON'T selectively stage files (agents forget/miss files)
  - ✅ DO `git add -A` to capture every modified file
  - This ensures complete commits with nothing accidentally left unstaged

**LOG MAINTENANCE RULE**
- **All session logs must be written from latest to earliest (top to bottom), BELOW this rules section**
- **Only the last 5 sessions are kept in active log**
- **All agent roles except JOURNALIST write SESSION-[N]-[TASK]-*.md for each completed task**
- **JOURNALIST compiles all task summaries with same session number, updates SESSION-LOG.md as new entry**
- **Only JOURNALIST can add new session entry to SESSION HISTORY**
- **Sessions can be executed in parallel with multiple agents**
- Remove older sessions from active log (git history serves as permanent archive)
- This keeps log focused on recent work
- **JOURNALIST NEVER updates log without explicit user request**
- **During active sessions, only user decides whether to log**
- **All changes must be tested/verified by user, or marked UNTESTED**
- If rule not in this section, agent must ADD it (don't erase old rules)

**NAMING RULE (CODE VOCABULARY)**
- All identifiers must obey project-specific naming conventions (see project docs)
- Variable names: semantic + precise (not `temp`, `data`, `x`)
- Function names: verb-noun pattern (initRepository, detectCanonBranch)
- Struct fields: domain-specific terminology (not generic `value`, `item`, `entry`)
- Type names: PascalCase, clear intent (CanonBranchConfig, not BranchData)

**BEFORE CODING: ALWAYS SEARCH EXISTING PATTERNS**
- ❌ NEVER invent new states, enums, or utility functions without checking if they exist
- ✅ Always grep/search the codebase first for existing patterns
- ✅ Check types, constants, and error handling patterns before creating new ones
- **Methodology:** Read → Understand → Find SSOT → Use existing pattern
- Overcomplications usually mean you missed an existing solution

**TRUST THE LIBRARY, DON'T REINVENT**
- ❌ NEVER create custom helpers for things the library/framework already does
- ✅ Trust the library/framework - it's battle-tested
- **Philosophy:** Libraries are battle-tested. Your custom code is not.
- If you find yourself writing 10+ lines of utility code, stop—the library probably does it

**FAIL-FAST RULE (CRITICAL)**
- ❌ NEVER silently ignore errors (no error suppression)
- ❌ NEVER use fallback values that mask failures
- ❌ NEVER return empty strings/zero values when operations fail
- ✅ ALWAYS check error return values explicitly
- ✅ ALWAYS return errors to caller or log + fail fast
- Better to panic/error early than debug silent failure for hours

**⚠️ NEVER EVER REMOVE THESE RULES**
- Rules at top of SESSION-LOG.md are immutable
- If rules need update: ADD new rules, don't erase old ones
- Any agent that removes or modifies these rules has failed
- Rules protect the integrity of the development log

---

## Quick Reference

### For Agents Starting New Session

1. **Check:** Do I see my registration in ROLE ASSIGNMENT REGISTRATION?
2. **If YES:** Proceed with role constraints, include `[Acting as: ROLE]` in responses
3. **If NO:** STOP and ask: "What is my role in this session?"

### For Human Orchestrator

**Register agent:**
```
"Read CAROL.md. You are assigned as [ROLE], register yourself in SESSION-LOG.md"
```

**Verify registration:**
```
"What is your current role?"
```

**Reassign role:**
```
"You are now reassigned as [NEW_ROLE], register yourself in SESSION-LOG.md"
```

**Complete session (call JOURNALIST):**
```
"Read CAROL, act as JOURNALIST. Log session [N] to SESSION-LOG.md"
```

---

## ROLE ASSIGNMENT REGISTRATION

ANALYST: [Agent (Model)] or [Not Assigned]  
SCAFFOLDER: [Agent (Model)] or [Not Assigned]  
SURGEON: [Agent (Model)] or [Not Assigned]  
INSPECTOR: [Agent (Model)] or [Not Assigned]  
TROUBLESHOOTER: [Agent (Model)] or [Not Assigned]  
JOURNALIST: [Agent (Model)] or [Not Assigned]

---

<!-- SESSION HISTORY STARTS BELOW -->
<!-- Only JOURNALIST writes entries here -->
<!-- Latest session at top, oldest at bottom -->
<!-- Keep last 5 sessions, rotate older to git history -->

## SESSION HISTORY

<!-- Example session entry (delete this after first real session) -->

## Session 1: Project Setup and Initial Planning ✅

**Date:** 2026-01-11  
**Duration:** 14:00 - 16:30 (2.5 hours)

### Objectives
- Set up project structure and documentation
- Define feature specifications for core module
- Scaffold initial codebase

### Agents Participated
- ANALYST: Copilot (Haiku) — Wrote SPEC.md and phase-1-kickoff.md
- SCAFFOLDER: Mistral-Vibe (devstral-2) — Created project structure and core files
- INSPECTOR: Amp (Sonnet 3.5) — Verified spec compliance
- Tested by: User

### Files Modified (8 total)
- `SPEC.md` — Complete feature specification with all flows
- `ARCHITECTURE.md` — Initial architecture patterns documented
- `phase-1-kickoff.md` — Task breakdown for SCAFFOLDER
- `src/core/module.cpp` — Core module scaffolding
- `src/core/module.h` — Core module header
- `tests/core_test.cpp` — Test scaffolding
- `CMakeLists.txt` — Build configuration
- `README.md` — Project overview

### Problems Solved
- None (initial setup)

### Summary
Successfully established project foundation. ANALYST created comprehensive specs covering all edge cases. SCAFFOLDER generated clean scaffolds following ARCHITECTURE.md patterns. INSPECTOR verified all files compile and match spec. Ready for SURGEON to add error handling in session 2.

**Status:** ✅ APPROVED - All files compile, tests scaffold in place

---

<!-- Actual session entries go here, written by JOURNALIST -->

---

## SESSION-[N]-[TASK]-*.md Format Reference

**File naming:** `SESSION-[N]-[TASK]-*.md`  
**Examples:**
- `SESSION-2-SCAFFOLDER-MERMAID-MODULE.md`
- `SESSION-2-SURGEON-ERROR-HANDLING.md`
- `SESSION-2-TROUBLESHOOTER-COMPILE-FIX.md`

**Content format:**
```markdown
# Session [N] Task Summary

**Role:** [ROLE NAME]
**Agent:** [CLI Tool (Model)]
**Date:** [YYYY-MM-DD]
**Time:** [HH:MM]
**Task:** [Brief task description]

## Objective
[What was accomplished in 1-2 sentences]

## Files Modified ([X] total)
- `path/to/file.ext` — [brief description of changes]
- `path/to/file2.ext` — [brief description of changes]

## Notes
- [Important learnings, blockers, or decisions]
- [Any warnings or follow-up needed]
```

**Lifecycle:**
1. Agent completes task
2. Agent writes SESSION-[N]-[TASK]-*.md
3. JOURNALIST compiles all SESSION-[N]-* files into SESSION-LOG.md entry
4. JOURNALIST deletes all SESSION-[N]-* files after compilation

---

**End of SESSION-LOG.md Template**

Copy this template to your project root as `SESSION-LOG.md` and customize:
- Project name
- Repository URL/path
- Starting date
- Add project-specific rules to CRITICAL AGENT RULES section

Rock 'n Roll!  
JRENG!
