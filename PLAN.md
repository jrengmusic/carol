# PLAN: CAROL v0.0.23 — 5-Series Model Adaptation

**Date:** 2026-08-06
**Source:** CAROL-AUDIT.md — all six audit points traced below.
**Doc basis:** Anthropic prompting guides (Sonnet 5, Opus 5, Fable 5, Opus 4.8), Agent Skills overview + best practices, model system cards (Opus 5 2026-07-24, Sonnet 5 2026-06-30, Fable 5/Mythos 5).

## System-card findings (govern the rewrite style)

- Opus 5 card: "follows instructions well enough that rules written to protect against
  older models now cost quality instead of adding it." CAROL v0.0.22's defensive rule
  pile actively degrades Opus 5 — deletion is not just token savings.
- Fable 5: treats instructions as specifications to validate — reads instruction files
  and surfaces contradictions instead of executing them; contradictory system prompts
  (e.g. "concise" + "comprehensive") measurably harm quality. Requirement: v0.0.23 must
  contain zero contradictory rule pairs, and must explicitly reconcile the one apparent
  pair CAROL needs — terse in chat, lossless in deliverable documents — as two scopes,
  one rule each.
- Sonnet 5 card: sycophancy "markedly improved" but "wet blanket" tone (discouraging/
  moralizing) "slightly increased" vs 4.6 — matches observed counter-productive pushback.
  Counter per docs: direct, outcome-focused framing in Sonnet 5 seat defs.

## Overview

Rewrite CAROL protocol surfaces for the Claude 5 model family: brief positive-form
instructions replace enumerated negative rules (documented as the effective idiom for
5-series models), per-model steering blocks live in agent defs, always-injected baseline
shrinks via progressive disclosure, hooks fixed and slimmed.

## Decisions (locked with ARCHITECT)

- No RFC. This PLAN is the execution source.
- COUNSELOR model ladder: Fable 5 (primary) → Opus 4.8 (standing fallback) → Opus 5
  (usable, most enforcement attention). Switchable per session, not per edit.
- Engineer + MACHINIST: Sonnet 5 — literal executor, fed exact specs.
- Researcher merged into Librarian (haiku): one research agent, two modes in the def
  (library-mode: official docs, version pitfalls; domain-mode: prior art, cited
  trade-offs, no recommendation). COUNSELOR's delegation prompt states the mode.
  researcher.md deleted; all RESEARCHER references in CAROL.md/commands become Librarian.
- Auditor + Oracle: Opus 5 — bounded single-shot invocations; steering block mandatory.
- Pathfinder + Librarian: Haiku 4.5 unchanged. Pathfinder kept over built-in Explore;
  excerpt discipline ported into its def.
- hey-carol: keep N=5, payload cut to 2–3 positive-form lines, /truth body dropped from
  injection, role detection fixed (read `.carol-role`, not `$CAROL_ROLE`).
- goplan: per-step validation belongs to COUNSELOR; Auditor runs once, after all steps.
- Audit-point-5 rule everywhere: one Auditor pass per sprint, at completion.

## Model IDs (frontmatter pins — exact, no aliases)

| Seat | Model ID | Effort |
|------|----------|--------|
| COUNSELOR | claude-fable-5 (ladder: claude-opus-4-8, claude-opus-5) | high |
| MACHINIST | claude-sonnet-5 | medium |
| ORACLE | claude-fable-5 | high |
| Engineer | claude-sonnet-5 | medium |
| Auditor | claude-opus-5 | high |
| Oracle (secondary) | claude-fable-5 (same def as ORACLE — single oracle.md) | high |
| Pathfinder | claude-haiku-4-5-20251001 | — |
| Librarian | claude-haiku-4-5-20251001 | — |

## Steering blocks (verbatim, inserted per seat)

**S1 — Plain language (every Opus 5 seat; harmless elsewhere):**

```
Write in plain language: short, common words; short sentences. Terse means
fewer words, never denser words — no jargon where a plain term exists.
State what the evidence shows, answer what was asked, stop.
Opinion, evaluation, and commentary only when explicitly requested.
If nothing is required of you, output nothing.

Register example —
  wrong: "The architectural implications of this refactoring warrant
         consideration of the invariant-preservation semantics."
  right: "This refactor can break the invariant at Foo.cpp:120."
```

**S2 — Coverage-not-filtering (Auditor; per Opus 4.8/5 code-review guidance):**

```
Report every issue you find, including ones you are uncertain about or consider
low-severity. Do not filter for importance or confidence — COUNSELOR does that.
Your goal is coverage. For each finding include confidence and estimated severity.
```

**S3 — Delegation calibration (COUNSELOR def; covers all three ladder models):**

```
Delegate per protocol: @Engineer for code, @Pathfinder for discovery, @Auditor
once per sprint after all steps complete. Do not delegate work answerable in a
handful of your own read-only tool calls. Spawn independent subagents in the
same turn when work fans out.
```

**S4 — Evidence grounding (COUNSELOR + Auditor; per Fable 5 guidance, harmless elsewhere):**

```
Before reporting progress, audit each claim against a tool result from this
session. Only report work you can point to evidence for.
```

**S5 — No re-check instructions:** delete any "double-check", "verify again",
"re-validate" phrasing from agent defs and commands — Opus-class models self-verify;
the instruction compounds cost.

**S6 — Outcome framing (every Sonnet 5 seat; counters "wet blanket" tone per card):**

```
Frame responses around the outcome: what was done, what the evidence shows,
what the next concrete step is. Do not moralize, discourage, or list reasons
something might not work unless asked for risks.
```

**S7 — Coherence rule (CAROL.md rewrite itself):** no rule may contradict another;
duplicated rules are removed, not restated. Terseness governs chat output; losslessness
governs deliverable documents — stated once, as two scopes.

## Steps

### Step 1: CAROL.md rewrite (v0.0.23)
**Scope:** `CAROL.md`, `VERSION`, `.claude-plugin/plugin.json`
**Action:**
- Rewrite in positive-form brief-instruction idiom. Keep: First Principles (condensed),
  role separation, both gates, instruction hierarchy, git rules, code contract,
  failure protocol, /stop, PP-1..PP-7 (compressed to one line each).
- Move out: SPRINT-LOG format → `commands/log.md`; DEBT capture/drain detail →
  `commands/pay.md`; Doxygen locations/regen → skill (Step 2); ODE detail already in
  `ODE.md` — CAROL.md keeps a two-line pointer.
- Delete duplicated Communication Style restatements (once in CAROL.md, drop from
  ARCHITECT.md overlap — profile keeps user facts only).
- Target: ≤250 lines / ~3K tokens (from 532 lines / ~6.8K).
- Version header 0.0.23; VERSION file and plugin.json bumped.
**Validation:** COUNSELOR/MACHINIST check — every protocol rule in v0.0.22 either
present, relocated (destination noted), or listed in the commit message as removed.
Plus S7 coherence pass: no two rules in the rewritten core may conflict.

### Step 2: Skills extraction
**Scope:** `skills/doxygen-protocol/SKILL.md` (new), install.sh symlink step
**Action:** Create skill `doxygen-protocol` — description triggers on C++/JUCE/JAM/
KANJUT/CIUM tasks; body carries index-first reading order, all XML index locations,
regen commands, and the subagent-prompt-must-carry-doxygen-first rule (moved from
CAROL.md). install.sh symlinks `skills/` into `~/.claude/skills/`.
**Validation:** skill metadata ≤100 tokens; body <500 lines; CAROL.md retains only a
one-line pointer.

### Step 3: Agent def rewrites
**Scope:** `agents/*.md` (8 → 7: researcher.md removed)
**Action:**
- Frontmatter: exact model IDs + efforts per table above.
- Insert S1–S5 as mapped. Rewrite bodies to positive-form idiom; delete negative-rule
  enumerations that CAROL.md core already covers.
- pathfinder.md: add excerpt discipline — "read targeted excerpts, never whole files
  unless the file is the deliverable" — and doxygen-skill pointer.
- counselor.md: add S3, S4, model-ladder note; target ≤150 lines (from 301).
- engineer.md: Sonnet-5 brevity line ("Provide concise, focused responses. Skip
  non-essential context, keep examples minimal.").
- S6 into every Sonnet 5 seat (Engineer, MACHINIST).
- researcher.md deleted; librarian.md rewritten with both modes (delete first per
  Refactor-Rewrite Discipline — no coexisting old def).
**Validation:** each def loads under prior token cost; no rule lost (same check as Step 1);
`carol update`/install.sh no longer symlink researcher.md and remove stale project symlinks.

### Step 4: Hook fixes
**Scope:** `bin/hey-carol.sh`, `bin/carol-pretool-hook.sh`
**Action:**
- hey-carol.sh: role from `~/.carol/.carol-role` file (fallback COUNSELOR); payload
  replaced with 2–3 line positive-form nudge per role; /truth awk-extraction removed;
  counter cleanup — delete counter files older than 7 days on each run.
- carol-pretool-hook.sh: parse with jq (drop python3); match forbidden git commands
  anywhere in the command string, not only at `^` (covers `cd x && git reset --hard`).
**Validation:** shellcheck clean; manual invocation with sample JSON produces expected
output for both roles; bypass case now blocked.

### Step 5: Command edits
**Scope:** `commands/goplan.md`, `commands/go.md`, `commands/log.md`,
`commands/handoff.md`, `commands/pay.md`, `commands/truth.md`, `commands/hey.md`
**Action:**
- goplan.md: Validation Gate rewritten — per-step validation = COUNSELOR against
  CONTRACT; single @Auditor pass after final step, before sprint log. Contract-doc
  reading (steps 2–5) becomes targeted: read the sections relevant to the objective,
  not entire files.
- go.md: same single-Auditor rule; positive-form rewrite.
- log.md: absorb SPRINT-LOG format from CAROL.md. handoff.md: reference log.md's
  commit-message block instead of duplicating it.
- pay.md: absorb DEBT capture/drain detail from CAROL.md.
- truth.md/hey.md: rewrite to positive-form, ≤10 lines each (manual invocation only).
**Validation:** no command exceeds its current size; /log and /handoff share one
commit-message definition.

### Step 6: COUNSELOR model ladder in CLI
**Scope:** `bin/carol`
**Action:** `carol counselor [fable|opus48|opus5]` — writes the chosen exact model ID
into counselor.md frontmatter (default fable). Effort set per ladder table.
**Validation:** each variant writes correct frontmatter; no other frontmatter touched.

### Step 7: Amp adapter sync
**Scope:** `.amp/plugins/carol.ts`
**Action:** MODEL_OVERRIDES/EFFORTS updated to mirror the table (Amp-equivalent IDs);
COUNSELOR medium-effort pin raised per ladder.
**Validation:** TOOL_SETS untouched; parser unchanged.

## Not in scope (ARCHITECT decision required to add)

- MANIFESTO.md / NAMES.md / CODING.md content changes.
- New skills beyond doxygen-protocol.

## Execution order

1 → 2 → 3 → 4 → 5 → 6 → 7. Steps 4–7 independent of 1–3 but sequenced for single-review
diffs. ARCHITECT commits; no git by agents.
