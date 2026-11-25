## Handoff to MACHINIST: Enforce saw-only file work in CAROL, after saw is fixed

**From:** MACHINIST, updated by COUNSELOR
**Date:** 2026-11-24, updated 2026-11-25
**Status:** Blocked

The work is blocked until ARCHITECT says that saw is fixed. The blocker is ARCHITECT's ruling in Key Decisions. The whatdbg item (Remaining 12) does not wait for saw.

### Update from COUNSELOR, 2026-11-25
- ARCHITECT: *"REPORT FROM MACHINIST ~/.carol/HANDOFF-saw-enforcement.md FIX THE DEFECTS. UPDATE THE HANDOFF"*.
- **R7 fixed.** `saw find -r` accepts inline flags (`(?i)`, `(?m)`, `(?s)`, `(?i-s)`), POSIX classes (`[[:digit:]]`, `[[:^digit:]]`) and `\A`. Runtime check on the built binary: `(?i)alpha`, `[[:digit:]]+`, `\Abeta` and `(?m)^beta` match, exit 0. `(?x)` stays invalid. Seven runner cases (`find-regex-inline-flag` to `find-regex-flag-quantified`). SPEC §4.8 states the forms.
- **Deny-delete text fixed.** A file whose access list denies its deletion gives `saw: write failed for <path>: overwrite failed; rolled back`, exit 2. The file keeps its bytes, and no file stays in `blobs` or `pending`. Runner case `write-deny-delete`. SPEC §6.3 Plan phase states it.
- **D7 (rollback failure):** not forced. Case `write-rollback` covers a rollback that succeeds.
- **One binary.** `saw --mcp` serves the commands, in the form of scout, ling and whatdbg. `saw_ToolServer` is deleted from the repo and from `~/.local/bin`. The entry for a client is `"saw": { "command": "saw", "args": ["--mcp"] }`. It has one tool, `run`.
- **Checks on the built binary:** `otool -L` shows `libc++` and `libSystem` only. `server/discover`, `tools/list` and `tools/call` answer, and the process ends at end of input. The runner passes 184 of 184 cases on the CLI lane and on the `mcp` lane.
- **Last build:** sha256 of `~/.local/bin/saw` is `2d2f7c93c8da340adb990810e4030d0ecd37ca5c27137208849497d13ecf0967` (build 17, 0 warnings). The runner result above is of this build. `otool -L` and the MCP start checks were run on an earlier build. They were not run again on build 17. After build 17, only comments and one `jassert` (no Release code) changed.
- **Speed, scout, µs.** Each group is one run, so compare only inside a row. Build 14 rows ran at load 3.0 to 5.5, build 16 rows at load 3 to 4, and build 17 rows at load 3 to 4.

| Row | saw process | saw `--mcp` | Reference | Result |
|---|---:|---:|---|---|
| `find` literal 1K (build 14) | 2472 | 57 | `grep` 1876 | `--mcp` is faster, one process is slower |
| `find` literal 1M (build 14) | 2694 | 185 | `rg` 3671 | saw is faster |
| `find` literal 100M (build 14) | 15041 | 10062 | `rg` 23967 | saw is faster |
| `find` digits 100M (build 14) | 21583 | 23079 | `rg` 80883 | saw is faster |
| `lines` 1K (build 14) | 2523 | 56 | `sed` 1805 | `--mcp` is faster, one process is slower |
| `lines` 100M (build 16) | 44783 | 39485 | `sed` 232512 | saw is faster |
| `lines 1:20` 100M (build 16) | 2603 | 136 | `sed` 1787 | `--mcp` is faster, one process is slower |
| `fields` 100M (build 16) | 119336 | 300299 | `awk` 2210370 | saw is faster |
| `replace` preview 100M (build 16) | 119480 | 124353 | `sed` 477447 | saw is faster |
| `find` literal, tree (build 17) | 26227 | not timed | `rg` 28897 | saw is faster |
| `find` digits, tree (build 17) | 30329 | not timed (build 14: 34262) | `rg` 36432 | saw is faster |
| `find --files`, tree (build 17) | 7073 | not timed | `rg` 10575 | saw is faster |
| `find` literal, tree with JUCE's `.gitignore` (build 17) | 27703 | not timed | `rg` 31659 | saw is faster |
| `find --files`, tree with JUCE's `.gitignore` (build 17) | 7689 | not timed | `rg` 11305 | saw is faster |

- **What still loses:** one saw process for one small file or for an early stop. In the timed runs these are `find`, `lines`, `fields`, `replace` at 1K, and `lines 1:20` and `fields --lines 1:20` at every size, against `grep`, `sed` and `awk`, by 0.6 to 0.8 ms. Measured on build 12: `sed` 1K 1.59 and 1.63 ms, an empty program of ours 1.77 and 1.82 ms, `saw lines` 1K 2.27 and 2.29 ms. The full set of rows was last timed on build 9; its other losing rows from 10K to 100K and `replace --apply` from 1K to 100K were not timed again. Work on the start cost continues (`saw/PLAN-native-mcp.md` Step 17).
- **For the enforcement decision:** an agent that calls saw through `--mcp` pays the start cost one time for each session. A shell call of `saw` pays it on each call.
- **Data safety in this sprint:** `replace -r` with an empty match does not split a UTF-8 character. A short write to a new file is a failure (the size is compared with the stream position). A POSIX class in a `.gitignore` pattern works. A file that git ignores is not listed, also when `.ignore` of ripgrep includes it.
- **Not final:** nothing is committed, so `saw --version` still shows `6c110e2`. The sprint is logged as Sprint 3 in `saw/carol/SPRINT-LOG.md`.
- **JAM changed too.** `jam::Document` offsets are `size_t`, `jam::JsonWriter` writes to a stream, and `jam::ModelContextServer` writes the reply into its ring. A message larger than the 1 MB input ring gives an InvalidRequest reply and closes the server. `scout`, `ling`, `whatdbg`, `cast` and the other JAM projects are adapted by reading and are NOT rebuilt. Each one needs its build before its next release. The `ling` MCP server did not connect in this session.

### Read First
- `~/Documents/Poems/dev/saw/RFC-live-to-premise.md` — the plan for the saw fixes and the evidence behind it. It holds the defect IDs (D, R, S, L, N, T), the reproduction commands (Scaffold), and 17 open questions. This entry cites it as "RFC".
- `~/Documents/Poems/dev/saw/SPEC.md:728-744` (§7, CAROL Integration Contract) — the four CAROL wiring steps that SPEC assigns to ARCHITECT's later pass. `SPEC.md:26-53` holds ARCHITECT's locked rulings.
- `~/.carol/hooks/register.js:25-27` and `:132-139` — the current gates: `IN_PLACE_PATTERN`, `TEXT_SEARCH_PATTERN`, `getBashVerdict`.
- `~/.carol/CAROL.md:323-343` — Destructive-Edit Discipline and the `carol apply` hook text.

### Context
ARCHITECT asked whether CAROL can forbid `sed`, `awk`, `grep`, `rg`, custom python batch edits, and any edit that does not use `saw`. The premise was that saw is the fastest, the most reliable and the safest way to find and edit a file. ARCHITECT told MACHINIST to verify first.

MACHINIST measured and tested saw. The premise fails in part. Speed fails on one small file, on regex with no required literal, and against python on a tree replace. Reliability fails: one unreadable file ends a tree search, and a search with no path reports no match. Safety fails: a write breaks hard links, changes file modes, drops extended attributes, changes untouched line endings, and loses undo history under parallel applies. The RFC holds every finding with its evidence.

ARCHITECT ruled that saw is fixed first. Enforcement follows. MACHINIST wrote the RFC with the solution for the saw repo. COUNSELOR owns saw source (machinist.md Surface), so the saw fix is COUNSELOR's. This entry freezes what MACHINIST needs when the fix is done.

### Completed
- Hook state read. The three gates exist as copies: `~/.carol/hooks/register.js:25` and `:27`, `~/.carol/agy/hooks/agy-gate.mjs:25` and `:27`, `~/.carol/opencode/plugins/carol/gate.js:18` and `:20`. They deny `sed -i`, `perl -i`, `awk -i inplace`, and a text search on C++ files. `~/.carol/bin/carol:929-1032` holds `cmd_apply`. `~/.carol/local/janitor/fix.lua:186` calls `carol apply`. `~/.config/claude/settings.json:37` holds the `ask` list. It has git entries only.
- Hook behavior seen in this session: the in-place gate denied a Bash script that held `sed -i` as text. The text-search gate denied an `rg` call on a binary dump because the same command named `.cpp` files. Both match command text, not intent.
- saw verified. Evidence is in the RFC sections: Research Summary S1 to S6, D1 to D8, R1 to R9, L1 to L11, N1 to N8, T. The functional suite passed 91/91 (`nvim --headless -l test/run.lua ~/.local/bin/saw`, exit 0).
- Four scout batches ran, one run at a time, by Pathfinder. 11 epochs for each manifest.
- Probes ran: startup split by empty C programs and a relinked saw; a metadata-preserving write with `copyfile` and `rename` (scaffold in the RFC); `mkdir` race with 64 processes (one winner); 1,000, 2,000 and 4,000 line undo preview memory.
- RFC written: `~/Documents/Poems/dev/saw/RFC-live-to-premise.md`. Status `Ready for COUNSELOR handoff`.
- The saw undo cache is intact. The session copied it first, restored it three times, and `diff -rq` reported no difference each time. The cache then took 7 new entries (`20261123T192927-0b29d2` to `0b29d8`). They come from the RFC corrections that saw applied to `RFC-live-to-premise.md`. They are valid undo entries. The cache holds 29 transactions of 32.
- Nothing in `~/.carol` or `~/.config` changed. `git status --short` in `~/.carol` printed nothing at the end of the session.

### Remaining
1. **ARCHITECT:** settle the 17 open questions of the RFC. Each one names its decider. Questions 1, 3, 4, 5, 6, 9, 10, 16 and 17 change SPEC rulings or message texts.
2. **COUNSELOR:** implement the RFC phases 1 to 5 in the saw repo. Phase 1 is safety and starts first. Question 8 (`jam_core` split) and question 9 (matcher) change JAM. They need ARCHITECT's ruling first.
3. **Verify saw is fixed** (MACHINIST, before any enforcement edit). Run each command, and read the output:
   - `saw --version` shows a commit that is not `7a7039f`.
   - `nvim --headless -l test/run.lua ~/.local/bin/saw` in the saw repo exits 0, and `test/cases.md` holds a case for each of D1 to D8 and R1 to R6.
   - The reproduction commands in the RFC Scaffold give the corrected result. Copy the undo cache first: `cp -Rp "$HOME/Library/Application Support/saw/undo" <folder>`. R9 explains why.
   - `ln h h2; saw replace alpha X h --apply --expect 1; cat h2` shows the same bytes in both names, or saw refuses (RFC question 1).
   - `stat -f '%l' ~/.carol/MANIFESTO.md ~/.carol/CODING.md` is not an input to any edit until D1 is fixed. Both files have 24 links (observed).
4. **Re-run the benchmark** that the RFC Phase 3 item 8 adds. The scout manifests of this session were in the session scratchpad. They are not kept. The RFC lists the pairs. Run one manifest at a time (`~/.carol/skills/profile/SKILL.md`, Lanes rule 1). Pathfinder runs scout.
5. **MACHINIST: present the enforcement diagnosis** and wait for ARCHITECT's approval (machinist.md, execution gate). Include the choice in Open Questions below.
6. **MACHINIST: edit the three gates** (SPEC §7 names two of them) and `hooks/tests/cases.ts`. Run the hook tests. The command that runs them is not recorded here. Read `hooks/tests/gate.test.ts` and the plugin type file `hooks/types/index.d.ts`. Name the command in the diagnosis, from that read.
7. **MACHINIST: update the CAROL text** that states the rule: `CAROL.md:323-343`, `agents/engineer.md:59-61`, `agy/rules/AGENTS.md:323-343`, and the hook text. SPEC §7 step 3: `bin/carol` `cmd_apply` and the internal `sed` and `awk` calls move to saw. SPEC §7 step 4: `fix.lua:186` calls `saw patch --apply --expect N`.
8. **MACHINIST: cross-platform check** before any `~/.config` edit: read `~/.config/bootstrap-macos.sh` and `~/.config/bootstrap-windows.sh`. `~/.config/claude/settings.json` is shared by four machines (ARCHITECT.md). RFC N8: no Windows saw was found, and no Windows claim was run.
9. **Not run in this session** (an open check, not a finding): whether `permissions.ask` prompts under `defaultMode: bypassPermissions`. Test: add `Bash(python3*)` to `ask` in a scratch copy of the settings, start a session with it, and run `python3 -c 1`. Observe a prompt or no prompt.
10. **Not run in this session:** D7 (rollback failure), the split of the 1.87 ms image load, the walk-balance hypothesis (RFC Phase 3 item 7), the effect of `ReplaceFile` on Windows.
11. `~/Documents/Poems/dev/saw/CLAUDE.md` is corrected (COUNSELOR).
12. **MACHINIST: make the whatdbg MCP tools load on demand**, as every other CLI `--mcp`. ARCHITECT: *"update machinist saw enforcement handoff to also set whatdbg to be lazy load just like all other cli --mcp"*. The change is in the config, not in whatdbg:
    - Fact: Claude Code documentation, "Configure tool search" (https://code.claude.com/docs/en/mcp#configure-tool-search): *"If you deny `ToolSearch` or leave it out of `--tools`, MCP tools load upfront instead"*. The installed client (2.1.331) tests the same: without `ToolSearch` in the tool list of the request it logs *"Tool search disabled: ToolSearchTool is not available"* and loads every MCP tool.
    - Fact: `~/.config/claude/settings.json:8` sets `ENABLE_TOOL_SEARCH` to `"true"`, so the setting is already on.
    - Fact: `agents/counselor.md:6` grants `mcp__ling__*` and `mcp__whatdbg__*` and does not grant `ToolSearch`. In a COUNSELOR session all 18 whatdbg tools are in context from the start. `agents/pathfinder.md:7` grants `mcp__ling__*`, `mcp__whatdbg__*` and `mcp__scout__*` without `ToolSearch`.
    - Fact: whatdbg sends no loading flag (`whatdbg/Source/ToolServer.*` and `tools.json` hold no `alwaysLoad` and no `_meta`), so whatdbg needs no change.
    - Work: add `ToolSearch` to the `tools:` line of each role that has an `mcp__…__*` grant. Read every definition in `agents/` for such a grant. Then start a COUNSELOR session and verify that no whatdbg schema is in context before the first use, and that a whatdbg call works after a search.
    - Not stated in any source that was read: whether a subagent with an explicit `tools:` list follows the same rule. Verify it with a Pathfinder run.
    - When saw gets its grant (`mcp__saw__*`), the same line holds `ToolSearch`.

### Key Decisions
- ARCHITECT, on the first request: *"either way, verify first. saw is the fastest is the sprint benchmark"*
- ARCHITECT: *"we should fix saw first, so it live to its premise. then we could enforce the protocol."*
- ARCHITECT: *"write comprehensive RFC with solution to saw repo"*
- ARCHITECT: *"we continue when saw fixed"*

ARCHITECT ruled on no RFC open question and on no enforcement option.

### Files Modified
- `~/Documents/Poems/dev/saw/RFC-live-to-premise.md` — new. The RFC. Untracked.
- `~/.carol/HANDOFF-saw-enforcement.md` — new. This entry. ARCHITECT ruled that the handoff lives in `~/.carol`, the working directory of this session.
- `~/Documents/Poems/dev/saw/CMakeLists.txt` was modified before this session (line 134, a comment in the `juce-plugin-window-focus-hook.patch` row). It is not a change of this session. It sits in the saw repo, where the RFC is.
- Outside the repos: the saw undo cache took 7 entries (see Completed). Session scratch files (bench corpus, manifests, probes, reports, cache copies) are in `/private/tmp/claude-501/-Users-jreng--carol/737444ee-21ac-4436-a828-d86d4ea86fc6/scratchpad/`. The system can clear them.

### Open Questions
- The 17 questions of the RFC. Decider: ARCHITECT.
- How does enforcement treat the `Edit` tool? MACHINIST gave three options in chat, and ARCHITECT did not answer. The options are:
  - A. Block scripted edits only (`sed`, `awk`, `perl`, `python`), and leave `Edit` alone.
  - B. Require saw for every role that has Bash, and keep `Edit` for COUNSELOR.
  - C. Require saw for every role, and give COUNSELOR Bash that the hook limits to `saw`.
  MACHINIST's evidence: CAROL.md names scripted edits as the threat (`CAROL.md:323-343`). `agents/counselor.md:6` lists no Bash. saw cannot create a file (RFC N1). Decider: ARCHITECT. The enforcement list in the earlier chat (deny `sed`, `awk`, `perl`, file `grep` and `rg`; ask for `python` and `lua`; deny `saw find` with no path) is MACHINIST's proposal. It is not a decision.
- Which `grep` and `rg` calls stay allowed (pipe filters, flags that saw lacks)? It depends on the RFC questions 11 and 12. Decider: ARCHITECT.
- Does enforcement wait for the Windows build (RFC question 14)? Decider: ARCHITECT.

### Next Steps
- Trigger: ARCHITECT says that saw is fixed.
- MACHINIST then runs Remaining item 3 (verify), reads the RFC and the hook files again, and presents the enforcement diagnosis. Remaining items 5 to 8 follow, each after ARCHITECT's approval.
- Until the trigger, MACHINIST does not edit a gate, `settings.json`, `bin/carol`, or `fix.lua`. Until D1 is fixed, nobody edits a hard-linked `~/.carol` document with saw.
