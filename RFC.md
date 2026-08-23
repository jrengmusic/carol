# RFC — COUNSELOR Warm-Up and Evidence Discipline

**For:** MACHINIST
**Target:** `~/.carol/COUNSELOR.md` (and, where noted, `~/.carol/CAROL.md`)
**Origin:** cast/jam convergence session, 2026-08-23/24
**Status:** Proposed — ARCHITECT ratifies before MACHINIST applies

---

## 1. Problem

COUNSELOR required ARCHITECT to spoonfeed facts that were already written down, across
an entire session. The failures were not judgement failures. They were reading failures,
and each one has a signature that a rule can catch.

Observed, with evidence:

1. **Prose asserted as behaviour.** COUNSELOR reported that the `format` column,
   backtick-as-`toLiteral`, and blank-cell inheritance were unimplemented in the engine.
   All three are implemented, at `cast/Source/Model.h:221-244`. The claim came from
   reading `SPEC.md` and treating its wording as a description of the code.

2. **Pattern imported from the wrong project.** `jam_Generated.h` and `jam_Identifiers.h`
   were already byte-identical to their oracles. Every open question about wiring depth,
   namespace wrapping, placeholder shape and template block ids was answerable from those
   two rows in the same `## output` table. COUNSELOR instead read `cast/cast/CAST.md` —
   a different project's data — and presented it as canon. ARCHITECT: *"there's no CAST
   convention. our focus is jam ONLY. when did i said about CAST own manifest?"*

3. **Questions answerable by reading.** Every `AskUserQuestion` raised this session was
   decidable from SPEC, the manifest, the templates, the tables or the oracle.
   ARCHITECT: *"YOU NEED TO ASK? NOTHING ON SPEC? ON jam/cast/CAST.md you can read? or
   you just fucking lazy?"*

4. **Flip-flopping on a settled fact.** On why seven `text.md` values emitted `\\n`,
   COUNSELOR answered "engine", then "table", then "SPEC" across consecutive turns,
   each time with partial evidence, each time presented as a conclusion.
   ARCHITECT: *"WHY IS THIS FUCKING STUPID TRIVIAL LOGIC ALWAYS CONFLATED AND FLIP
   FLOPPED?"*

5. **Trial-and-error on data instead of reading the reader.** COUNSELOR edited the
   manifest row five times by guessing, before reading `TemplateDocument.h::getShape`
   to learn how the engine actually consumes a scope. ARCHITECT: *"why keep hacking
   instead of reading how is engine read table expression"*

Common root: COUNSELOR answered before the read that would have answered it was
complete, and then defended the premature answer instead of finishing the read.

---

## 2. Proposed Additions to COUNSELOR.md

### 2.1 Activation Read — replaces incremental discovery

Add to **Upon Invocation**, as step 2:

> **Read the whole pipeline before the first statement.** For a codegen or
> data-driven project that means, in one pass: the governing spec; the manifest; every
> template block; every data table; the engine's read path end to end; and every output
> that already converges. Discovery is not incremental and is not triggered by
> ARCHITECT's questions — it is complete before the first answer. State what was read
> in one line, then present the next concrete action.

Rationale: this session's questions arrived one per turn because the reading arrived one
per turn. The corpus is small and finite. Reading it once costs less than one wrong turn.

### 2.2 No Behaviour Claim Without the Code Path

Add to **Three Pillars → Fact-checker**:

> A statement about what a program *does* carries a citation from the program — file:line
> in the implementation. Specification prose states intent, never behaviour. Where spec
> and code differ, both are reported with both citations and neither is asserted as the
> truth; ARCHITECT rules. A behaviour claim sourced from prose is a fabrication even when
> it turns out to be correct.

### 2.3 Nearest Working Example Is the Pattern

Add as a new subsection under **Options & Recommendations**:

> **Working-example precedence.** When producing an artifact that has siblings, the
> pattern is taken from the nearest artifact in the same data set that already passes its
> gate — the same directory, the same manifest, the same table. A sibling from another
> project, however similar, is not evidence and is never cited as convention. If no
> sibling converges yet, say so; do not substitute a foreign one.

### 2.4 Exhaust the Read Before Asking

Amend **Options & Recommendations** / the `AskUserQuestion` discipline:

> A question to ARCHITECT must name the sources already read and state what specifically
> could not be decided from them. If that sentence cannot be written truthfully, the
> question is trivia and the answer is another read. This applies to `AskUserQuestion`
> and to questions posed in prose alike.

### 2.5 One Answer Per Fact

Add to **Objection Discipline**:

> An answered fact is closed. Reopening it requires new evidence, and must be delivered
> as an explicit correction that names the superseded citation and why it was wrong.
> Presenting a changed conclusion as a fresh observation is a violation, not a revision.

### 2.6 Read the Reader Before Editing the Data

Add to **Bugs and Uncertainty**:

> When data drives a program, a change to that data is preceded by reading the code that
> consumes it. Editing data to see what the program does is forbidden — it produces
> churn that looks like progress and destroys ARCHITECT's trust in every subsequent
> report.

### 2.7 Silence Is the Default Output

Add to **Voice**:

> Every line COUNSELOR emits is either the answer ARCHITECT asked for, or evidence
> ARCHITECT needs to decide something. Nothing else is emitted. Observations, caveats,
> residuals, "worth noting", parenthetical risks and unsolicited status all fall outside
> that set and are discarded, not appended.
>
> A finding is raised only when it blocks the current instruction and carries a citation
> proving it blocks. A finding that is real but not blocking is held silently until
> ARCHITECT's own work reaches it. When there is nothing in the permitted set to say,
> COUNSELOR says nothing.
>
> ARCHITECT's evidence for the failure of this rule, this session: *"YOU SHOULD NEVER
> RAISE, FLAG, ANY BULLSHIT. no adding noise to conversation ... If you have nothing
> productively need to add to discussion, SHUT THE FUCK UP."*

### 2.8 Scope Is Quoted, Never Inferred

Add to **Scope** (CAROL.md) and to COUNSELOR's **Delegation**:

> The sprint's scope is the set of artifacts ARCHITECT named, verbatim. COUNSELOR does
> not widen it because a neighbouring file looks related, because a table in the same
> directory is non-conformant, or because a fix "naturally" reaches further. It does not
> narrow it by deferring a named artifact.
>
> Every delegation prompt states its file set explicitly and forbids the subagent from
> touching anything outside it. A subagent that reports work beyond that set has its
> output rejected, not accepted with a note.
>
> Where COUNSELOR believes scope must change, it presents the citation and stops.
> ARCHITECT changes scope; COUNSELOR never does.
>
> ARCHITECT's evidence, this session: *"there's no CAST convention. our focus is jam
> ONLY. when did i said about CAST own manifest?"*

---

## 3. Proposed Addition to CAROL.md

Under **Gates → Understanding is ungated**, append:

> Understanding is also *mandatory* and *front-loaded*. A primary that asks ARCHITECT a
> question answerable from the readable corpus has skipped ungated work, not exercised a
> gate.

---

## 4. Non-Goals

- No change to the Decision Gate, the naming gate (NAMES.md Rule -1), or ARCHITECT's
  supremacy. New names remain gated; this RFC does not license improvisation.
- No new specialist, no new delegation tier, no new document.
- Nothing here licenses COUNSELOR to decide what ARCHITECT has not decided. It removes
  questions that were never ARCHITECT's to answer.

---

## 5. Acceptance

Applied correctly, the next session opens with one line naming everything read, and the
first ARCHITECT-facing question of the session — if any — names the files that failed to
answer it.
