# PLAN: JANITOR Deterministic Loop

**RFC:** none — objective from ARCHITECT prompt (2026-11-22). Context: `PLAN-pi-cli-harness-and-janitor-primary-role-integration.md`, `PLAN-llama-cpp-local-model-baseline.md` (Steps 1-5 done; Step 6 halted by ARCHITECT), `~/Documents/Poems/dev/caroline/RFC-local-model-workers.md`.
**Date:** 2026-11-22
**BLESSED Compliance:** verified
**Language Constraints:** Lua run by `nvim --headless -l` (skill tooling), TypeScript pi extension, bash 3.2 launcher, Markdown contract documents
**Executor:** MACHINIST (direct execution, no Engineer)
**Iteration:** each phase ends with numbers and an ARCHITECT go/no-go. ARCHITECT edits this plan between phases.

## Overview

Build JANITOR as a deterministic harness. Deterministic tools do every exact operation. The model only interprets the request, classifies each finding, and reviews each result. The tracker document holds all campaign state, so a small context window can work a whole library chunk by chunk. The harness is model-agnostic and harness-agnostic: the tools are CLI scripts, and each harness binds them. Then measure which local model runs the loop on this machine with an error rate as close to 0% as possible.

## ARCHITECT Directives (this session)

1. "must be determistic from the get go". "expecting it to figure out itself are wasting time."
2. "that might work for single file or single module, what if we want to clean up whole library?"
   - "it need to find all violations first"
   - "list them into CLEAN-UP.md with specific objective"
   - "do the clean up, track them at CLEAN-UP.md"
   - "compaction do handoff"
3. "because their context window is small, we dump the context into document, so large scope can be done iteratively chunk by chunk until finished. can be audited."
4. "this is still need judgement, i'm quite sure small models able to do that, given the exact instructions and tools".
5. "protocol, role, skill, rules, contract are deterministic and model agnostic, meaning, model is expendable". "our harness holds. exactly like CAROL itself."
6. Open unknowns, from ARCHITECT:
   - what this machine can run effectively and efficiently
   - the exact protocol-loop formula with an error margin near 0%
   - which model reaches the expected result, all things considered
7. "take it slow. one by one." The fan and END must stay usable. One model at a time.

## Evidence Carried In

| Fact | Source |
|---|---|
| Infra works. llama.cpp 1.0.0 router, preset, credential, `janitor` lifecycle, gate probes: all pass. | `PLAN-llama-cpp-local-model-baseline.md` Step 5; `scratchpad/t12/step5.out` |
| Qwen3.5-4B Q4_K_M: prefill 356 tok/s (pp512), 347 tok/s (pp4096); decode 27.6 tok/s; model process 4.1 GB RSS. | `scratchpad/t13/m1.out` |
| The prompt cache works: report task 29 s cold, 7 s with the same prompt. | `t13/m1.out` |
| With generic tools only (`read, bash, edit, write, grep, find, ls`), the model completed 0 of 8 runs correctly. It wrote a wrong grep, searched the wrong folders (22-34 tool calls), and looped to the 420 s cap (60+ calls). The wrong answers were the same across repeats. | `t13/m1.out` |
| A tree-sitter query finds the 3 operators exactly by AST node (`unary_expression` `!`, `binary_expression` `&&` / `||`), with row and column. | this session, `scratchpad/ops.scm` on `t11/template/module.cpp` |
| A deterministic transform produced both expected fixture outputs with one `sed` line and one `awk` line. | `scratchpad/t11/expected/` |
| pi's `read` gives no line numbers. A numbered `read_range` gave correct lines where `read` did not. | `caroline/RFC-local-model-workers.md:59`; scaffold S1 `:177-327` |
| Temperature 0 holds. pi sends `temperature` only when it is set (`pi-ai/dist/api/openai-completions.js:587-589`), and nothing sets it, so the server default `--temperature 0` applies. | this session |
| Skill tooling is Lua, run by `nvim --headless -l`. | `skills/xls-to-md/SKILL.md:23`; `skills/trace/*.lua` |

## Framework Inventory

### 1. API

| Need | Module | API | Source | Phase |
|---|---|---|---|---|
| Parse C++ and query the AST | Neovim | `vim.treesitter.get_string_parser`, `vim.treesitter.query.parse`, `query:iter_captures` | nvim runtime; parser `~/.local/share/nvim/site/parser/cpp.so` | A |
| Run a Lua tool headless | Neovim | `nvim --headless -l <script> <args>` | `skills/xls-to-md/SKILL.md:23` | A |
| Scripted in-place edit with dry run, count check, backup, restore | carol | `carol apply --expect N '<sed-expression>' <file>...` | `bin/carol:956-1014`; `CAROL.md:310-332` | A |
| Commit message format | CAROL skill | `commit-writer` | `skills/commit-writer/SKILL.md` | A |
| Register a model tool | pi | `pi.registerTool({ name, label, description, promptSnippet, promptGuidelines, parameters, execute })`; `pi.exec` | `docs/extensions.md:2180-2290` | B |
| End the run after a tool batch | pi | `terminate: true` in a tool result | `extensions.md:2289` | B |
| Custom compaction summary | pi | `pi.on("session_before_compact")` → `{ compaction: { summary, firstKeptEntryId, tokensBefore } }` | `extensions.md:534-556` | B |
| Gate a tool call | pi | `pi.on("tool_call")`, `{ block, reason, terminate }` | `extensions.md:973-1004`; `pi/extensions/carol-gate.ts` | B |
| Restrict the model's tools | pi CLI | `--tools <list>` | `cli.md:121-130` | B |
| Local model server | llama.cpp | `llama serve` router with `local/models-preset.ini` | `PLAN-llama-cpp-local-model-baseline.md` Steps 3-5 | C, D |
| Throughput | llama.cpp | `llama-bench -p 512,4096 -n 128 -fa on -ctk q8_0 -ctv q8_0` | `llama-bench --help` | D |

### 2. Pattern usage

| Pattern | Exemplar | Phase |
|---|---|---|
| Lua tools run by `nvim --headless -l`; `SKILL.md` documents the invocation path | `skills/xls-to-md/SKILL.md:23`; `skills/trace/` | A |
| Local model workspace, gitignored: weights, preset, JANITOR tools | `~/.carol/local/` (Locked Decision 1) | A, C, D |
| Ledger subcommands keyed by ID | `carol debt add`, `carol debt clear <id>` (`CAROL.md` Documentation) | A |
| One deterministic edit path for all scripted edits | `carol apply` (`CAROL.md:329-332`) | A |
| Tool extension with numbered read | `caroline/RFC-local-model-workers.md` S1 `local-tools.ts` (`getNumberedLines`, `MAX_RANGE_LINES`) | B |
| Fixture repo per run, ground truth by deterministic transform | `scratchpad/t11/template`, `t11/expected` | A, C |
| One warm server per model; never reload per request | `PLAN-llama-cpp-local-model-baseline.md` Step 6 | C, D |

### 3. Names

| Name | Family | Phase |
|---|---|---|
| `read_range` | S1 scaffold tool name (`caroline/RFC-local-model-workers.md:73`) | B |
| `local/janitor/scan.lua`, `fix.lua`, `tracker.lua` | `skills/trace/` script names (`trace.lua`, `sample.lua`, `driver.lua`); `janitor` is the role and launcher name | A |
| `local/janitor/rules/<rule-id>.lua` | data files, one per CONTRACT rule; a rule id is the CODING.md heading in kebab-case | A |
| pi tools `scan_rule`, `fix_batch`, `set_status`, `check_parse`, `commit_batch` | verb_noun, as `read_range` | B |
| `CLEAN-UP-<subject>.md` | `clean-up-writer` skill | A |

### 4. Synthesis

| Rule | Form | Phase |
|---|---|---|
| SSOT | Each rule is defined once, in `rules/<rule-id>.lua`, and cites its CODING.md heading. The tracker is the only campaign state. `carol apply` is the only edit path. | A |
| Stateless | Each cycle reads the tracker, does one batch, and writes the tracker. Nothing persists in chat. | A, B |
| Explicit | Every tool returns exact `file:line` data. A failed check returns an error result, never a silent pass. | A, B |
| Deterministic | The same input files and rule give the same findings and the same edits, every run. | A |
| Bound | A tool owns only its batch files. `janitor` owns only the server it spawned. | A, B |
| Encapsulation | The core tools are harness-agnostic CLI. Each harness binds them (pi tools now; Claude, OpenCode, agy, and CAROLINE later). | A, B |

### 5. Absence

| Need | Proof | Phase |
|---|---|---|
| A model-callable compaction | `/compact` is user input. Tools are only what `--tools` names (`compaction.md:41`; `cli.md:121`). The extension hook supplies the handoff. | B |
| Ground truth for a real library | none exists. The audit criteria replace it: a rescan finds zero remaining, every file parses, and ARCHITECT reviews the diff. | E |
| An automatic END-impact metric | none. ARCHITECT reports END's state after each model. | D |

## The Loop (target design)

1. **Interpret (model).** The request gives the rule set (a CODING.md section) and the scope (a library or module path). The model calls `scan_rule` with them.
2. **Scan (tool).** `scan.lua` queries every file in scope and writes the findings into `CLEAN-UP-<subject>.md` as `PENDING` rows: ID, file, line, rule, kind, and the proposed action (fix or flag). The findings never enter the model's context in bulk. The tool returns only the counts and the first batch.
3. **Classify (model).** For each row of the current batch, the model reads the lines with `read_range` and confirms the action, or changes it to `FLAGGED` with a reason. The rule's classification table bounds the choice.
4. **Fix (tool).** `fix_batch` turns the confirmed rows into line-addressed `sed` expressions and runs `carol apply --expect N`, where N comes from the rows. It then runs `check_parse` and a rescan of the batch files. A mismatch restores the files and marks the rows `FLAGGED` with the tool's reason.
5. **Track and checkpoint (tool).** `set_status` updates the rows and counts. `commit_batch` runs `git add -A` and a `commit-writer` commit, and records the hash in the rows.
6. **Handoff (extension).** On compaction, `carol-gate.ts` supplies a fixed summary: the tracker path, the objective, the last commit, the next `PENDING` ID, and the next action.
7. Repeat from step 3 until no `PENDING` row is left. Then report the `DONE` and `FLAGGED` counts and the `FLAGGED` list.

## Validation Gate

MACHINIST validates each step against MANIFESTO.md, NAMES.md, CODING.md, the Inventory rows, and the directives above. Each phase ends with a report in chat and an ARCHITECT go/no-go. ARCHITECT decides the Auditor per phase.

## Steps

### Phase A — Deterministic core (no model)

#### Step A1: Rule files for two CONTRACT sections
**Scope:** `local/janitor/rules/`
**Action:**
1. Write one Lua rule file per rule:
   - `CODING.md` `**Special operators:**` (`:36-37`): alternative tokens.
   - The three `## NAMESPACES` rules: anonymous namespace (`:614`), `namespace detail` (`:634`), enclosure format (`:670`).
2. Each file holds:
   - the CODING.md heading it enforces
   - the tree-sitter query
   - the classification table, kind → fix or flag. For example: an anonymous namespace with only functions and variables is a fix; one that holds a type is a flag; `namespace detail` is always a flag.
   - the fix transform as a line-addressed `sed` expression template
**Validation:** each query runs in nvim on the fixture and returns the expected nodes.

#### Step A2: `scan.lua` and `tracker.lua`
**Scope:** `local/janitor/`
**Action:**
1. `scan.lua <rule-set> <path>...` walks the `.h` and `.cpp` files, runs each rule, and writes the rows through `tracker.lua`.
2. `tracker.lua` reads and writes the `clean-up-writer` format:
   - create the file
   - add rows
   - set a row's status, reason, and commit
   - recount Progress
   - print the next batch
3. A batch is 1-5 files, or one `.h` + `.cpp` pair.
**Validation:** a scan over the fixture gives the exact expected rows. A second scan gives the same file byte for byte.

#### Step A3: `fix.lua` through `carol apply`
**Scope:** `local/janitor/`
**Action:**
1. `fix.lua <tracker> <batch>` builds the `sed` expressions from the batch's fix rows and runs `carol apply --expect N`.
2. It runs the parse check and a rescan.
3. On a mismatch it restores the files and marks the rows `FLAGGED`.
4. Confirm first that `carol apply` handles line insertion (the banner). If it does not, stop and report: that is a change to `bin/carol`, and ARCHITECT's call.
**Validation:** the fixture edits match `t11/expected` exactly. A forced mismatch restores the file.

#### Step A4: Model-free end-to-end
**Scope:** the fixtures, plus scratchpad copies of three JAM modules, one per tier (Locked Decision 2):
- easy: `jam_document` (4 files, 1,011 lines)
- medium: `jam_data_structures` (16 files, 4,569 lines; holds the conforming banner exemplar `jam_ModelUtils.cpp`)
- difficult: `jam_core` (83 files, 31,039 lines)

`jam_freetype` (272 files) is left out: its size suggests vendored third-party code.
**Action:** Run scan, then fix, then commit, over the fixtures and each copy, with no model. Report per tier.
**Validation and numbers:**
- wrong edits = 0
- rescan remaining = only `FLAGGED` rows
- every file parses
- wall time

ARCHITECT reviews the copy's diff. **Phase A gate.**

### Phase B — Harness binding (pi)

#### Step B1: JANITOR tools extension
**Scope:** `pi/extensions/` (a tools file next to `carol-gate.ts`)
**Action:**
1. Register `read_range` (S1 pattern), `scan_rule`, `fix_batch`, `set_status`, `check_parse`, and `commit_batch`. Each wraps the Phase A CLI through `pi.exec`.
2. Each tool returns exact data, with `promptSnippet` and `promptGuidelines` that name the tool.
**Validation:** each tool, called by hand through pi's RPC or print mode, returns the CLI result unchanged.

#### Step B2: Tool set and prompt
**Scope:** `pi/bin/janitor`, `agents/janitor.md`, `skills/iterative-contract-sop/SKILL.md`, `pi/HARNESS.md`
**Action:**
1. `janitor` passes `--tools` with the JANITOR tools only. No `bash`, `write`, `edit`, `find`, or `grep`. The evidence: free shell access caused every wander in `t13`.
2. Rewrite the SOP as the Loop above, one tool per step.
3. Update `janitor.md` and HARNESS.md to match.
**Validation:** STE. Every step of the Loop names exactly one tool.

#### Step B3: Compaction handoff
**Scope:** `pi/extensions/carol-gate.ts`
**Action:** On `session_before_compact`, return a fixed summary built from the tracker: path, objective, last commit, next `PENDING` ID, next action.
**Validation:** a forced `/compact` mid-campaign resumes at the right row.

#### Step B4: Gate update
**Scope:** `pi/extensions/carol-gate.ts`
**Action:** Keep the dirty-tree and git gates, now applied inside `commit_batch` and `fix_batch`. Remove the gates on tools that no longer exist.
**Validation:** the gate probes pass again. **Phase B gate.**

### Phase C — Protocol-loop formula (one model, Qwen3.5-4B Q4_K_M, already downloaded)

#### Step C1: Test corpus with ground truth
**Scope:** scratchpad fixtures
**Action:** Make fixtures that cover each rule, including the judgment cases:
- a type inside an anonymous namespace
- `namespace detail`
- nested namespaces
- a partial or wrong banner
- `!` inside a string, a comment, or a macro
- `!=`
- an operator overload

Each fixture has an expected tracker (DONE and FLAGGED rows) and expected files.

#### Step C2: Metrics
Per campaign, record:
- correct fixes
- **wrong edits (critical, target 0)**
- missed rows
- false or missing `FLAGGED`
- protocol violations (gate blocks, skipped steps)
- tool calls
- wall time
- tokens
- model memory

Then ARCHITECT's END report.

#### Step C3: Loop variants
1. **Variant 1, ARCHITECT's design:** one session; compaction with the B3 handoff.
2. **Variant 2, control:** one fresh `janitor` run per batch. The tracker carries the state.

Same corpus, one warm server, a pause between runs, 1 repeat. Run 3 repeats only where a result differs.
**Validation:** the variant with the lower critical error rate becomes the formula. **Phase C gate:** ARCHITECT picks the formula.

### Phase D — Model matrix (one model at a time, on ARCHITECT's signal)

**Order:** total parameters, smallest first:
1. Qwen3.5-4B Q4_K_M (from Phase C)
2. Gemma 4 E2B Q4_K_M
3. Gemma 4 E2B Q8_0
4. Gemma 4 E4B Q4_K_M
5. Qwen3.5-9B Q4_K_M

**Per model:**
1. Download, verify the size, and add the preset section (`PLAN-llama-cpp-local-model-baseline.md` Step 6.1).
2. Run `llama-bench`.
3. Run the formula on the Phase C corpus. Record the C2 metrics.
4. Append the model's results to `caroline/MACHINIST-REPORT-local-model-benchmark.md` (Locked Decision 3).
5. Stop, report, and wait for ARCHITECT's next signal.

**Phase D gate:** ARCHITECT picks the model, or none.

### Phase E — Real library campaign

**Scope:** one JAM library that ARCHITECT names, in a scratch clone or copy
**Action:** Run the full campaign with the chosen model and formula, from scan to the last `PENDING` row.
**Audit:**
- a rescan finds zero non-FLAGGED rows
- every file parses
- the tracker and `git log` match row for row
- ARCHITECT reviews the diff and builds the copy

**Phase E gate:** ARCHITECT decides whether JANITOR runs on the real tree.

## BLESSED Alignment

- **Bound:**
  - Tools own only their batch.
  - One warm server per model.
  - One model at a time.
- **Lean:**
  - Each Lua tool has one job.
  - The model gets 6 tools, not a shell.
- **Explicit:**
  - Each finding and each result is exact `file:line` data.
  - Failed checks return error results.
- **SSOT:**
  - One rule file per CONTRACT rule, citing its heading.
  - One tracker per campaign.
  - One edit path (`carol apply`).
- **Stateless:** The tracker carries all state. A compaction or a fresh run resumes from it.
- **Encapsulation:** The core is CLI and harness-agnostic. pi is one binding.
- **Deterministic:**
  - The core is deterministic by construction.
  - The model's choices are bounded by the rule tables.
  - Errors are measured against ground truth.

## Locked Decisions (ARCHITECT, 2026-11-22)

1. **`.carol/local/` encapsulates all local-model work, and the whole folder is gitignored.** ARCHITECT: "encapsulate all here including models: local/models/ so the whole local is gitignored".
   - `local/models/`: GGUF weights. Moved from `~/.carol/models/`.
   - `local/models-preset.ini`: the llama.cpp preset. Moved from `pi/models-preset.ini`.
   - `local/janitor/`: the Phase A Lua tools and `rules/`.
   - The tracked `SKILL.md` files document the invocation paths.
   - Consequence: the Phase A tools have no git history and do not sync to the other machines.
2. **Phase A real-code tiers.** ARCHITECT: "pick any with easy, medium, difficult tier". The picks are `jam_document`, `jam_data_structures`, and `jam_core` (Step A4).

3. **Benchmark results go to a CAROLINE report, not an RFC.** ARCHITECT: "the benchmark should be written to caroline not as rfc but report, deterministic tools is the baseline. what's the point of open ended?"
   - The file is `~/Documents/Poems/dev/caroline/MACHINIST-REPORT-local-model-benchmark.md`. The family is `ling/MACHINIST-REPORT-nvim-ling-test.md`: title, date, binary, target, method, results table.
   - The baseline is the deterministic-tools loop (Phases A-C). The open-ended run of the halted Step 6 (generic tools only) is dropped and not recorded.
   - This replaces Locked Decision 2 of `PLAN-llama-cpp-local-model-baseline.md` (the RFC results section).

4. **Phase A rulings (ARCHITECT, 2026-11-22).**
   - "keywords ciso646 should not applied to macros. we need to explicitly wrote that to CODING.md". CODING.md **Special operators:** and CRITICAL RULES now say that preprocessor directives (`#if`, `#elif`, `#define`) keep `!`, `&&`, `||`. `rules/special-operators.lua` skips the conditions of `#if` and `#elif`.
   - "always new line": the open banner never shares the `{` line. CODING.md says so. `rules/namespace-enclosure-format.lua` splits `{ /*___*/` into `{` and the exact open banner.
   - Banner strings stay the 80-column exemplar (`jam_ModelUtils.cpp:3, 313`). ARCHITECT's pasted example had 81 columns (77 underscores, and 30 + 30). MACHINIST reported the difference once.

## Phase A Result (model-free)

| Campaign | Files | Findings | Done | Flagged | Remaining | Wall | Wrong edits |
|---|---|---|---|---|---|---|---|
| Corpus (ground truth) | 6 | 18 | 15 | 3 | 0 | 0 s | 0; all 5 expected files match exactly |
| `jam_document` | 4 | 6 | 6 | 0 | 0 | 1 s | 0 |
| `jam_data_structures` | 16 | 12 | 12 | 0 | 0 | 0 s | 0 |
| `jam_core` | 83 | 109 | 109 | 0 | 0 | 3 s | 0 |

- Determinism: two scans are byte-identical, and two campaigns give identical git trees (before the last rule change). A re-check after the last change waits for an ARCHITECT prompt that names git.
- The restore path fired before the preprocessor ruling (13 edits restored by the parse check). Those edits are now out of scope.

## Risks / Open Questions

None.
