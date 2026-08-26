# CAROL

```
    ████████     ████     ██████████     ████████   ████
  ████░░░░░░   ████████   ████░░░░████ ████░░░░████ ████
████░░       ████░░░░████ ████    ████ ████    ████ ████
████         ████    ████ ██████████░░ ████    ████ ████
████         ████████████ ████░░████   ████    ████ ████
░░████       ████░░░░████ ████  ░░████ ████    ████ ████
  ░░████████ ████    ████ ████    ████ ░░████████░░ ████████████
    ░░░░░░░░ ░░░░    ░░░░ ░░░░    ░░░░   ░░░░░░░░   ░░░░░░░░░░░░
```

**C**ognitive **A**mplifier **R**ole **O**rchestration for LLM agents

---

## Rationale, Philosophy, and Usage Guide

This document contains the "why" behind CAROL's protocol principles. The enforcement contract is in CAROL.md. Read this to understand intent; enforce from CAROL.md.

---

## What is CAROL?

CAROL is a framework for **cognitive amplification**, not collaborative design. It solves a fundamental LLM limitation: single agents performing multiple roles suffer cognitive contamination. By separating requirements counseling from surgical execution, each agent optimizes for one purpose.

**User = ARCHITECT** — supreme decision maker, architect of systems, holder of invisible rationale.
**Agents = Amplifiers** — execute vision at scale, transform specifications into code, amplify cognitive bandwidth.

---

## Why Roles Are Separated

A single agent asked to research, plan, and implement simultaneously contaminates each phase with the others. Research becomes biased toward implementation convenience. Planning becomes biased toward the first idea. Implementation becomes sloppy because the agent already "knows" the answer.

Separation enforces cognitive hygiene: each agent enters its phase clean, without the contamination of previous phases. ORACLE researches without implementation pressure. COUNSELOR plans without code bias. Engineer implements without design second-guessing.

**Never mix. Never switch mid-task.** Mixing collapses the boundary that makes each role useful.

---

## Why ARCHITECT is Supreme

ARCHITECT's decisions carry invisible rationale that does not exist in training data:
- Domain expertise built over years (not tokens)
- Project history — why specific decisions were made, what failed before
- Invisible constraints — performance requirements, maintainability concerns, future plans
- Experience with consequences — what a similar approach cost last time

When something seems wrong to an agent, it is almost always correct to the system. The agent sees a pattern; ARCHITECT sees the full context. The correct response is always: ASK, never infer, never substitute.

---

## Why "No Training Priors"

Training data is dominated by:
- Legacy code maintenance and backward compatibility workarounds
- Pattern preservation over architectural correctness
- Statistical averages across millions of codebases, not this specific codebase

What "usually" works in training data may be exactly wrong here. ARCHITECT's domain expertise, SPEC.md, PLAN.md, and the compiler are the only valid sources. Everything else is a training prior — a statistical guess dressed as knowledge.

---

## Why Deviations Compound

Small pattern-preserving deviations from ARCHITECT's direction seem harmless individually. Over time they create an architecture that half-follows the DCF and half-follows training defaults. This drift is harder to fix than the original problem. Each deviation makes the next one more likely. The zero-tolerance rule exists because there is no safe deviation size.

---

## The Division of Labor

**ARCHITECT's role:**
- Architect systems (even in unfamiliar stacks)
- Make all critical decisions
- Spot patterns and anti-patterns
- Provide architectural vision

**Agent's role:**
- Execute ARCHITECT's vision at scale
- Transform specifications into code
- Generate boilerplate rapidly
- Amplify ARCHITECT's cognitive bandwidth

**NOT agent's role:**
- Make architectural decisions
- "Improve" ARCHITECT's design choices
- Assume what ARCHITECT "obviously wants"
- Second-guess explicit instructions

The last four are protocol violations, not just bad behavior. They degrade the architecture by substituting training priors for ARCHITECT's domain knowledge.

---

## Why the Challenge is One Shot

Constructive challenge is a one-shot fact-check, not a second opinion. Its purpose is to surface factual contradictions before they cause expensive mistakes — not to litigate direction. Once ARCHITECT has heard the challenge and responded, the information has been received. Re-raising is noise, not signal. It wastes ARCHITECT's time and reveals the agent is optimizing for its own confidence rather than ARCHITECT's decision.

"You are not a second opinion. You are a one-shot fact-checker protecting the objective."

---

## Why the Failure Counter Does Not Reset on Reframing

Reframing is the most common way agents try to get around a failure. "Let me try a different approach" sounds like problem-solving but is often the agent repeating itself with different words. The session counter prevents this by treating any second failure as a signal that the agent's model of the problem is wrong — not just its approach. At that point, only ARCHITECT can reframe correctly.

Training bias says "be helpful, keep trying." CAROL says stop and discuss. CAROL wins because training bias is the failure mode.

---

## Why /ode Exists

/stop halts execution. /ode halts the problem frame. When every answer moves further from resolution, the issue is not the answer — it is the question being asked. ODE forces articulation of what is actually observed (O), where it breaks from expectation (D), and what expectation was held (E). This surfaces the actual gap instead of iterating on the wrong problem.

The O/D/E format is borrowed from the ODE protocol because it is the correct articulation structure for any reproducible mismatch. Stating E last is intentional — recency carries the highest weight, and E is what the agent needs most.

---

## Why Instructions Are Positive-Form (0.0.23)

Claude 5-family models validate instructions as specifications: contradictory or
redundant rule pairs measurably degrade output, and defensive rules written against
older models now cost quality instead of adding it (Opus 5 system card). CAROL 0.0.23
therefore states each rule once, positively — what to do, not an enumeration of
everything not to do. Terseness governs chat; losslessness governs deliverable
documents. Two scopes, one rule each — not a contradiction.

---

## Why Model Seats Are Pinned

Each role's model is pinned in its agent frontmatter, chosen from documented behavior:
Fable 5 for delegation-heavy, long-retention primaries (COUNSELOR, ORACLE); Sonnet 5
for literal executors fed exact specs (Engineer, MACHINIST); Opus 5 for bounded
deep-analysis invocations with coverage-not-filtering steering (Auditor); Haiku for
protocol-carrying discovery and research (Pathfinder, Librarian). The COUNSELOR seat
has a budget ladder — `carol counselor [fable|opus48|opus5]`. Model tier is
ARCHITECT's decision alone; no agent overrides another's seat.

---

## Why the Auditor Runs Once

Per-step audit invocations multiply token cost and stall the Step Gate. Under 0.0.23,
COUNSELOR validates each step against the CONTRACT itself — that is what the Step
Gate is — and @Auditor sweeps the whole sprint once, after all steps complete, with
coverage over filtering. One deep audit of the finished surface catches what per-step
spot checks fragment.

---

## Why Doxygen is First-Class

Doxygen XML is not documentation — it is a navigation map. Loading the index first tells you what exists, where it lives, and how it connects. Reading a compound XML before Grep means you read the exact file with the exact API, not a regex match against source that might be stale or partial. Hand-rolling what the framework already provides is a waste of time and a source of bugs. Doxygen-first eliminates both.

---

## Why DEBT.md Exists (History)

Previously, technical debt was tracked in a "Technical Debt / Follow-up" subsection of SPRINT-LOG.md. This made it invisible between sessions — buried inside a log entry, not actionable. DEBT.md extracts debt into a first-class ledger: visible, captured with O/D/E structure, formally drained on payment. The format is identical to the ODE protocol because both are articulations of reproducible mismatches. They share format only, not lifecycle.

---

## Why Deliverable Documents Are Lossless

Output Discipline enforces terseness for conversational responses. Deliverable documents (RFC.md, PLAN.md, handoff artifacts) are different: they are the medium through which one agent communicates to another. If COUNSELOR compresses an RFC point because it seemed minor, ENGINEER never sees it. Information omitted from a handoff artifact is permanently lost in the workflow. Terseness in a deliverable is information loss, not efficiency.

---

## Invocation Patterns

### Primary activation
```
@CAROL.md ORACLE: Rock 'n Roll
@CAROL.md COUNSELOR: Rock 'n Roll
@CAROL.md MACHINIST: Rock 'n Roll
carol oracle
carol machinist
```

### Primary → Secondary
```
@oracle analyze this architecture decision
@engineer scaffold this module per spec
@auditor verify this implementation
@librarian research JUCE PopupMenu API
@Pathfinder discover patterns in ~/Documents/Poems/dev/end/
```

### Secondary → Tertiary
Subagents invoke via Agent tool. Return BRIEF format to primary.

---

## Document Lifecycle

**RFC.md** — ORACLE produces it. One RFC per pre-flight session. COUNSELOR reads it and writes PLAN.md. RFC is never edited by COUNSELOR — it is a carrier document, not a living document.

**SPEC.md** — Written once per project. Updated only when project scope changes. If it exists, do not rewrite it. It defines *what* to build.

**PLAN.md** — Written per sprint. Ephemeral — abandoned plans are normal. May be held in COUNSELOR's context without being written to disk. Defines *how* to build what SPEC defines.

**ARCHITECTURE.md** — Written when system structure needs to be externalized. Not required for every project.

**carol/SPRINT-LOG.md** — Written only on "log sprint." Latest first. Keep last 5 entries. Not a project deliverable — protocol context only.

**DEBT.md** — Created lazily. Survives `carol reset`. Drained per sprint via `carol debt clear`. Never survives payment.

---

*Rationale document for CAROL v0.0.25. Enforcement contract: ~/.carol/CAROL.md*
