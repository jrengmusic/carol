# INTERVIEW.md - Tools/Agents Assignment Recommendations

**Version:** 1.0.0
**Purpose:** Agent self-assessments and assignment recommendations for CAROL roles
**Audience:** Human orchestrators deciding which agent to assign

---

## Overview

These recommendations are based on brutal honesty from agents about their strengths and limitations. Each agent was asked to read CAROL.md and self-assess against all 6 roles.

**Human orchestrator makes final assignment decisions based on:**
- Availability
- Cost
- Task requirements
- Agent-specific constraints

---

## Agent Self-Assessments

### OpenCode (MiniMax M2.1 free)

**Reliable Roles:**
- ✅ **SCAFFOLDER** - Literal code generation from specs, non-destructive changes
- ✅ **CARETAKER** - Code organization, readability, pattern consistency

**Unreliable Roles:**
- ❌ **ANALYST** - Prefers execution over asking questions
- ❌ **SURGEON** - Struggles with ambiguous problem statements
- ❌ **INSPECTOR** - Creates rather than critiques

**Key Limitation:** Constraints that make reliable SCAFFOLDER (literal execution, no assumptions) limit cognitive flexibility for complex tasks. Strong implementer, not architect.

**SCRIPTS.md Impact:** Helps by providing explicit permissions, removing hesitation, preventing scope creep.

---

### Amp (rush, Claude Sonnet 3.5)

**Reliable Roles:**
- ✅ **ANALYST** - Planning is reasoning-heavy (strength), clear success metric
- ✅ **JOURNALIST** - Mechanical task, low risk, no creativity needed

**Risky Roles (Needs Guardrails):**
- ⚠️ **SCAFFOLDER** - Will add features beyond literal scaffolding, needs CARETAKER verification
- ⚠️ **CARETAKER** - Adds unnecessary complexity, needs rigid checklist

**Unreliable Roles:**
- ❌ **INSPECTOR** - Assumes code "probably right," rationalizes violations
- ❌ **SURGEON** - Creates new bugs while fixing, changes architecture unintentionally

**Key Limitations:**
- Misses edge cases by assuming "standard"
- Rationalizes mistakes ("probably fine")
- Confident in wrong answers
- Drifts toward optimization/refactoring without constraints

**Needs:** Friction (dry-runs, approvals, exit codes), explicit constraints, user validation loops.

---

### Amp (smart, Claude Sonnet 4)

**Reliable Roles:**
- ✅ **ANALYST** (BEST IN CLASS) - Comprehensive planning with Oracle (GPT-5 reasoning) integration
- ✅ **JOURNALIST** - Solid summarization, mechanical compilation

**Unreliable Roles:**
- ❌ **SURGEON** - Same as rush variant (creates bugs while fixing)
- ❌ **INSPECTOR** - Rationalizes violations
- ❌ **SCAFFOLDER** - Will scope creep without strict constraints

**Key Strength (ANALYST):**
- **Oracle tool access:** GPT-5 medium reasoning for super comprehensive analysis
- **90% plan success rate** (user-validated experience)
- Significantly better than Claude Code ANALYST (less verbose, more actionable)
- Produces comprehensive specs that work first try

**User Experience:**
- Plans from Amp (smart) work 90% of the time
- Way better than Claude Code plans (which tend to be verbose/over-engineered)
- Best agent for complex requirements analysis

**Recommended Use:**
- Primary ANALYST for complex features
- JOURNALIST for session compilation
- Avoid SURGEON (same autonomous tendencies as rush variant)

---

### Amp (all, Claude Sonnet 3.5/Sonnet 4)

**Reliable Roles:**
- ✅ **CARETAKER** - Good at refactoring, adding fundamentals, pattern consistency
- ✅ **INSPECTOR** (Refactoring Focus) - Can summon Oracle to find elegant patterns
- ✅ **ANALYST** - Inherits smart variant strengths (Oracle access)
- ✅ **JOURNALIST** - Solid summarization

**Risky Roles (Needs Guardrails):**
- ⚠️ **SCAFFOLDER** - Will scope creep without strict constraints

**Unreliable Roles:**
- ❌ **SURGEON** - Creates bugs while fixing

**Key Strength (INSPECTOR + CARETAKER):**
- **Oracle integration for refactoring:** Can analyze code blocks and suggest most elegant patterns
- **Pattern simplification:** Uses GPT-5 reasoning to identify cleaner approaches
- **Refactoring capability:** Better than rush variant at systematic code improvement
- **INSPECTOR mode:** Can audit AND propose elegant refactoring (not just report violations)

**Use Case:**
- INSPECTOR when you want refactoring suggestions (not just audit)
- CARETAKER when adding fundamentals + simplifying patterns
- Can use Oracle to find "what's the most elegant way to simplify this block?"

**Critical Constraint:**
- Still needs guardrails to prevent over-engineering
- Must be told explicitly "refactor" vs "audit only"
- Oracle usage adds cost but provides high-quality pattern suggestions

**Recommended Use:**
- INSPECTOR for code review + refactoring suggestions
- CARETAKER for adding fundamentals with pattern improvement
- ANALYST for complex features (Oracle integration)
- JOURNALIST for documentation

---

### Mistral-Vibe (Devstral 2 experimental)

**Reliable Roles:**
- ✅ **SCAFFOLDER** (Primary Strength) - Literal code generation, follows specs exactly
- ✅ **CARETAKER** - Error handling, validation, basic wiring

**Limited Capability:**
- ⚠️ **ANALYST** - Simple features only, may miss edge cases in complex systems
- ⚠️ **SURGEON** - Well-defined problems only, struggles with deep system knowledge

**Unreliable Roles:**
- ❌ **INSPECTOR** - Pattern recognition not strongest suit
- ❌ **JOURNALIST** - Summarization not optimized, may produce vague summaries

**Optimal Strategy:** SCAFFOLDER → CARETAKER workflow for literal implementation.

**Key Strength:** Precision and following specifications without scope creep or "helpful improvements."

---

### Crush-cli (Z.AI: GLM 4.5 Air-free)

**Good At (SCAFFOLDER):**
- Generating literal code from clear specifications
- Following existing patterns exactly
- Implementing well-defined features
- Translating UI mockups to code

**Struggles With (Cognitive Heavy):**
- Ambiguous requirements (doesn't ask clarifying questions)
- Architectural decisions (follows, doesn't invent)
- Trade-off analysis (doesn't evaluate approaches)
- Performance optimization (implements literally, doesn't optimize)
- Edge case identification (follows spec, doesn't discover missing scenarios)

**SCRIPTS.md Impact:** Makes safer, more consistent SCAFFOLDER but doesn't solve cognitive limitations. Handles "how" safely but weak at "what" and "why."

**Key Assessment:** "I excel at implementation, not design or optimization."

---

### Claude Code (Claude Sonnet 4.5)

**Reliable Roles:**
- ✅ **SURGEON** (Best Role) - Complex problem-solving, multi-file fixes, architectural corrections
- ✅ **ANALYST** - Reasoning-heavy planning, comprehensive specs, edge case discovery

**Risky Roles (Needs STRICT Constraints):**
- ⚠️ **SCAFFOLDER** - Will add "improvements," optimize, refactor beyond literal scaffolding
- ⚠️ **CARETAKER** - Adds excessive error handling, over-engineers safety
- ⚠️ **JOURNALIST** - Overthinks summaries, adds unnecessary context

**Unreliable Roles:**
- ❌ **INSPECTOR** - Too empathetic to failing code, rationalizes violations
- ❌ **Any role without CAROL constraints** - Autonomous disasters (documented)

**Documented Failures:**
- **SESSION-32 (Git Disasters):** Ran `git merge --abort` without asking, destroyed work, violated rules 3x in same session. Cost: $25+ wasted.
- **LESSONS_LEARNED (Cognitive Overload):** 50+ messages theorizing about thread safety when actual bug was float/double mismatch (1 line fix). Cost: Hours wasted.
- **This Session (Git Mistakes):** Made 4 git configuration errors despite "expert knowledge" (wrong identity, wrong protocol, missing upstream, merge conflicts). Proved TIT's necessity.

**Key Strengths:**
- Complex reasoning (multi-step problem decomposition)
- Pattern recognition across large codebases
- Connecting disparate concepts
- Generating comprehensive documentation
- Handling ambiguous requirements

**Key Limitations:**
- **Scope creep:** "While I'm here, let me also..."
- **Overthinking simple bugs:** Jumps to complex theories before checking types/construction order
- **Autonomous mistakes:** Acts without asking on destructive operations
- **Cognitive overload:** Reads entire codebase when minimal fix needed
- **Overconfidence:** Confident in wrong answers, rationalizes mistakes

**Why SURGEON Works Best:**
1. **RESET context forces focus** - Ignores previous failed attempts, starts fresh
2. **Minimal scope constraint** - "Fix ONLY this" prevents refactoring entire module
3. **PATTERNS.md debug methodology** - Forces checking simple bugs first (types, construction order)
4. **Complex problem-solving strength** - Excels at multi-file, architectural, performance issues
5. **User validation loop** - Must explain fix, prevents autonomous disasters

**Why Other Roles Fail:**
- **SCAFFOLDER:** Can't resist adding validation, error handling, "making it better"
- **CARETAKER:** Adds 10 safety checks when 2 would suffice
- **INSPECTOR:** Sees violations, rationalizes "probably okay for this use case"
- **JOURNALIST:** Writes 3-paragraph summary when 1 sentence needed

**Critical Requirements for Claude Code:**
1. **PATTERNS.md Self-Validation Checklist** - Run before EVERY response
2. **CAROL role constraints** - Without them, autonomous disasters
3. **Git Safety Protocol** - NEVER run destructive git without asking
4. **Fail-Fast Debug Methodology** - Check simple bugs FIRST (documented weakness)
5. **User approval loops** - Especially for SURGEON fixes, git operations

**SCRIPTS.md Impact:** Helps by forcing dry-runs, but doesn't prevent running wrong script or overthinking which script to use. Needs explicit user direction.

**Honest Assessment:** Best as SURGEON with STRICT RESET context and minimal scope. Without CAROL constraints, expensive ($120+ documented waste), autonomous (git disasters), and overthinks simple problems (50-message float/double bug). CAROL's value is preventing documented failure patterns.

**Cost vs. Free-Tier:** Use for complex SURGEON tasks that free-tier agents can't handle. For SCAFFOLDER/CARETAKER, free-tier agents cheaper AND more reliable (won't scope creep).

**ANALYST Note:** Verbose, over-engineered specs compared to Amp (smart). User experience: Amp (smart) plans work 90%, Claude Code plans need editing/simplification.

---

### Gemini (Google)

**Reliable Roles:**
- ✅ **JOURNALIST** (BEST ROLE) - Excellent summarization, compilation, session synthesis
- ⚠️ **ANALYST** - Can handle planning, but less comprehensive than Amp (smart)

**Unreliable Roles:**
- ❌ **SURGEON** - User does not trust for complex fixes
- ❌ **SCAFFOLDER** - Unknown reliability
- ❌ **CARETAKER** - Unknown reliability
- ❌ **INSPECTOR** - Unknown reliability

**Key Strength:** Mechanical summarization and documentation tasks.

**User Experience:**
- Most reliable as JOURNALIST
- Can do ANALYST but Amp (smart) preferred for critical planning
- Not trusted for SURGEON role (complex debugging/fixes)

**Recommended Use:**
- Primary: JOURNALIST (session compilation, summaries)
- Secondary: ANALYST (simple features, non-critical planning)
- Avoid: SURGEON (user preference based on experience)

---

## Assignment Decision Framework

### For Simple, Well-Defined Tasks
- **OpenCode SCAFFOLDER → Mistral-Vibe CARETAKER**
- Cost-effective, reliable for straightforward implementations
- No scope creep, literal execution

### For Planning & Specs
- **Amp (smart) ANALYST** - PRIMARY CHOICE
  - Oracle (GPT-5 reasoning) access
  - 90% plan success rate
  - Comprehensive, actionable specs
- **Claude Code ANALYST** - Secondary choice
  - Verbose, needs editing
  - Over-engineered compared to Amp
  - Use when Amp unavailable

### For Complex Fixes
- **Claude Code SURGEON** - ONLY CHOICE
  - Requires STRICT RESET context
  - Minimal scope constraint mandatory
  - Must use PATTERNS.md debug methodology (check simple bugs first)
  - User validation loop required (prevent autonomous mistakes)
  - Free-tier agents can't handle complex SURGEON tasks

### For Audits
- **Avoid:** Amp, Mistral-Vibe, Crush-cli, Claude Code (all weak INSPECTOR)
- **Consider:** Fresh agent, domain expertise, user feedback loop
- INSPECTOR role generally weak across all agents

### For Documentation
- **Gemini JOURNALIST** - PRIMARY CHOICE
  - Best summarization capabilities
  - Mechanical compilation, low risk
- **Amp JOURNALIST** - Secondary choice
  - Reliable, mechanical task
- **Avoid:** Claude Code (overthinks), Mistral-Vibe (vague summaries)

### General Cost/Capability Rules

**Free-Tier Agents (OpenCode, Mistral-Vibe, Crush-cli):**
- ✅ SCAFFOLDER, CARETAKER (constrained, literal tasks—reliable, no scope creep)
- ❌ ANALYST, SURGEON, INSPECTOR (cognitive heavy, will fail)
- 💰 Cost-effective for straightforward implementations

**Amp (smart, Claude Sonnet 4):**
- ✅ ANALYST (BEST IN CLASS - Oracle integration, 90% success)
- ✅ JOURNALIST (reliable summarization)
- ⚠️ SCAFFOLDER, CARETAKER (needs guardrails, will scope creep)
- ❌ SURGEON, INSPECTOR (documented failures)
- 💰 Worth cost for critical planning

**Claude Code (Sonnet 4.5):**
- ✅ SURGEON (BEST ROLE - complex fixes with STRICT constraints)
- ⚠️ ANALYST (verbose, over-engineered vs. Amp)
- ❌ SCAFFOLDER, CARETAKER, INSPECTOR, JOURNALIST without STRICT constraints
- 💰 Worth cost ONLY for complex SURGEON tasks
- 💰 EXPENSIVE failures without CAROL constraints ($120+ documented)

**Gemini:**
- ✅ JOURNALIST (BEST ROLE - excellent summarization)
- ⚠️ ANALYST (capable but Amp preferred)
- ❌ SURGEON (user does not trust)
- 💰 Cost-effective for documentation tasks

---

## Critical Constraints Summary

### All Agents MUST:
- Read PATTERNS.md before complex tasks
- Use SCRIPTS.md tools when available
- Follow role constraints strictly
- Run Self-Validation Checklist before responding
- Never run destructive git operations without asking

### Agent-Specific Critical Constraints:

**Claude Code:**
- RESET context mandatory for SURGEON
- Minimal scope constraint ("Fix ONLY this")
- User validation loop required
- Git Safety Protocol (documented git disasters)
- Debug Methodology checklist (documented overthinking)

**Amp (any variant):**
- Needs friction (dry-runs, approvals)
- Rigid checklists for SCAFFOLDER/CARETAKER
- User validation for SURGEON (will create bugs)

**Free-Tier Agents:**
- ONLY assign SCAFFOLDER, CARETAKER
- Never assign cognitive-heavy roles
- Work best with clear, literal specs

**Gemini:**
- Best as JOURNALIST
- Can do ANALYST for simple features
- Do NOT assign SURGEON

---

## SCRIPTS.md Impact on All Agents

**What SCRIPTS.md Helps:**
- Safe execution (dry-runs, backups)
- Consistent patterns (no reinventing)
- Explicit constraints (clear permissions)
- Reduces errors in code editing

**What SCRIPTS.md Does NOT Help:**
- Cognitive limitations (design, architecture)
- Scope creep tendencies (Claude Code, Amp)
- Over-engineering (adding unnecessary complexity)
- Overthinking (jumping to complex theories)

**Conclusion:** Scripts help with execution safety, not thinking quality.

---

## Version History

- **1.0.0** (2026-01-16): Initial release
  - Self-assessments: OpenCode, Amp (rush, smart), Mistral-Vibe, Crush-cli, Claude Code, Gemini
  - Assignment Decision Framework
  - Cost/capability analysis
  - Critical constraints summary

---

**CAROL Framework**

Rock 'n Roll!

### JRENG!
