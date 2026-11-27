## Handoff to MACHINIST: HOUSEKEEPER on a local model — discovery of feasible tasks over saw and ling MCP

**From:** MACHINIST
**Date:** 2026-11-28
**Status:** Blocked (pi's MCP client cannot connect to saw or ling; see Open Question 1)

### Read First
1. This file. It holds the current state. No PLAN for the MCP design exists yet.
2. `~/Documents/Poems/dev/caroline/MACHINIST-REPORT-local-model-benchmark.md`. It holds the measured baseline: throughput (`:22-42`) and campaign accuracy for the deleted Lua loop.
3. `~/.carol/PLAN-housekeeper-deterministic-loop.md`. It is history: the Phase A-E design and results of the Lua loop. Its tool design is deleted, but its results are the baseline to reproduce.
4. `~/.carol/HANDOFF-housekeeper-deterministic-loop.md`. It is stale (2026-11-22). It describes the deleted Lua core, the Gemma order, and scratchpad paths that no longer exist. Read it only for history.
5. `~/.carol/agents/housekeeper.md`, `~/.carol/pi/bin/housekeeper`, `~/.carol/pi/extensions/carol-gate.ts`, `~/.carol/pi/HARNESS.md`. They are the current pi binding.
6. `~/.carol/skills/profile/`, `~/.carol/skills/trace/`. They are the existing scout and whatdbg protocols for candidate tasks 2 and 3.
7. `~/Documents/Poems/dev/saw/RFC-exclusive-saw.md`. It records the MCP payload-size problem (`:57-60`, `:88`).

### Context
- The objective: find, with facts only, which tasks a local Qwen model can take over deterministically on this machine. HOUSEKEEPER is the working name of the role. Nothing is decided.
- The limits:
  - 16 GiB RAM, one model at a time, one warm llama server.
  - Context 32768 tokens (`local/models-preset.ini:5`).
  - Tool output must fit that window.
- The baseline: the deleted Lua loop passed every test with Qwen3.5-4B Q4_K_M (CAROLINE report):
  - Phase C: 38/38 fixes, 3/3 flags, 0 wrong edits.
  - Phase E (`jam_dsp`): 96/96 fixes, 12/12 flags.
  - v2 full contract with ling: 27/27 fixes, 30/30 flags.
  - Fixes were syntactic only. A violation beyond syntax was reported, not fixed.
- The hypothesis (not verified): the same loop over saw MCP and ling MCP gives an identical result.
- The candidate tasks are from ARCHITECT's message (Key Decisions). Each is "run and report", with no synthesis:
  1. Build with `cast spell <args>`, then excerpt the result, errors included. Possible skill: `spellcaster`.
  2. Profile with scout, through the existing `profile` skill. COUNSELOR drives. Build cost is high, so use the smallest model that works.
  3. Bug trace with whatdbg: run, then report each breakpoint hit at the place COUNSELOR names.
  4. Path trace with saw and ling: facts only (flow, dependencies, timing). An iterative loop with compaction or handoff ends in ONE report file for COUNSELOR.
- Open form: one HOUSEKEEPER with skills, or dedicated local roles (Builder, Profiler, Bugtracer, Analyzer). The facts decide.
- Discovery plan, six slices, reads only, with a report after each slice:
  1. saw and ling MCP: tool schemas, payload sizes against the window, pi MCP registration, gate allow-list for `mcp__*` tools, compaction. **In progress. Blocked.**
  2. Prior evidence: PLAN Phase A-E results, the CAROLINE report, the recorded failures (the Interpret miss, the `set_status` misuse on already-flagged rows, the false flags after compaction).
  3. cast: the `cast spell` interface, and the output size of a real build.
  4. scout: the `profile` skill, the manifest, `sudo -n`, and what the machine can run at the same time.
  5. whatdbg: the `trace` skill and its MCP tools.
  6. Machine limits: model RAM plus build RAM, and KV cache size against context.

### Completed
- **a. Gemma removed.**
  - Deleted `local/models/gemma-4-E2B-it-Q4_K_M.gguf` and `gemma-4-E4B-it-Q4_K_M.gguf`.
  - The preset now has one empty section for each Qwen model: 0.8B, 2B, 4B, 9B (`local/models-preset.ini:16-19`).
  - The Gemma rows in the CAROLINE report stay as history.
- **llama.cpp upgraded** from 1.0.0 to 1.1.0 with `brew upgrade llama.cpp`. `llama-server --version` gives `1.1.0 (build 12774, commit 171527522)`.
- **b. Throughput.** `llama-bench -p 512,4096 -n 128 -fa 1 -ctk q8_0 -ctv q8_0` was run on 1.1.0, one model at a time. Results are in the CAROLINE report `:33-42`:

  | Model | pp512 t/s | pp4096 t/s | tg128 t/s |
  |---|---|---|---|
  | Qwen3.5-0.8B Q4_K_M (497.39 MiB) | 1998.22 ± 33.91 | 1824.60 ± 30.44 | 103.08 ± 6.96 |
  | Qwen3.5-2B Q4_K_M (1.18 GiB) | 895.06 ± 24.73 | 842.06 ± 12.84 | 52.79 ± 0.29 |
  | Qwen3.5-4B Q4_K_M (2.54 GiB) | 374.83 ± 1.74 | 336.15 ± 3.00 | 25.45 ± 0.85 |
  | Qwen3.5-9B Q4_K_M (5.28 GiB) | 197.26 ± 5.66 | 180.74 ± 3.15 | 14.52 ± 0.61 |

- **Inkling research** (Librarian, then MACHINIST checks):
  - Inkling 2 Mini (Thinking Machines Lab, 2026-11-20) has 26.4B total and 3.4B active parameters.
  - Its `UD-Q4_K_M` file is 16.6 GB. The estimate is that it does not fit in 16 GiB.
  - llama.cpp support: PR #32694 (merge `29b52d398b29`) and PR #32704 (merge `690b87d88151`) are both in v1.1.0 (`gh api .../compare`: ahead, behind_by=0).
  - ARCHITECT chose option C: Qwen ladder only, no Inkling.
- **The END-state rule removed** from the docs, on ARCHITECT's ruling:
  - `HANDOFF-housekeeper-deterministic-loop.md:23`, `:101`.
  - `PLAN-housekeeper-deterministic-loop.md:29`, plus the END-impact row and the "END report" line.
  - `PLAN-llama-cpp-local-model-baseline.md`, the END metric row.
  - Kept: the historical row at `PLAN-llama-cpp-local-model-baseline.md:28`, and the `END state` columns in the CAROLINE report.
- **c. JANITOR → HOUSEKEEPER, full rename.** A search for "janitor" in `~/.carol` (tracked files) gives 0 results.
  - `CAROL.md`: JANITOR is removed entirely: the role block, the clean-up tracker clause, and the "JANITOR checkpoint" paragraph. No HOUSEKEEPER entry is added. The file is 23162 bytes; agy cuts at 24000.
  - Deleted:
    - The Lua core `local/janitor/` (37 files).
    - `pi/extensions/janitor-tools.ts`.
    - `skills/iterative-contract-sop/` and `skills/clean-up-writer/`.
    - The links to these in `~/.claude/skills/`, `~/.pi/agent/skills/`, and `~/.pi/agent/extensions/`.
    - `~/.local/bin/janitor`.
  - Renamed (file names and contents):
    - `agents/housekeeper.md`, `pi/bin/housekeeper`.
    - `HANDOFF-housekeeper-deterministic-loop.md`, `PLAN-housekeeper-deterministic-loop.md`.
    - `PLAN-pi-cli-harness-and-housekeeper-primary-role-integration.md`, `RFC-pi_cli_harness_and_housekeeper_primary_role_integration.md`.
  - The same rename was applied inside `bin/carol`, `install.sh`, `opencode/plugins/carol/source.js:5`, `local/models-preset.ini:3`, `PLAN-llama-cpp-local-model-baseline.md`, and the CAROLINE report (3 lines).
  - HOUSEKEEPER has no tools:
    - `agents/housekeeper.md` keeps only the frontmatter (model `llama.cpp/Qwen3.5-4B-Q4_K_M`, `:5`) and the voice rules.
    - `pi/bin/housekeeper` passes the role file as `--system-prompt`, with `--no-tools`.
    - `pi/extensions/carol-gate.ts` blocks every tool call when `CAROL_ROLE=HOUSEKEEPER`.
  - `~/.local/bin/housekeeper` links to `~/.carol/pi/bin/housekeeper`. MACHINIST made the link by hand, because `install.sh` stops at the download before `setup_path` (Open Question 3).
  - Checks: `bash -n` passes on `pi/bin/housekeeper`, `bin/carol`, and `install.sh`. `claude plugin test .` passes 190/0. The OpenCode suite (`bun test` in `opencode/plugins/carol`) gives 196 pass, 1 skip, 0 fail.
- **agy plugin converted to symlinks only.**
  - `agy/install.sh:16-38` uses `ln -sfn` in place of `cp` and `python3`. Every entry in `~/.gemini/config/plugins/carol/` is a link into `~/.carol/`: `plugin.json`, `hooks.json`, `mcp_config.json`, `agents/`, `hooks/`, `skills/`, and in `rules/`: `AGENTS.md` → `CAROL.md`, `output-styles.md`, `architect.md` → `ARCHITECT.md`.
  - The command skills in `~/.gemini/config/skills/` are links.
  - `agy/hooks/agy-gate.mjs:338` imports `'../../hooks/saw-gate.mjs'`. Node resolves the symlink to the real path, so the old `'./saw-gate.mjs'` would break.
  - `output-styles.md:5` has `trigger: always_on`, added to its Claude Code frontmatter. `ARCHITECT.md:1-3` has a new block, `trigger: always_on`.
  - The stale `~/.carol/agy/rules/` copies are deleted.
  - Checks:
    - `agy plugin validate` passes: "skills 14 · agents 7 · rules 3 · hooks 1 · mcpServers 4".
    - The gate denies `cat x` through the symlinked path with the real payload shape (`toolCall.name`, `args.CommandLine`).
    - ARCHITECT: "agy works."
  - Windows: `~/.config/bootstrap-windows.sh:18` sets `MSYS=winsymlinks:nativestrict`, so `ln -s` makes native links there.
- **Slice 1 facts (verified):**
  - **saw MCP:**
    - One tool, `run`. Its input schema is `{arguments: string[] (minItems 1), directory: string, stdin?: string}`, required `["arguments","directory"]`. It has a `title` ("Run a saw command") and **no description**, so the model learns the verb grammar only from its prompt.
    - Protocol revision `2026-07-28` only. There is no `initialize`: an `initialize` request gets `-32022 Unsupported protocol version`. Each request carries `params._meta["io.modelcontextprotocol/protocolVersion"] = "2026-07-28"` and `params._meta["io.modelcontextprotocol/clientCapabilities"] = {}` (`saw/test/run.lua:7-9`, `:472-483`).
    - Probe command: `printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}}}' | saw --mcp`.
    - Installed: `saw 0.0.1 (c8865a6)`.
  - **ling MCP:**
    - `ling --mcp <manifest>`, protocol revision `2026-07-28` (`ling --help`). Installed: `ling 0.0.1 (def7b81)`.
    - 13 tools (probe run from `~/Documents/Poems/dev/end` with `project-info.md`):
      - Eight need `file`, `line`, `column`: `goToDefinition`, `findReferences`, `hover`, `completion`, `goToImplementation`, `prepareCallHierarchy`, `incomingCalls`, `outgoingCalls`.
      - Four need `file` only: `documentSymbol`, `switchSourceHeader`, `inlayHint`, `diagnostics`. One needs `query`: `workspaceSymbol`.
    - JAM has no `project-info.md`. Projects with a manifest include `end`, `tit`, `cast`, `scout`, `whatdbg`, `saw`, and `ling` under `~/Documents/Poems/dev/`.
  - **saw has no column output:** `saw find --column` gives exit 2, `saw: unknown flag: --column`. ling's position tools need a column. Not verified: where the model gets an exact column (another saw verb, `documentSymbol` ranges, or `workspaceSymbol` locations).
  - **pi MCP client:**
    - pi 1.6.0 speaks only `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05` (`~/.pi/agent/install/releases/1.6.0/node_modules/@earendil-works/pi-mcp/dist/protocol/types.js:1,6`), with an `initialize` handshake (`client.js:129-137`).
    - Test: with `PI_CODING_AGENT_DIR` set to a scratch dir, `pi mcp add saw -- saw --mcp` and `pi mcp add ling --cwd ~/Documents/Poems/dev/end -- ling --mcp project-info.md`, then `pi mcp list` gave "saw: failed … Unsupported protocol version" and "ling: failed … Unsupported protocol version".
    - pi 1.7.0 (npm, modified 2026-11-27T16:58Z) ships `pi-mcp` 1.7.0 with the same version list (`package/dist/protocol/types.js:1,6`, read from `npm pack` in the scratchpad).
    - `~/.pi/agent/mcp.json` does not exist ("No MCP servers configured").
    - A project-local `.pi/mcp.json` is ignored until the project is trusted. `pi --approve` trusts project-local files for one run (`pi --help:58`). `PI_CODING_AGENT_DIR` overrides the config dir (`pi --help:181`).
    - `pi --tools` keeps MCP tools unless an entry starts with `mcp__` (`pi --help:37-38`). `--no-tools` disables built-in and extension tools (`:35`). `--no-mcp` disables MCP (`:45`).
  - **Payload risk:** one saw MCP request returned `30981792` bytes of output (`saw/RFC-exclusive-saw.md:60`). Any HOUSEKEEPER tool path must bound its output to fit 32768 tokens.

### Remaining
1. **ARCHITECT:** decide Open Question 1, the protocol mismatch. Slice 1 cannot finish without it.
2. **MACHINIST:** finish slice 1 after that ruling:
   1. Connect saw and ling to pi in a scratch agent dir: `PI_CODING_AGENT_DIR=<scratch> pi mcp list`. It must show both servers connected, with their tools.
   2. Measure the payload size of each tool in tokens on a real file (END). Compare it with the 32768 window.
   3. Find the column source for ling's position tools.
   4. Read the pi extension API for an `mcp__*` allow-list in `carol-gate.ts`, and for compaction (`session_before_compact`, `turn_end`, as the deleted gate used them).
   5. Report slice 1.
3. **MACHINIST:** slices 2-6 (Context), one at a time, with a report after each.
4. **MACHINIST:** after discovery, write `PLAN-housekeeper-mcp.md` (Decision Gate: ARCHITECT approves). Then delete the stale `PLAN-housekeeper-deterministic-loop.md` and `HANDOFF-housekeeper-deterministic-loop.md`.
5. **ARCHITECT:** check in a new Claude Code session that the CAROL output style still loads with the added `trigger: always_on` key (`output-styles.md:5`).
6. **ARCHITECT:** commit `~/.carol` and `~/Documents/Poems/dev/caroline`. Nothing is committed.
7. **ARCHITECT, on each other machine:** pull `~/.carol`, run `bash ~/.carol/agy/install.sh`, and make the `housekeeper` link, because `install.sh` fails before `setup_path` (Open Question 3).

### Key Decisions
- From session `96495cfe` (2026-11-27): "@HANDOFF-janitor-deterministic-loop.md discuss first. - the agent role should be HOUSEKEEPER. - we should be focus on qwen models, delete gemma - we should wire saw, ling (and probably whatdbg, scout if feasible) as its mcp tools, no more bespoke lua nvim - i was wondering if housekeeper able to handle most of Pathfinder role like exploration, building, profiling, deps/bug tracing since now our tools are carol-enforced"
- From session `96495cfe`: "2. is there smaller qwen available? reliable? could also test, so 2B, 4B, 9B, what is 27B/35B-A3B? 3. B. my point is local model is free, it can deterministically read for exploration, writing excerpt for counselor, probably slower, but our in house tools is designed to be very little to zero error, is the model holds? 4. what reasoning need better judgement for finding code path? whatdbg stack trace? profiling? isnt all DETERMINISTIC? any how why assume, that's the point, we want to test. the point is testing and harnessing its maximum capability. nothing decided yet"
- From session `96495cfe`: "get 0.8B and 2B and put them on benchmark. why CODING.md have anything to do with mcp at all?"
- From session `96495cfe`: "rebuild the harness first. this is exactly what i'm trying to say from the start of the session. harness all local model to always using saw with mcp. for everything (sed, awk, grep, rg, jq)."
- "abc first"
- "before you do any benchmark, i also curious whether there's inkling model small enough could run in this machine with our setup we could put in bench"
- "C" (upgrade brew llama.cpp to 1.1.0 for the Qwen ladder only; leave Inkling out)
- "there's no issue with END anymore, it's already been fixed. should not be raised as issue anymore, ever"
- "why the half-assed rename? what the fuck is wrong with no more janitor, now it's HOUSEKEEPER? CAROL.md? why even HOUSEKEEPER on CAROL.md yet? we havent even finished researching, still on development, local only, nothing decided. no more lua, pure cli mcp enforcement"
- "agy/rules/AGENTS.md ??? why copy? i thought it was supposed to be symlinks ONLY. - symlinks for CAROL.md for global - symlinks for CLAUDE.md for project specific"
- "B." (convert the agy plugin to symlinks)
- "why you broke anything? why not using saw mcp with dry run? why keep ignoring the protocol?"
- "why always run bash? use MCP MOTHERFUCKER"
- "if symlinks wont work, then create copy. but the copy is SSOT global, NEVER copied into project."
- "agy works. let's continue with housekeeper, where are we"
- "discovery THOROUGHLY. - the most important wiring for housekeeper is saw and ling first. - ensure the iterative build could deterministically make Housekeeper answer the right question. know its scope, could response accurately with constraints of the tools, within this machine limit and its context window, plausibly with its iterative loop to synthesize? if you read the history, we actually sucessfully use qwen to to basic code refactor limited to syntatic in adherence to coding standards, without any heavy reasoning, without any logical, structural, nor runtime behavior changes. with lua, qwen passed all green, can operate deterministically, if it found any CODING.md violations but beyond syntactic, it only report, at least that's how our previous test documented. with saw and ling, theoritically the result should be identical. but i would like to to test it further to even more deterministic tasks. such as: [1] building project, with cast, this always simply calls `cast spell <args>`, return excerpt whatever the result, including error. only build and report, so this probably could be wired into specific SKILL: spellcaster? [2] profiling with scout, identical to building, but there more intricate steps, flags, similar manifest with profile-info.md, etc. COUNSELOR still need to drive and direct. Housekeeper job only to build and report. this must be really careful, building could take lots of resources, hence we probably must use the smallest model as possible. the skill already exists. only need to put pieces together [3] bug tracing with whatdbg, its job only to run and report whatever breakpoint hit, wherever COUNSELOR need to trace. [4] path tracing, read and report dependencies, facts only not opinion. probably similar to [3] but from static analysis. Static analysis is still COUNSELOR responsibility to synthesize. but Housekeeper can gather all the facts, the flow, the dependencies, the timing, all the facts with the help of saw and ling, if the context are too much for smaller models, we can do it with iterative loop (compaction/handoff we window context) until we get ONE FILE of REPORT for COUNSELOR to read. alternatively each skill-task paired above could formalise into each dedicated local model role, probably something like: Builder, Profiler, Bugtracer, Analyzer, whatever. anywhow, this must done very carefully, very slowly, incrementally, until we get all the facts, what actually tasks and role actually FEASIBLE to delegate to local model considering all the constraints, including my limited hardware resource."

### Files Modified
- `CAROL.md` — JANITOR removed (role block, clean-up tracker clause, JANITOR checkpoint).
- `ARCHITECT.md` — `trigger: always_on` frontmatter (`:1-3`).
- `output-styles.md` — `trigger: always_on` added (`:5`).
- `agents/housekeeper.md` — new (was `agents/janitor.md`). Model and voice rules only, no `tools:` line.
- `pi/bin/housekeeper` — new (was `pi/bin/janitor`). Role file as the system prompt, `--no-tools`, no SOP assembly.
- `pi/extensions/carol-gate.ts` — blocks every tool call for HOUSEKEEPER. The Lua tracker handoff and the 4-tool allow-list are removed.
- `pi/HARNESS.md` — rewritten for HOUSEKEEPER with no tools.
- `pi/extensions/janitor-tools.ts` — deleted.
- `local/janitor/` — deleted (37 files). It was tracked, so `git status` shows it as deleted.
- `skills/iterative-contract-sop/`, `skills/clean-up-writer/` — deleted.
- `local/models-preset.ini` — Gemma sections removed, 0.8B and 2B added, comment renamed.
- `local/models/gemma-4-E2B-it-Q4_K_M.gguf`, `gemma-4-E4B-it-Q4_K_M.gguf` — deleted.
- `bin/carol` — `:172-176`, `:194` renamed to housekeeper.
- `install.sh` — `:120`, `:126-127` renamed to housekeeper.
- `opencode/plugins/carol/source.js` — `:5` `PI_ONLY_AGENT = 'housekeeper'`.
- `agy/install.sh` — `:16-38` symlinks in place of copies.
- `agy/hooks/agy-gate.mjs` — `:338` import path.
- `agy/rules/` — stale copies deleted (gitignored).
- `HANDOFF-housekeeper-deterministic-loop.md`, `PLAN-housekeeper-deterministic-loop.md`, `PLAN-pi-cli-harness-and-housekeeper-primary-role-integration.md`, `RFC-pi_cli_harness_and_housekeeper_primary_role_integration.md` — renamed from the janitor names, contents renamed. END rule removed from the first two.
- `PLAN-llama-cpp-local-model-baseline.md` — 29 renames, END metric row removed.
- `HANDOFF-housekeeper.md` — this file.
- `~/Documents/Poems/dev/caroline/MACHINIST-REPORT-local-model-benchmark.md` — 1.1.0 throughput section (`:33-42`), 3 renames.
- Machine-local: brew llama.cpp 1.1.0; `~/.local/bin/housekeeper` link; the link removals listed in Completed; `~/.gemini/config/plugins/carol/` rebuilt as links.
- Scratchpad (`/private/tmp/claude-501/-Users-jreng--carol/bcb55fb6-2880-4a51-a23b-b495daecc2cb/scratchpad/`; a reboot can delete it):
  - `pi-agent/mcp.json` — the scratch pi config with saw and ling.
  - `pi-mcp/.pi/mcp.json` — an untrusted project config, unused.
  - `pi-mcp-170/` — the `npm pack` of `@earendil-works/pi-mcp@1.7.0`, read only.

### Open Questions
1. **Protocol mismatch between pi and saw/ling. The decider is ARCHITECT.** pi's client speaks up to `2025-11-25` with `initialize`. saw and ling speak only `2026-07-28`, stateless. Candidates, each with its source:
   - saw and ling also answer revision `2025-11-25` (an `initialize` handshake). This is work in the saw and ling repos (COUNSELOR).
   - A pi extension registers tools that run the saw and ling CLIs, like the deleted `janitor-tools.ts` did with `pi.exec`. ARCHITECT's ruling says "pure cli mcp enforcement", so this may conflict with it.
   - Wait for a pi release whose `pi-mcp` supports `2026-07-28`. 1.7.0 does not.
2. **The column source for ling's position tools. The decider is MACHINIST, by reads.** saw has no `--column`. Read whether `documentSymbol`/`workspaceSymbol` ranges give the column, or whether ling accepts the start of the symbol on a line.
3. **`install.sh` download failure. The decider is ARCHITECT.** `install.sh:103` fails with a 404 on `carolcode-arm64.zip` from `https://github.com/jrengmusic/carol/releases/latest/download`. The script stops before `setup_path`, so `install.sh` does not link `housekeeper` on any machine. This existed before this session.
4. **One role with skills, or dedicated roles. The decider is ARCHITECT, after discovery.** For example Builder, Profiler, Bugtracer, Analyzer.

### Next Steps
- Pick up at Open Question 1. The trigger is ARCHITECT's ruling on the protocol mismatch. Then finish slice 1 (Remaining 2), and report.
- Process rules for MACHINIST in this work, from ARCHITECT's rulings this session:
  - Every file read and edit goes through saw MCP, one edit at a time: dry run, read the diff, then apply with `--expect`.
  - Bash only for commands that are not file work (`pi`, `llama-bench`, `agy plugin validate`, `claude plugin test .`), and for reads only as a pipe.
  - Never use an `--apply` command as a probe.
  - Report after each slice. Never raise END's state.
