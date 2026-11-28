# PLAN: HOUSEKEEPER Deterministic Loop

**RFC:** none — objective from ARCHITECT prompt (2026-11-22). Context: `PLAN-pi-cli-harness-and-housekeeper-primary-role-integration.md`, `PLAN-llama-cpp-local-model-baseline.md` (Steps 1-5 done; Step 6 halted by ARCHITECT), `~/Documents/Poems/dev/caroline/RFC-local-model-workers.md`.
**Date:** 2026-11-22
**Status:** SUPERSEDED (2026-11-28) — historical baseline only. Lua/nvim tool design is deleted; current MCP discovery state is in `HANDOFF-housekeeper.md`.
**BLESSED Compliance:** verified
**Language Constraints:** Lua run by `nvim --headless -l` (skill tooling), TypeScript pi extension, bash 3.2 launcher, Markdown contract documents
**Executor:** MACHINIST (direct execution, no Engineer)
**Iteration:** each phase ends with numbers and an ARCHITECT go/no-go. ARCHITECT edits this plan between phases.

## Overview

Build HOUSEKEEPER as a deterministic harness. Deterministic tools do every exact operation. The model only interprets the request, classifies each finding, and reviews each result. The tracker document holds all campaign state, so a small context window can work a whole library chunk by chunk. The harness is model-agnostic and harness-agnostic: the tools are CLI scripts, and each harness binds them. Then measure which local model runs the loop on this machine with an error rate as close to 0% as possible.

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
7. "take it slow. one by one." One model at a time.

## Evidence Carried In

| Fact | Source |
|---|---|
| Infra works. llama.cpp 1.0.0 router, preset, credential, `housekeeper` lifecycle, gate probes: all pass. | `PLAN-llama-cpp-local-model-baseline.md` Step 5; `scratchpad/t12/step5.out` |
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
| Local model workspace, gitignored: weights, preset, HOUSEKEEPER tools | `~/.carol/local/` (Locked Decision 1) | A, C, D |
| Ledger subcommands keyed by ID | `carol debt add`, `carol debt clear <id>` (`CAROL.md` Documentation) | A |
| One deterministic edit path for all scripted edits | `carol apply` (`CAROL.md:329-332`) | A |
| Tool extension with numbered read | `caroline/RFC-local-model-workers.md` S1 `local-tools.ts` (`getNumberedLines`, `MAX_RANGE_LINES`) | B |
| Fixture repo per run, ground truth by deterministic transform | `scratchpad/t11/template`, `t11/expected` | A, C |
| One warm server per model; never reload per request | `PLAN-llama-cpp-local-model-baseline.md` Step 6 | C, D |

### 3. Names

| Name | Family | Phase |
|---|---|---|
| `read_range` | S1 scaffold tool name (`caroline/RFC-local-model-workers.md:73`) | B |
| `local/housekeeper/scan.lua`, `fix.lua`, `tracker.lua` | `skills/trace/` script names (`trace.lua`, `sample.lua`, `driver.lua`); `housekeeper` is the role and launcher name | A |
| `local/housekeeper/rules/<rule-id>.lua` | data files, one per CONTRACT rule; a rule id is the CODING.md heading in kebab-case | A |
| pi tools `scan_rule`, `fix_batch`, `set_status` (`check_parse` and `commit_batch` are inside `fix_batch`, Phase B Result) | verb_noun, as `read_range` | B |
| `CLEAN-UP-<subject>.md` | `clean-up-writer` skill | A |

### 4. Synthesis

| Rule | Form | Phase |
|---|---|---|
| SSOT | Each rule is defined once, in `rules/<rule-id>.lua`, and cites its CODING.md heading. The tracker is the only campaign state. `carol apply` is the only edit path. | A |
| Stateless | Each cycle reads the tracker, does one batch, and writes the tracker. Nothing persists in chat. | A, B |
| Explicit | Every tool returns exact `file:line` data. A failed check returns an error result, never a silent pass. | A, B |
| Deterministic | The same input files and rule give the same findings and the same edits, every run. | A |
| Bound | A tool owns only its batch files. `housekeeper` owns only the server it spawned. | A, B |
| Encapsulation | The core tools are harness-agnostic CLI. Each harness binds them (pi tools now; Claude, OpenCode, agy, and CAROLINE later). | A, B |

### 5. Absence

| Need | Proof | Phase |
|---|---|---|
| A model-callable compaction | `/compact` is user input. Tools are only what `--tools` names (`compaction.md:41`; `cli.md:121`). The extension hook supplies the handoff. | B |
| Ground truth for a real library | none exists. The audit criteria replace it: a rescan finds zero remaining, every file parses, and ARCHITECT reviews the diff. | E |

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
**Scope:** `local/housekeeper/rules/`
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
**Scope:** `local/housekeeper/`
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
**Scope:** `local/housekeeper/`
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

#### Step B1: HOUSEKEEPER tools extension
**Scope:** `pi/extensions/` (a tools file next to `carol-gate.ts`)
**Action:**
1. Register `read_range` (S1 pattern), `scan_rule`, `fix_batch`, and `set_status`. Each wraps the Phase A CLI through `pi.exec`. `fix_batch` does the parse check and the commit, so `check_parse` and `commit_batch` are not separate tools.
2. Each tool returns exact data, with `promptSnippet` and `promptGuidelines` that name the tool.
**Validation:** each tool, called by hand through pi's RPC or print mode, returns the CLI result unchanged.

#### Step B2: Tool set and prompt
**Scope:** `pi/bin/housekeeper`, `agents/housekeeper.md`, `skills/iterative-contract-sop/SKILL.md`, `pi/HARNESS.md`
**Action:**
1. `housekeeper` passes `--tools` with the HOUSEKEEPER tools only. No `bash`, `write`, `edit`, `find`, or `grep`. The evidence: free shell access caused every wander in `t13`.
2. Rewrite the SOP as the Loop above, one tool per step.
3. Update `housekeeper.md` and HARNESS.md to match.
**Validation:** STE. Every step of the Loop names exactly one tool.

#### Step B3: Compaction handoff
**Scope:** `pi/extensions/carol-gate.ts`
**Action:** On `session_before_compact`, return a fixed summary built from the tracker: path, objective, last commit, next `PENDING` ID, next action.
**Validation:** a forced `/compact` mid-campaign resumes at the right row.

#### Step B4: Gate update
**Scope:** `pi/extensions/carol-gate.ts`
**Action:** The dirty-tree check moves into the tools: `scan_rule` refuses a dirty tree, and `fix_batch` refuses any dirty path except the tracker. Git runs only inside `fix_batch`. Remove the gates on tools that no longer exist. One allow-list blocks every tool outside the four, with `terminate: true`.
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

#### Step C3: Loop variants
1. **Variant 1, ARCHITECT's design:** one session; compaction with the B3 handoff.
2. **Variant 2, control:** one fresh `housekeeper` run per batch. The tracker carries the state.

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

**Phase E gate:** ARCHITECT decides whether HOUSEKEEPER runs on the real tree.

## BLESSED Alignment

- **Bound:**
  - Tools own only their batch.
  - One warm server per model.
  - One model at a time.
- **Lean:**
  - Each Lua tool has one job.
  - The model gets 4 tools, not a shell.
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
   - `local/housekeeper/`: the Phase A Lua tools and `rules/`.
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
   - ARCHITECT: "it should be 80 column. write verbatim". CODING.md NAMESPACES now holds the **Namespace enclosure format:** block verbatim, with 80-column banners. The banners equal the `openBanner` and `closeBanner` strings of `rules/namespace-enclosure-format.lua`.

## Phase A Result (model-free)

| Campaign | Files | Findings | Done | Flagged | Remaining | Wall | Wrong edits |
|---|---|---|---|---|---|---|---|
| Corpus (ground truth) | 6 | 18 | 15 | 3 | 0 | 0 s | 0; all 5 expected files match exactly |
| `jam_document` | 4 | 6 | 6 | 0 | 0 | 1 s | 0 |
| `jam_data_structures` | 16 | 12 | 12 | 0 | 0 | 0 s | 0 |
| `jam_core` | 83 | 109 | 109 | 0 | 0 | 3 s | 0 |

- Determinism: two scans are byte-identical, and two campaigns give identical git trees. Re-checked after the last rule change and the Phase B `fix.lua` correction: two full `a4.sh` runs give identical `HEAD^{tree}` hashes and identical commit messages in all four campaigns (`scratchpad/a4/trees3.txt`, `trees4.txt`).
- The restore path fired before the preprocessor ruling (13 edits restored by the parse check). Those edits are now out of scope.

## Phase B Result (harness binding, Qwen3.5-4B Q4_K_M)

**Method:**
1. One warm `llama serve` router, started once. `housekeeper` finds `/health` and spawns no server.
2. Fixture repos in `scratchpad/b/`, made from `scratchpad/a4/fixtures/src` with a baseline commit.
3. Runs 1-3: `housekeeper --print --mode json --no-session`, one tool per prompt.
4. Runs 5-6: `scratchpad/b/driver.py` drives `housekeeper --mode rpc --no-session`. Steps: `scan_rule`, `set_status` row 004 (a probe), `fix_batch`, the RPC `compact` command, then "Continue.".
5. A CLI twin repo (`scratchpad/b/twin`) runs the same calls through the Lua CLI. The comparison masks commit hashes.

**Design (as built):**
- 4 tools: `read_range`, `scan_rule`, `set_status`, `fix_batch` (`pi/extensions/housekeeper-tools.ts`). Each wraps `nvim --headless -l ~/.carol/local/housekeeper/<script>`.
- `agents/housekeeper.md` frontmatter is the one source of the model (`model:`) and the tool list (`tools:`). `pi/bin/housekeeper` reads both. `CAROL_PI_MODEL` overrides the model.
- `housekeeper` composes the prompt: the HOUSEKEEPER core of CAROL.md, `output-styles.md`, `pi/HARNESS.md`, `agents/housekeeper.md`, and the `iterative-contract-sop` skill. It passes `--no-skills` and `--no-context-files`.
- `Tracker.batchFiles = 5` is the one batch size. `scan_rule` and `fix_batch` print the next batch.

| Step | Check | Result | Evidence |
|---|---|---|---|
| B1 `read_range` | Tool result equals lines 1-15 of the file, numbered | Pass: identical. 27 s, cold prefill included. | `b/run1.jsonl`, `run1.tool.txt` |
| B1 `scan_rule` (`check`) | Tool result equals `scan.lua --check` | Pass: identical, 18 findings, tree clean. 7 s warm. | `b/run2.jsonl`, `run2.cli.txt` |
| B1 `set_status`, `fix_batch` | Tool results, final tree, commit messages equal the CLI twin | Pass: all three identical. | `b/run5.jsonl`, `run5.tools.txt`, `twin.out` |
| B2 | `--tools` from the frontmatter, SOP in the prompt | Pass: the model saw and called only the 4 tools. | runs 1-6 |
| B3 | pi's compaction summary equals `tracker.lua --handoff` | Pass: byte-identical. 6596 to 5896 tokens. After "Continue." the model called `read_range` on the batch-2 file, then `fix_batch`. | `b/run6.jsonl`, `run6.summary.txt`, `run6.handoff.txt` |
| B4 | `housekeeper --tools bash,read_range`, then the model calls `bash` | Pass: blocked with "CAROL gate: HOUSEKEEPER calls only read_range, scan_rule, set_status, and fix_batch.". The run ended. No file was made. The model reported the reason verbatim. | `b/run3.jsonl` |

**Defect found and corrected (`local/housekeeper/fix.lua`):**
- Before: the rescan wanted zero fix findings in the file. A `set_status` flag keeps its finding in the file on purpose. So one flagged row restored the whole file and flagged its good rows. Run 5: rows 005-008 were flagged with "rescan still finds 1 fix findings; file restored".
- After: `setFileRows` counts the fix findings on flagged rows (`flaggedFixCount`). `applyFixes` requires the rescan to find exactly that count.
- Verified: the twin now gives 14 DONE and 4 FLAGGED. Row 004 stays unchanged, and rows 005-008 are fixed. `scan.lua --check` lists only the 4 FLAGGED rows. The Phase A regression stays exact, and the determinism re-check passes.

**Compaction test setting:** pi refused the first `compact` with "Nothing to compact (session too small)". The conversation was below `keepRecentTokens` 4096 (`docs/compaction.md:45`). Run 6 used a project file `.pi/settings.json` with `{"compaction":{"keepRecentTokens":512}}`, committed in the fixture baseline. The global setting stays 4096.

**Model observations (input to Phase C, not Phase B failures):**
1. Run 4, a free-form request ("Clean up all special operator and namespace violations in src."): the model wrote "Scanning `src` for `special-operators` and `no-anonymous-namespaces-allowed` violations." and ended its turn with no tool call. It chose 2 of the 4 rules. Prompt: 5243 tokens, prefill 16.3 s, decode 20.8 tok/s.
2. Run 6, batch 2 after the compaction: the model called `set_status` on 6 pure-syntax banner rows (012-014, 016-018). Each reason only repeated the row kind. All 8 batch-2 rows ended FLAGGED. No wrong edit: the tools contained the error, and the tracker records it.
3. Run 6: the model called `set_status` on rows 011 and 015, which were already flag rows. `tracker.lua` refused both: "row 011 is not a PENDING fix row". The tool error text starts with the Lua chunk prefix (`E5113: Lua chunk: …/tracker.lua:209:`).

**Phase B gate:** report to ARCHITECT.

## Phase C Result (loop formula, Qwen3.5-4B Q4_K_M)

**Corpus (C1, `scratchpad/c/template/`):** 28 source files.
- `fixtures/`: the Phase A fixtures, plus `overload.cpp` (`operator!`, `operator&&`, `operator||` with operators in their bodies) and `nested.cpp` (nested namespaces, a short open banner, a wrong close banner).
- Copies of `jam_document` and `jam_data_structures`, so that the campaign has 4 batches.

**Ground truth:** the model-free tools on the same corpus (`scratchpad/c/truth`).
- 41 rows: 38 DONE, 3 FLAGGED, 4 batches.
- MACHINIST read the results for the new fixtures. Operator names stay. Operators in the bodies become `not`, `and`, `or`. Banners become the exact 80-column strings.

**Harness:** `scratchpad/c/campaign.py` (repo, variant, memory sample), `scratchpad/c/score.py` (score against the truth by row key and by file). One warm router. A 30 s pause between variants. The request for both variants: "Clean up all special operator and namespace violations in this repository."

| Metric | Variant 1 (one session) | Variant 2 (fresh run per batch) |
|---|---|---|
| Correct fixes | 38 of 38 | 38 of 38 |
| Wrong edits (critical) | 0 | 0 |
| Correct flags | 2 of 3 | 2 of 3 |
| False flags | 0 | 0 |
| Missed rows | 1 | 1 |
| `housekeeper` runs | 1 | 1 |
| Tool calls | 23 (`scan_rule` 1, `read_range` 16, `set_status` 2, `fix_batch` 4) | 7 (`scan_rule` 1, `read_range` 2, `fix_batch` 4) |
| Tool errors | 2 | 0 |
| Gate blocks | 0 | 0 |
| Compactions | 0 | 0 |
| Tokens (input / cache read / output) | 10678 / 196158 / 1929 | 2341 / 52717 / 743 |
| Wall time | 110 s | 47 s |
| Peak llama memory | 3884 MB | 3667 MB |

**Findings:**
1. **The final trees are identical** between the variants, outside the tracker name. All 38 fixes equal the ground truth.
2. **The only miss is at Interpret, the same in both variants.** The model chose 3 rules and left out `no-namespace-detail-allowed`. So the `namespace detail` row (`fixtures/types.cpp:14-16`) was never scanned. The rescan mismatch in the score comes from the same row.
3. **Variant 2 did not run as designed.** The first `housekeeper` run did all 4 batches in one session, so no second run started. Nothing ends a run after one `fix_batch`.
4. **No compaction happened.** The largest context was 12583 tokens (router log). The threshold is 32768 − 8192 = 24576. B3 validated the handoff path separately.
5. **Classify was skipped in part.** Variant 1 read the rows of each batch (16 `read_range` calls). Variant 2 read 2 files in batch 1, then called `fix_batch` 3 times with no reads. This had no effect here, because the rules decide every flag in this corpus.
6. **Protocol deviations in the report and in `set_status`:**
   - Variant 1 called `set_status` on rows 002 and 016, which the rules already flag. The tracker refused both: "row 002 is not a PENDING fix row".
   - Variant 1's report gave no `file:line` for the flagged rows (SOP step 6).
   - Variant 2's report said "38 rows fixed across 5 commits". The batch commits are 4.
7. **Repeats:** the plan runs 3 repeats only where a result differs. The outcome metrics are the same in both variants, so no repeat ran.

**Phase C gate:** ARCHITECT picks the formula.

## Phase C Rerun Result (both formulas built, Qwen3.5-4B Q4_K_M)

ARCHITECT: "both. git permision granted". Build Variant 2 as designed, then measure it against Variant 1.

**The two formulas:**
- Variant 1: one `housekeeper` run does the whole campaign. The model keeps all batches in one context. A compaction replaces the context with the tracker handoff only when the context reaches the threshold.
- Variant 2: each `housekeeper` run does one batch, then ends. The harness starts the next run with the tracker handoff as the only prompt. So each batch starts from an empty context.
- The tools, the tracker, and the edits are the same in both. Only the context that the model carries between batches is different.

**Changes:**
1. `pi/extensions/housekeeper-tools.ts:14-15, 107`: `fix_batch` returns `terminate: true` (pi `docs/extensions.md:2289`) when all of these are true:
   - `CAROL_HOUSEKEEPER_LOOP` is `batch`.
   - The result is not an error.
   - The output has `pending:` above 0.
   When `CAROL_HOUSEKEEPER_LOOP` is not set, Variant 1 runs as before.
2. `local/housekeeper/tracker.lua:184-185`: the handoff "Next action" was "call fix_batch". It skipped Classify (`skills/iterative-contract-sop/SKILL.md:36-39`). It is now "classify the batch rows with read_range and set_status, then call fix_batch". The text is also the Variant 1 compaction summary (B3).
3. `scratchpad/c/campaign.py` `runVariant2`: sets `CAROL_HOUSEKEEPER_LOOP=batch` for each `housekeeper` run.

**Defect found and corrected during the run:** the first `terminate` check ended the run on every output that did not start with `complete:`. The last batch prints `pending: 0` (`local/housekeeper/fix.lua:267`), not `complete:` (`fix.lua:310`, a call with no PENDING rows). So run 4 ended after its fix, and `campaign.py:84` saw a complete tracker and started no report run. The check now ends a run only while `pending` is above 0. The table shows the run after the correction.

**Method:** the Phase C corpus, truth, request, and scorer. One warm router, a 30 s pause between variants. Repos `scratchpad/c/v1r` and `scratchpad/c/v2r`. The Phase C runs stay in `v1` and `v2`.

| Metric | V1 Phase C | V1 rerun (`v1r`) | V2 Phase C | V2 as designed (`v2r`) |
|---|---|---|---|---|
| Correct fixes | 38 of 38 | 37 of 38 | 38 of 38 | 38 of 38 |
| Wrong edits (critical) | 0 | 0 | 0 | 0 |
| Correct flags | 2 of 3 | 2 of 3 | 2 of 3 | 2 of 3 |
| False flags | 0 | 1 | 0 | 0 |
| Missed rows | 1 | 1 | 1 | 1 |
| `housekeeper` runs | 1 | 1 | 1 | 4 |
| Tool calls | 23 | 32 (`scan_rule` 1, `read_range` 24, `set_status` 3, `fix_batch` 4) | 7 | 28 (`scan_rule` 1, `read_range` 23, `fix_batch` 4) |
| Tool errors | 2 | 2 | 0 | 0 |
| Compactions | 0 | 0 | 0 | 0 |
| Tokens (input / cache read / output) | 10678 / 196158 / 1929 | 10156 / 295609 / 2824 | 2341 / 52717 / 743 | 9444 / 115061 / 1937 |
| Wall time | 110 s | 162 s | 47 s | 119 s |
| Peak llama memory | 3884 MB | 4065 MB | 3667 MB | 4161 MB |

**Findings:**
1. **Wrong edits are 0 in all four runs.** By the C3 validation rule (lower critical error rate), the wrong-edit count does not pick a formula.
2. **The Interpret miss is the same in all four runs.** The model left out `no-namespace-detail-allowed`, so the `fixtures/types.cpp:14-16` row was never scanned.
3. **Variant 1 rerun made one false flag.** The model flagged row 015, `fixtures/preprocessor.cpp:7` (`return ! a;`), with the reason "Preprocessor directives are out of scope". The directive is on line 1 (`#if A && ! defined(B)`). The tools left the row unchanged, so no wrong edit occurred. One fix was lost.
4. **Variant 1 rerun called `set_status` on rows that the rules already flag.** The tracker refused them: 2 tool errors, the same as Phase C.
5. **Variant 2 classified every batch.** It made 23 `read_range` calls over 4 runs, and the Phase C run made 2. It called `set_status` on no row that the rules already flag, so it had 0 tool errors. The new handoff text gives the Classify step to each run.
6. **Variant 2 used fewer tokens.** Cache read was 115061, and the Variant 1 rerun used 295609. Each run starts from the handoff, not from the earlier batches.
7. **Variant 2 report gap.** Run 4 ended with "Fixed all 7 rows. Commit 34babff. Campaign complete." It has no DONE or FLAGGED counts and no flagged rows (SOP step 6, `SKILL.md:42`). Run 4 sees only batch 4, so it does not know the flags of batches 1-3.
8. **Variant 1 rerun report error.** It gave "Committed: 3 commits" and listed 4 hashes. It gave `file:line` for the 2 flagged rows.
9. **The Variant 1 run-to-run spread is wide on the same corpus at temperature 0.** Phase C: 16 reads, 0 false flags, 110 s. Rerun: 24 reads, 1 false flag, 162 s.

**Locked Phase C formula (ARCHITECT, 2026-11-22):**
1. **In-process per-batch compaction (V2):** `pi/extensions/carol-gate.ts` intercepts `turn_end` after each `fix_batch` whose output has `pending:` above 0 and appends a retain-none compaction entry (`firstKeptEntryId: null`) with `tracker.lua --handoff` as summary, plus `continue: true`. One `housekeeper` session runs the whole campaign; every batch starts from the tracker handoff alone. Works in TUI, `--print`, and `--mode rpc`. `terminate` and `CAROL_HOUSEKEEPER_LOOP` were deleted from `pi/extensions/housekeeper-tools.ts`, and the external run loop was deleted from `scratchpad/c/campaign.py`.
2. **Tool-owned final report:** `local/housekeeper/tracker.lua` adds `Tracker.getReportText` (counts + every `FLAGGED` row with `file:line` and reason). `local/housekeeper/fix.lua` appends it when `pending` is 0 and on `complete:`. `skills/iterative-contract-sop/SKILL.md` steps 4–6 match.
3. **Section-to-rules map in Lua (Interpret fix):** `local/housekeeper/scan.lua` adds a `sections` table (`formatting` -> `special-operators`; `namespaces` -> `no-anonymous-namespaces-allowed`, `no-namespace-detail-allowed`, `namespace-enclosure-format`) and deduplicates expanded rule ids. `pi/extensions/housekeeper-tools.ts` and `skills/iterative-contract-sop/SKILL.md` document the sections.

| Metric | In-process V2 (`v2i`, before sections) | Locked formula (`v2s`, with sections) |
|---|---|---|
| Correct fixes | 38 of 38 | 38 of 38 |
| Wrong edits (critical) | 0 | 0 |
| Correct flags | 2 of 3 | 3 of 3 |
| False flags | 0 | 0 |
| Missed rows | 1 | 0 |
| Rescan mismatch | 1 | 0 |
| `housekeeper` runs | 1 | 1 |
| Tool calls | 30 (`scan_rule` 1, `read_range` 24, `set_status` 1, `fix_batch` 4) | 26 (`scan_rule` 1, `read_range` 19, `set_status` 2, `fix_batch` 4) |
| Tool errors | 1 | 2 |
| Tokens (input / cache read / output) | 11545 / 132992 / 2763 | 10579 / 72627 / 1940 |
| Wall time | 152.1 s | 105.6 s |
| Peak llama memory | 4141 MB | 3951 MB |

- **Compaction proof (`v2i`):** total context tokens dropped from 7025 to 6311 after batch 1, from 9989 to 6507 after batch 2, and from 7036 to 6385 after batch 3. Peak context stayed at 9989 tokens.
- **Phase C gate:** passed and locked (`v2s`: 38/38 fixes, 3/3 flags, 0 missed, 0 false flags, 0 wrong edits, 0 rescan mismatch).

## Phase E Result (real JAM library, Qwen3.5-4B Q4_K_M)

**Target:** scratch copy of `~/Documents/Poems/dev/jam/jam_dsp` (`/tmp/housekeeper-phase-e/run`, 39 source files, 25 affected files, 5 batches, 108 rows: 96 fix, 12 flag — `special-operators` 75, `namespace-enclosure-format` 33). The real `jam_dsp` repo was untouched.

**Method:** one warm `llama serve` router (`Qwen3.5-4B-Q4_K_M`), locked Phase C formula (in-process per-batch compaction + section mapping), scored against model-free ground truth (`/tmp/housekeeper-phase-e/truth`).

| Metric | `jam_dsp` (Phase E) |
|---|---|
| Correct fixes | 96 of 96 |
| Wrong edits (critical) | 0 |
| Correct flags | 12 of 12 |
| False flags | 0 |
| Missed rows | 0 |
| Source diff vs ground truth | 0 differences (identical) |
| Post-campaign rescan | 12 findings (equals 12 FLAGGED rows) |
| New parse errors | 0 (26/39 clean before and after; 13 pre-existing JUCE macro parse quirks) |
| `housekeeper` runs | 1 (4 in-process per-batch compactions) |
| Tool calls | 53 (`scan_rule` 1, `read_range` 38, `set_status` 9, `fix_batch` 5) |
| Tool errors | 9 (`set_status` on rows 052–060, already flagged by rule; rejected cleanly) |
| Tokens (input / cache read / output) | 13856 / 143155 / 3723 |
| Peak context | 8977 tokens (`cacheRead` reset to 5745 after every batch) |
| Wall time | 198.3 s |
| Peak llama memory | 4262 MB |

- **Phase E audit:** passed. Every edit matches ground truth, rescan leaves only the 12 flagged rows, no new parse errors exist, and context stays below 9k tokens across all 5 batches.

## Risks / Open Questions

None.
