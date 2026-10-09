# RFC — Agent effort settings (Engineer, Machinist, Librarian, Pathfinder, Counselor)
Date: 2026-10-09
Status: Ready for MACHINIST handoff

## Problem Statement

The agent definitions in `~/.carol/agents/` set `model:` and `effort:` for each role.
ARCHITECT asked two questions:

1. Is Opus 5.5 at `high` effort more effective and more token-efficient than Sonnet 5.5
   for code implementation?
2. Is Sonnet 5.5 or Haiku 5.5 more effective and more token-efficient for the research
   roles Librarian and Pathfinder?

ARCHITECT then asked for the best `model` / `effort` frontmatter for each role, from the
facts, and asked for a handoff to MACHINIST to apply the edits.

Current frontmatter (read 2026-10-09):

| File | model | effort |
|---|---|---|
| auditor.md | fable | high |
| counselor.md | opus | high |
| engineer.md | sonnet | medium |
| librarian.md | haiku | (absent) |
| machinist.md | sonnet | medium |
| oracle.md | fable | medium |
| pathfinder.md | haiku | (absent) |

## Research Summary

Two Librarian passes, domain-mode, 2026-10-09. All numbers below come from the cited
pages. Secondary write-ups are marked as secondary.

### Model facts (Anthropic)

- Opus 5.5 (`claude-opus-5-5`) released 2026-09-22. Sonnet 5.5 (`claude-sonnet-5-5`)
  released 2026-09-28. Haiku 5.5 (`claude-haiku-5-5`) released 2026-10-07.
  Source: platform.claude.com/docs/en/models/overview and per-model pages.
- Price per million tokens: Opus $4 in / $20 out. Sonnet $2 in / $10 out. Haiku $0.10 in
  / $0.50 out up to 100K context; $0.50 / $2.50 above 100K. Cache read: Haiku $0.01,
  Sonnet $0.10.
- Default effort: Opus 5.5 `medium`. Sonnet 5.5 `high`. Haiku 5.5 `medium`.
  Source: platform.claude.com/docs/en/build-with-claude/effort.
- Docs, Opus 5.5: "Run an effort sweep on your own evals rather than carrying settings
  over from an earlier model."
- Docs, Sonnet 5.5: "Its levels are recalibrated, so a level doesn't produce the same
  amount of thinking as the same level on Claude Sonnet 5."
- Sonnet 5.5 page: "Sonnet 5.5 is a faster, lower-cost complement to Claude Opus 5.5."
  "It complements Opus 5.5 best when running at lower effort settings, where it costs
  less per task."
- Haiku 5.5 page: Haiku 5.5 "pairs well with Opus 5.5 and Sonnet 5.5 as a subagent on
  coding work." It is "best suited to more narrowly scoped tasks" such as compaction,
  summarization, and subagent work. Sonnet 5.5 and Opus 5.5 "remain better choices for
  complex agentic coding tasks."
- Haiku 5.5 tokenizer counts about 30% more tokens than Haiku 4.5 for the same text.
  Sonnet 5.5 uses the Sonnet 5 tokenizer. Source: per-model what's-new pages.
- Haiku 5.5 keeps thinking blocks from all earlier assistant turns in context as input
  tokens. Haiku 4.5 kept only the latest turn. Source: Haiku 5.5 what's-new page.

### Question 1 — Opus 5.5 vs Sonnet 5.5, code implementation

Effectiveness:

| Benchmark | Effort | Opus 5.5 | Sonnet 5.5 | Source |
|---|---|---|---|---|
| CursorBench 4.0 | high | 56.0 | 47.8 | system cards §8.8 |
| CursorBench 4.0 | medium | 52.5 | 39.2 | system cards §8.8 |
| CursorBench 4.0 | xhigh | 56.0 | 53.1 | system cards §8.8 |
| CursorBench 4.0 | max | 57.8 | 55.5 | system cards §8.8 |
| AA Intelligence Index | high | 54 | 47 | artificialanalysis.ai release pages |
| AA Intelligence Index | medium | 51 | 41 | artificialanalysis.ai release pages |
| AA Intelligence Index | max | 58 | 56 | artificialanalysis.ai release pages |
| SWE-bench Pro | max | 89.9 | 81.3 | system cards Table 8.1.A |
| SWE-bench Multilingual | max | 93.9 | 90.3 | system cards Table 8.1.A |
| SWE-bench Multimodal | max | 61.4 | 54.3 | system cards Table 8.1.A |
| FrontierCode Main | best | 54.6 (medium) | 52.1 (xhigh) | system cards §8.4 |
| Terminal-Bench 4.0 | max | 64.8 | 70.6 | system cards §8.5 |
| Terminal-Bench 4.0 | xhigh | 66.4 | — | Opus card §8.5 |
| Vals Terminal-Bench 2.1 | high | 87.64 | 83.15 | vals.ai |
| Vals Code Migration | max | 66.65 | 69.83 | vals.ai |
| Vals Vibe Code Bench v1.1 | max | 90.29 | 92.39 | vals.ai |

Token efficiency:

- AA high vs high comparison page: Opus 36k output tokens per task, $1.82 per task, 53M
  total. Sonnet 37k per task, $0.88 per task, 52M total.
- AA max: Opus 260M total output tokens. Sonnet 420M. AA calls Sonnet "very verbose in
  comparison to the median of 81M."
- Cursor cost per task at high: Opus "about $4" (Opus card §8.8 text). Sonnet about
  $1.8 (Sonnet card figure 8.8.A, read from a log-scale chart, approximate).
- Anthropic publishes no Opus 5.5 vs Sonnet 5.5 token or cost comparison.
- Sonnet 5.5 at max scores lower than at xhigh on FrontierCode. Anthropic attributes this
  to the model triggering a code-review function more often at max, which can cause
  timeouts or out-of-scope changes. Source: Sonnet 5.5 announcement.
- Sonnet 5.5 prompting guide: at `xhigh` or `max` the model "can start its own rounds of
  review and verification, sometimes with subagents." It "takes more time and tokens."

Verdict on the premise: effectiveness at matched `high` is supported (CursorBench 56.0
vs 47.8; AA 54 vs 47). Token efficiency at `high` is not supported. Token totals are
near parity. Opus costs about 2x per task because its price is 2x.

### Question 2 — Sonnet 5.5 vs Haiku 5.5, research roles

Effectiveness (Anthropic table on anthropic.com/claude-haiku-5-5):

| Benchmark | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|
| Terminal-Bench 4.0 | 39.2 | 70.6 |
| FrontierCode 1.1 Main | 46.4 | 52.1 (xhigh) |
| OSWorld 2.1 offline | 72.4 | 83.9 |
| HLE no tools | 45.9 | 56.9 |
| HLE with tools | 57.4 | 64.5 |
| GDPval-AA v2.1 (Elo) | 1620 | 1840 |
| AA-Briefcase v1.1 | 1578 | 1824 |
| Chartography no tools | 46.4 | 61.6 |

- AA Intelligence Index, Haiku 5.5: low 29, medium 34, high 38, xhigh 41, max 43.
  Sonnet 5.5 max 56.
- AA Haiku 5.5 high vs max: AA-LCR 77% vs 83%. Terminal-Bench 4.0 22% vs 33%. HLE 37%
  vs 44%.
- llm-stats.com (2026-10-09, aggregate index): tool use Haiku 20.3, Sonnet 34.3. Agents
  Haiku 33.3, Sonnet 42.5. Sonnet leads on 34 shared benchmarks, Haiku on 2.
- No tau2-bench, BrowseComp, MMMLU, IFBench, needle, or MRCR result exists for either
  5.5 model in the sources consulted.
- No source measures either model as a read-only search, fetch, grep, or read subagent.

Token efficiency (AA pages):

- Haiku 5.5 high: 55k output tokens per task, 37k reasoning tokens. $0.08 per task.
  Full index $94. 97M output tokens.
- Haiku 5.5 max: 162k output tokens per task. $0.21 per task. Full index $330. 435M
  to 440M output tokens.
- Sonnet 5.5 max: 420M output tokens. $5.46 per task (AA page). Secondary (oodaloop):
  $7.60 per task, about 193k output tokens per task.
- Anthropic footnote: Haiku 5.5 cost is "about 90% lower" than Haiku 4.5 up to 100K,
  "about 50% lower" above that, after the tokenizer change.

Tool-loop behaviour (Anthropic prompting guides):

- Haiku 5.5 at `low`: "the model is more likely to skip a search, stop early, or skip a
  check." From `low` to `medium`, early stopping "roughly halved" and output tokens
  "more than doubled." With thinking off at `high` or below, it can skip a needed tool
  call when JSON output is also requested. "When instruction following matters most,
  also use `high` effort."
- Sonnet 5.5: forced `tool_choice` (`any` or `tool`) returns a 400 error. It sometimes
  calls tools with wrong letter case or a near-match parameter name. At `low` and
  `medium` it "sometimes checks in before the work is done." It "sometimes answers from
  its training knowledge when a web search would catch details that have changed."

Prior art, not 5.5: Anthropic multi-agent post (Jun 2025). Opus 4 lead with Sonnet 4
subagents beat a single Opus 4 agent by 90.2% on an internal research eval. Multi-agent
systems "use about 15x more tokens than chats." Token usage "explains 80% of the
variance" in BrowseComp performance.

### Source conflicts

- Sonnet 5.5 Terminal-Bench 4.0: 70.6 (Anthropic) vs 64 (AA via secondary).
- Sonnet 5.5 cost per task at max: $5.46 (AA page) vs $7.60 or $7.67 (secondary).
- Sonnet 5.5 cost per task at high: $0.88 (AA page) vs $1.08 (secondary).
- Haiku 5.5 Terminal-Bench 4.0: 39.2 (Anthropic) vs 22 / 33 (AA high / max).
- Haiku 5.5 GDPval-AA: 1620 (Anthropic) vs 1618 (AA max) vs 1418 (AA high).
- Vals pages contradict their own tables (Vals Index, Terminal-Bench 4.0, cost per test).
  Vals cost per test at max: Sonnet $21.34, Opus $32.14. AA cost per task at max is the
  reverse. Different harnesses.
- One secondary source says AA's Sonnet 5.5 run used a pre-release build with a bug in
  structured outputs. Not confirmed on AA's pages.
- Anthropic pages were fetched through a summarizing tool. Quotes are as returned, not
  verified line by line.

## Principles and Rationale

Model tier is cost and quality. BLESSED does not select a tier. The recommendation maps
each role's duty to the cited behaviour of each model at each effort.

- Engineer, Machinist → `high`. Sonnet 5.5 default is `high`. At `medium` Sonnet
  "sometimes checks in before the work is done." CAROL.md Step Gate forbids a stop before
  the endpoint. `max` triggers self-review and out-of-scope changes (FrontierCode max <
  xhigh), which conflicts with Scope. `xhigh` adds review rounds "sometimes with
  subagents" at more tokens; the Auditor already owns review.
- Librarian, Pathfinder → `high`. The Haiku guide ties instruction following to `high`.
  BRIEF format and scope limits are instruction following. `medium` still leaves half
  the early-stop rate of `low`. Cost at `high` is $0.08 per task.
- Counselor → unchanged (`opus` / `high`). ARCHITECT ruling 2026-10-09: COUNSELOR default
  is always Opus `high`. Fable is Auditor and Oracle only. No planning benchmark exists.
  Opus peaks on FrontierCode at `medium`, but Counselor does not write code.
- Auditor, Oracle → not assessed. No Fable 5.x data was researched.

Considered and rejected:

- Engineer on Opus 5.5 `high`. Higher accuracy (CursorBench 56.0 vs 47.8) at about 2x
  cost per task (AA $1.82 vs $0.88). Not rejected on evidence. Held as ARCHITECT's budget
  call. Sonnet `xhigh` reaches 53.1; its cost per task was not retrieved.
- Librarian on Sonnet 5.5. Higher benchmark scores on every shared row. Rejected for the
  role: Sonnet "sometimes answers from its training knowledge when a web search would
  catch details that have changed" (research liability) and costs about 68x per task at
  max ($5.46 vs $0.08).
- Haiku at `max`. 2.6x the tokens of `high` (162k vs 55k per task) for +5 AA index
  points. The Haiku guide names `high` for instruction following.

## Scaffold

Exact edits. Four files. Frontmatter only. No other line changes.

```
~/.carol/agents/engineer.md
-effort: medium
+effort: high

~/.carol/agents/machinist.md
-effort: medium
+effort: high

~/.carol/agents/librarian.md
 model: haiku
+effort: high

~/.carol/agents/pathfinder.md
 model: haiku
+effort: high
```

`counselor.md`: no edit. Frontmatter already reads `model: opus`, `effort: high`.

CAROL.md Roles text is stale. Line 86 names the COUNSELOR seat `fable-5` with a ladder
`opus-5, opus-5-5`. ARCHITECT's ruling makes the seat Opus `high`. One line edit:

```
~/.carol/CAROL.md:86-87
-  docs, bugs, implementation. Plans and delegates code to @Engineer. Seat: fable-5
-  (ladder: opus-5, opus-5-5 — `carol counselor <model>`).
+  docs, bugs, implementation. Plans and delegates code to @Engineer. Seat: opus-5-5,
+  effort high (`carol counselor <model>`).
```

Line 89 (ORACLE `Seat: fable-5`) and the Auditor entry (`fable-5`) stay.

`bin/carol` carries the same stale ladder. `set_counselor_model` (bin/carol:946-956)
defaults to fable and writes `effort="medium"` for `opus55`. Both contradict the ruling.
`anthropic.settings.json:16` already sets `claude-opus-5-5` to `effortLevel: high`.

```
bin/carol:446
-  counselor [fable|opus5|opus55] [name]  Launch COUNSELOR (model ladder, default fable)
+  counselor [opus5|opus55] [name]        Launch COUNSELOR (model ladder, default opus55)

bin/carol:947
-    # COUNSELOR model ladder: fable (primary) → opus5 → opus55.
+    # COUNSELOR model ladder: opus55 (primary) → opus5.

bin/carol:953-955
-        fable)  model="claude-fable-5-1"; effort="medium" ;;
         opus5)  model="claude-opus-5";    effort="high" ;;
-        opus55) model="claude-opus-5-5";  effort="medium" ;;
+        opus55) model="claude-opus-5-5";  effort="high" ;;

bin/carol:1210
-            fable|opus5|opus55)
+            opus5|opus55)
```

`set_counselor_model` writes the exact model ID into `counselor.md` (bin/carol:959).
The current frontmatter reads `model: opus` (alias), which the hook accepts as the
definition value. Both forms resolve to `claude-opus-5-5` via `anthropic.settings.json:40`.

## BLESSED Compliance Checklist
- [x] Bounds — one owner per setting: the frontmatter file
- [x] Lean — four one-line edits, no new keys beyond `effort`
- [x] Explicit — effort stated in the file, not left to the vendor default
- [x] SSOT — frontmatter is the model/effort source; hook reads it
- [x] Stateless — n/a
- [x] Encapsulation — n/a
- [x] Deterministic — the same definition yields the same seat every call

## Open Questions

None. Every item below was closed by a read or by ARCHITECT's ruling.

- Counselor seat: ARCHITECT ruled 2026-10-09. COUNSELOR is Opus `high`. Fable is Auditor
  and Oracle only.
- Alias resolution: `providers/generated/anthropic.settings.json:40` maps
  `ANTHROPIC_DEFAULT_OPUS_MODEL` → `claude-opus-5-5`, `ANTHROPIC_DEFAULT_SONNET_MODEL` →
  `claude-sonnet-5-5`, `ANTHROPIC_DEFAULT_HAIKU_MODEL` → `claude-haiku-5-5`,
  `ANTHROPIC_DEFAULT_FABLE_MODEL` → `claude-fable-5-1`. The research applies to the
  running seats.
- Engineer tier: ARCHITECT instructed the update per the recommendation table. Engineer is
  Sonnet `high`.
- Hook coverage: `hooks/register.js:51-55` reads only the `model:` line of the
  definition; `register.js:120-123` denies on a model mismatch. `effort` is not checked.
  The `effort:` edits need no hook change.

## Handoff Notes

- Target: MACHINIST. Agent definitions are MACHINIST's surface (CAROL.md Roles).
- ORACLE did not edit any file except this RFC. The Librarian and Pathfinder agents in
  this session disallow Write and Edit.
- Apply the four edits in Scaffold. Each file is a single-line change or a single-line
  insert under `model:`. No scripted in-place edit is needed; a direct Edit per file
  suffices.
- The hook reads only `model:` (hooks/register.js:51-55). The `effort:` edits do not
  touch the hook path. The model values are unchanged, so no hook test is needed.
- Effort recalibration: Sonnet 5.5 and Haiku 5.5 levels are recalibrated. Anthropic
  advises an effort sweep on own evals. The settings here follow vendor defaults and
  prompting-guide statements; no CAROL-internal eval was run.
- Full Librarian briefs (URLs, per-source numbers) are in this RFC's Research Summary.
  Local copies of both 5.5 system card PDFs as text:
  `/private/tmp/claude-501/-Users-jreng--carol/64d83f5c-fa25-4a19-b068-7318542708f4/scratchpad/sc55/`
  (session scratchpad; not persistent).
