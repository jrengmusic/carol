## Handoff to MACHINIST: HOUSEKEEPER deterministic loop on a local model (pi + llama.cpp)

**From:** MACHINIST
**Date:** 2026-11-22
**Status:** Blocked (Phase C gate: ARCHITECT picks the loop formula)

### Read First
1. `~/.carol/PLAN-housekeeper-deterministic-loop.md`. It is the plan. Phases A-E, Locked Decisions (`:289`), Phase A Result (`:310`), Phase B Result (`:322`), Phase C Result (`:360`).
2. `~/.carol/PLAN-llama-cpp-local-model-baseline.md`. It has the llama.cpp infra steps 1-5 (done) and the halted Step 6.
3. `~/.carol/PLAN-pi-cli-harness-and-housekeeper-primary-role-integration.md`. It has the pi harness and HOUSEKEEPER role decisions 1-4.
4. `~/.carol/RFC-pi_cli_harness_and_housekeeper_primary_role_integration.md`. It is the original RFC. MACHINIST verified its claims and corrected its defects in the integration plan.
5. `~/.carol/agents/housekeeper.md`. It is the role. Its frontmatter is the one source of the model (`:6`) and the tool list (`:4`).
6. `~/.carol/skills/iterative-contract-sop/SKILL.md`. It is the Loop: Interpret, Scan, Classify, Fix, Repeat, Report.
7. `~/.carol/skills/clean-up-writer/SKILL.md`. It is the `CLEAN-UP-<subject>.md` format.
8. `~/.carol/pi/bin/housekeeper`, `~/.carol/pi/extensions/housekeeper-tools.ts`, `~/.carol/pi/extensions/carol-gate.ts`, `~/.carol/pi/HARNESS.md`. They are the pi binding.
9. `~/.carol/local/housekeeper/` (`scan.lua`, `fix.lua`, `tracker.lua`, `syntax.lua`, `arguments.lua`, `repository.lua`, `rules/*.lua`). It is the deterministic core. It is gitignored.

### Context
- The objective: HOUSEKEEPER, a housekeeping primary on a local model, does CODING.md clean-up campaigns over a file, a module, or a whole library.
- The design rule is ARCHITECT's: deterministic tools do every scan, edit, check, and commit. The model only interprets the request, classifies rows, and reports.
- The model is expendable. The protocol, role, skill, rules, and contract are model-agnostic.
- pi is a temporary harness. The final target is CAROLINE (`~/Documents/Poems/dev/caroline/`). It is model-agnostic and mixes online subscriptions with local models.
- The machine has limited resources.
  - One model at a time.
  - One warm server. Never reload per request.
  - Take it slow.

**Answer to "does the smallest Qwen work as HOUSEKEEPER?"**
- Only Qwen3.5-4B Q4_K_M was tested. It is the first and smallest model in the Phase D order (PLAN `:238-243`).
- On the Phase C corpus (28 files, 41 rows), both variants gave 38 of 38 correct fixes, 0 wrong edits, and 0 false flags. Each run took 47-110 s, with 3.7-3.9 GB peak llama memory (PLAN `:360`).
- The model made these errors. The tools contained every one of them. No run made a wrong edit.
  1. Interpret: it chose 3 of the 4 rules in both Phase C variants. `no-namespace-detail-allowed` was left out, so 1 row was never scanned.
  2. Phase B run 4 used "Clean up all special operator and namespace violations in src.". The model wrote text and ended the turn with no tool call, and chose 2 of 4 rules. Phase C used "…in this repository.", and the campaign ran. Both runs were at temperature 0.
  3. Phase B run 6: after a compaction, the model flagged 6 pure-syntax banner rows (false flags).
  4. Reports: a flagged row without its `file:line` (Variant 1). A wrong commit count, "5 commits" for 4 (Variant 2).
- Not yet verified:
  - a compaction during a real campaign (the Phase C context peaked at 12583 tokens; the threshold is 24576)
  - a real library (Phase E)
  - any other model (Phase D)

### Completed
- **Infra (PLAN-llama-cpp Steps 1-5):**
  - Ollama is uninstalled and `~/.ollama` is deleted.
  - llama.cpp 1.0.0 is installed through brew.
  - `~/.carol/local/models/Qwen3.5-4B-Q4_K_M.gguf`: 2740937888 bytes, verified.
  - The preset is `~/.carol/local/models-preset.ini`: `[*]` with `c = 32768` (`:5`), `temp = 0` (`:10`), `np = 1`, `ctk/ctv = q8_0`, `fa = on`, `reasoning = off`, `cache-reuse = 256`. There is one section, `[Qwen3.5-4B-Q4_K_M]` (`:15`).
  - The pi llama.cpp credential is stored (`/login llama.cpp`, by ARCHITECT).
  - `~/.pi/agent/settings.json`: `reserveTokens` 8192 (`:6`), `keepRecentTokens` 4096 (`:7`).
- **Role and harness (in commit `202fb6c`):**
  - HOUSEKEEPER is in CAROL.md: Primaries `:93`, Documentation `:227`, the Git "HOUSEKEEPER checkpoint" `:300`.
  - `bin/carol` removes and skips `machinist.md` and `housekeeper.md` in project agent links.
  - `install.sh` links `~/.local/bin/housekeeper` to `~/.carol/pi/bin/housekeeper`.
  - `.gitignore` has `/local/` (`:35-36`).
  - `opencode/plugins/carol/source.js` filters out `housekeeper` (`:5`, `:117`).
- **CODING.md rulings:**
  - Preprocessor directives keep `!`, `&&`, `||` (`:38`, `:1072`).
  - The **Namespace enclosure format:** block is verbatim, with 80-column banners (`:671`).
- **Phase A, the deterministic core with no model:**
  - Results: corpus 18 findings, 15 DONE, 3 FLAGGED, all expected files exact. `jam_document` 6/6, `jam_data_structures` 12/12, `jam_core` 109/109 in 3 s. 0 remaining, 0 wrong edits (PLAN `:310`).
  - Determinism re-check: two `a4.sh` runs give identical `HEAD^{tree}` hashes and commit messages (`scratchpad/a4/trees3.txt`, `trees4.txt`).
- **Phase B, the pi binding:** all four steps pass (PLAN `:322`).
  - B1: each of the 4 tools equals the CLI output, and the final tree and commit messages equal a CLI twin.
  - B2: the model saw only the 4 tools.
  - B3: pi's compaction summary is byte-identical to `tracker.lua --handoff`, and the model resumed at batch 2.
  - B4: `bash` was blocked with `terminate`, and no file was made.
- **Defect corrected in Phase B (`local/housekeeper/fix.lua:142-218`):**
  - The rescan wanted zero fix findings. A row that `set_status` flags keeps its finding on purpose, so one flag restored the whole file.
  - Now `setFileRows` counts `flaggedFixCount` (`:194`, `:207`). `applyFixes` requires exactly that count (`:174`).
  - Verified: the twin gives 14 DONE and 4 FLAGGED. The Phase A regression stays exact.
- **Phase C (PLAN `:360`):**
  - Corpus `scratchpad/c/template/`: the Phase A fixtures, plus `overload.cpp`, `nested.cpp`, `jam_document`, and `jam_data_structures`.
  - The ground truth (`scratchpad/c/truth`): 41 rows, 38 DONE, 3 FLAGGED. MACHINIST read the new fixture results and they are correct.
  - Variant 1 and Variant 2 ran once each, with identical final trees.
  - The server is stopped.

### Remaining
1. **ARCHITECT:** the Phase C gate. Pick the loop formula (Open Question 1).
2. **ARCHITECT:** decide the Interpret miss (Open Question 2).
3. **MACHINIST, if ARCHITECT picks Variant 2 made real:**
   1. Make `fix_batch` end the run after each batch. Return `terminate: true` from the tool in `pi/extensions/housekeeper-tools.ts` (pi `docs/extensions.md:2289`).
   2. Run again. ARCHITECT's prompt must name git, because the harness runs `git init` and `git commit` in the scratch repos.
      ```
      cd ~/.carol/local && llama serve --models-dir models --models-preset models-preset.ini --models-max 1 --host 127.0.0.1 --port 9931   # background
      C=/private/tmp/claude-501/-Users-jreng--carol/d5351316-4f57-4dd7-9c5e-45f9a6d12494/scratchpad/c
      python3 -I $C/campaign.py v2 v2 && python3 -I $C/score.py v2
      ```
   3. Stop the server after the run.
4. **MACHINIST, after the Interpret decision:** carry out the change, then run Variant 1 and Variant 2 again with the commands above (`campaign.py v1 v1`, `score.py v1`). Target: 0 missed rows.
5. **MACHINIST, on ARCHITECT's signal:** Phase D, the model matrix (PLAN `:236`). One model at a time, smallest first:
   1. Qwen3.5-4B Q4_K_M (done in Phase C)
   2. Gemma 4 E2B Q4_K_M
   3. Gemma 4 E2B Q8_0
   4. Gemma 4 E4B Q4_K_M
   5. Qwen3.5-9B Q4_K_M

   For each model:
   1. Download it, verify the size, and add a preset section.
   2. Run `llama-bench -p 512,4096 -n 128 -fa on -ctk q8_0 -ctv q8_0`.
   3. Run the formula on the Phase C corpus.
   4. Append the results to `~/Documents/Poems/dev/caroline/MACHINIST-REPORT-local-model-benchmark.md`. The family is `ling/MACHINIST-REPORT-nvim-ling-test.md`.
   5. Stop and report.
6. **MACHINIST, on ARCHITECT's signal:** Phase E, a real JAM library campaign in a scratch copy (PLAN `:254`).
7. **ARCHITECT:** commit `PLAN-housekeeper-deterministic-loop.md`. It has the Phase B and C results and the 4-tool design. It is the only modified tracked file (`git status`).

### Key Decisions
- "we probably also does not need `picarol`, simply `housekeeper` like machine always claude code with machinist. housekeeper always pi, and local anyway"
- "~/Documents/Poems/dev/caroline/ will be the ultimate goal actually. pi with whatever works now, is only serve temporary"
- "lower the model temperature, why would we need high / creative reasoning? its task is very deterministic and specific."
- "let's start from the smallest up to biggest params. but with proper infra. so [] delete ollama and all its models [] download model one by one, and get the number first."
- "ok brew"
- "i told you take it slow. one by one."
- "skip auditor"
- "stop then. expecting it to figure out itself are wasting time. must be determistic from the get go"
- "it need to find all violations first - list them into CLEAN-UP.md with specific objective - do the clean up, track them at CLEAN-UP.md - compaction do handoff"
- "this is still need judgement, i'm quite sure small models able to do that, given the exact instructions and tools."
- "not RFC. a comprehensive PLAN. so we also can iterate this."
- "protocol, role, skill, rules, contract are deterministic and model agnostic, meaning, model is expendable"
- ".carol/local/ < encapsulate all here including models: local/models/ so the whole local is gitignored"
- "pick any with easy, medium, difficult tier"
- "the benchmark should be written to caroline not as rfc but report, deterministic tools is the baseline. what's the point of open ended?"
- "keywords ciso646 should not applied to macros. we need to explicitly wrote that to @CODING.md always new line"
- "it should be 80 column. write verbatim then continue next phase"
- AskUserQuestion selections, as labeled: "Per-session file"; "reserve 8192 / keep 4096"; "Edit bin/carol"; "Trim the system prompt"; "Skip housekeeper.md in source.js (Recommended)".
- "git permission granted", given for the scratch fixture repos of Phase A, B, and C.

### Files Modified
- In commit `202fb6c`:
  - `.gitignore` — `/local/`.
  - `CAROL.md` — the HOUSEKEEPER primary, the clean-up tracker documentation, the HOUSEKEEPER checkpoint.
  - `CODING.md` — the preprocessor exception, the namespace enclosure format.
  - `bin/carol` — no project links for `machinist.md` and `housekeeper.md`.
  - `install.sh` — the `housekeeper` link.
  - `agents/housekeeper.md` — the role and its frontmatter.
  - `skills/iterative-contract-sop/SKILL.md` — the Loop.
  - `skills/clean-up-writer/SKILL.md` — the tracker format.
  - `pi/HARNESS.md` — the pi counterparts.
  - `pi/bin/housekeeper` — the launcher (prompt composition, router spawn, frontmatter read).
  - `pi/extensions/carol-gate.ts` — the allow-list and the compaction handoff.
  - `pi/extensions/housekeeper-tools.ts` — the 4 tools.
  - The three PLAN files.
  - `agy/agents/auditor.md`.
- Uncommitted, tracked:
  - `PLAN-housekeeper-deterministic-loop.md` — the Phase B and C results, the 4-tool design (B1, B4, Names, Lean), the 80-column banner ruling, the determinism re-check.
  - `HANDOFF-housekeeper-deterministic-loop.md` — this file.
- Gitignored, so no history and no sync:
  - `local/housekeeper/fix.lua` — the `flaggedFixCount` correction (this session).
  - `local/housekeeper/*.lua`, `local/housekeeper/rules/*.lua` — the Phase A core.
  - `local/models-preset.ini`, `local/models/`.
- Machine-local, outside the repo:
  - `~/.pi/agent/settings.json`.
  - `~/.pi/agent/auth.json` — the llama.cpp credential.
  - `~/.pi/agent/models.json` — deleted.
  - `~/.local/bin/housekeeper` — the link.
- Scratchpad: `/private/tmp/claude-501/-Users-jreng--carol/d5351316-4f57-4dd7-9c5e-45f9a6d12494/scratchpad/`. A reboot or a cleanup can delete it.
  - `a4/a4.sh` and `a4/fixtures/` — the Phase A harness and its corpus.
  - `b/driver.py` and `b/run*.jsonl` — the Phase B RPC driver and its evidence.
  - `c/campaign.py`, `c/score.py`, `c/template/`, `c/truth/` — the Phase C harness, scorer, corpus, and ground truth.
  - `c/v1`, `c/v2`, `c/*-logs/` — the Phase C runs.

### Open Questions
1. **Loop formula (Phase C gate). The decider is ARCHITECT.**
   - Variant 1, one session: ARCHITECT's design. It read the rows on every batch. The result is proven.
   - Variant 2 made real: `fix_batch` ends the run after each batch (`terminate: true`). Each batch starts from the tracker handoff only. It is not yet tested. The Phase C Variant 2 run did all 4 batches in its first run.
2. **Interpret miss. The decider is ARCHITECT.** The model left out `no-namespace-detail-allowed` in both variants, although the SOP says that "namespace violations" maps to the three namespace rules (`skills/iterative-contract-sop/SKILL.md:28`). MACHINIST has not yet given options. Candidates, each with a source:
   - `scan_rule` takes CODING.md section names, and the Lua core maps each section to its rule ids. The map is the Rules table (`SKILL.md` Rules). Interpret then has no rule ids to choose.
   - Keep the rule ids, and fix the prompt formula only (the SOP wording). Measure it with the Phase C corpus.
3. **Harness durability. The decider is ARCHITECT.** The Phase A-C harness, corpus, and ground truth are only in the scratchpad, which a reboot can delete. `local/` is the gitignored workspace (Locked Decision 1). No location is decided.
4. **Model observations for Phase D. The decider is ARCHITECT.**
   - `set_status` on a rule-flag row returns the Lua chunk prefix (`E5113: Lua chunk: …/tracker.lua:209: row 011 is not a PENDING fix row`).
   - The model called `set_status` on rows that the rules already flag (Variant 1 rows 002 and 016, Phase B rows 011 and 015).
   - No action is decided.

### Next Steps
- Pick up at the Phase C gate. The trigger is ARCHITECT's choice of the loop formula (Open Question 1), then the Interpret decision (Open Question 2).
- Every run that makes a scratch repo needs ARCHITECT's prompt to name git (the `tool.call` hook, CAROL.md Git).
- Before any model run, start one warm router with the command in Remaining 3. Stop it after the run.
