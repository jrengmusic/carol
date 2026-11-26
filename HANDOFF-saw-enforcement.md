## Handoff to MACHINIST: Complete saw enforcement after saw ships `json`, `page` and `write`

**From:** MACHINIST
**Date:** 2026-11-25
**Status:** Blocked

The current enforcement is complete for the verbs that saw has today. The rest waits for the saw work in `RFC-one-tool.md`. A saw update does not complete the enforcement by itself (Remaining, part B).

### Read First
1. `~/Documents/Poems/dev/saw/RFC-one-tool.md` — the plan. R1 (defects D1 to D14), R10 (enforcement), the decision table, Order of work, Acceptance, Handoff Notes. This entry cites it as "RFC".
2. `~/.carol/hooks/saw-gate.mjs` — the one gate of the three harnesses.
3. `~/.carol/CAROL.md:321-361` — Destructive-Edit Discipline.
4. `~/.carol/opencode/HARNESS.md` — the OpenCode names of each tool.

### Context
ARCHITECT wants one tool for file work: saw replaces sed, awk, grep, rg, jq, cat, bat and the Write tool. MACHINIST verified saw build `2f1baaa`, then enforced saw in Claude Code, agy and OpenCode. MACHINIST then wrote `RFC-one-tool.md` for the missing parts. COUNSELOR owns the saw and JAM source. This entry holds the enforcement state and the work that starts when saw is updated.

### Completed

**Current state, by harness**

| Rule | Claude Code | agy 1.5.17 | OpenCode 2.2.5 |
|---|---|---|---|
| saw MCP | `claude mcp list`: connected | `agy/mcp_config.json` | `opencode/opencode.jsonc`, `protocol` `2026-07-28` |
| MCP loads on demand | `ToolSearch` in each definition with an MCP grant | lazy by default | listed directly, one tool `saw_run` |
| `sed`, `awk`, in-place `perl` denied in every session | yes | yes | yes |
| `grep`, `rg`, `python`, `perl`, `lua`, `ruby`, `node`, `bash -c` denied in a subagent | yes | yes | yes |
| A shell function denies the positions that a pattern cannot read | yes | yes, not on Windows | yes, not on Windows |
| Redirect or `tee` into a project file denied in a subagent | yes | yes | yes |
| `saw --apply` only for Engineer, and Pathfinder in a doxygen task | yes | yes | yes |
| A write tool over an existing file denied in a subagent | yes | yes | yes |
| Edit tool denied in every session | `register.js` hook, no grant in `agents/counselor.md`, `machinist.md`, `oracle.md`, and a `deny` row in `~/.config/claude/settings.json` that removes the tool. Live: the hook denied it in a fresh session; with the row, Edit is not in the tool list, and Write and a redirect work | `edit_file` denied, no grant. Run on the installed gate | `edit` and `patch` denied and removed from the tool list. Live |
| Native grep in a subagent | no such grant (`Grep` left the four definitions on 2026-11-25, after a search found 5 subagent transcripts that used it) | no such grant | removed from the tool list and denied |
| Pathfinder report with a changed or missing excerpt goes back once | `SubagentStop` | `send_message` denial | `execute.after`, foreground only |
| COUNSELOR has saw and no shell | yes | yes | yes |
| `python`, `lua` ask ARCHITECT in a main session | settings `ask` | `force_ask` | `ask` rules from `cast/common.md` |

**Evidence**
- Claude Code: `cd ~/.carol && claude plugin test .` gives 171 pass, 2 fail. The 2 failures are `nudge absent on 4th prompt, read directive present` and `read directive present on 1st prompt for ORACLE`. They existed before this work: the read directive is added on each 5th prompt only (`hooks/register.js:197`).
- OpenCode: `cd ~/.carol/opencode/plugins/carol && bun test` gives 176 pass and the same 2 failures.
- OpenCode live, with the real plugin and a fake model: the MCP connection; the report that went back and came back verbatim; Engineer denials of `grep`, a hidden `rg`, `python3`, native edit and overwrite; a new file and `saw --apply` allowed; COUNSELOR with no shell; the contract-read gate. `legacy` failed and `2026-07-28` connected on the same server.
- agy: `cmp` shows that `~/.gemini/config/plugins/carol/hooks/saw-gate.mjs` equals `hooks/saw-gate.mjs` after `bash agy/install.sh`.
- `perl -0pi` passed the gate and is now denied (`hooks/saw-gate.mjs`, `PERL_IN_PLACE_PATTERN`; case `perl -0pi denied`).
- The OpenCode plugin was ignored by the `.gitignore` line `carol/`, and no commit held it. `!/opencode/plugins/carol/` fixes it. `git status --short` now shows `?? opencode/plugins/`.
- `carol apply` is removed from `bin/carol`. `local/janitor/fix.lua` uses `saw patch` and `saw undo`.
- `RFC-one-tool.md` is written, 0 open questions, untracked in the saw repo.

**What a saw update completes by itself** (read from the code)
- New verbs reach every agent. The MCP tool `run` takes any verb (`SPEC.md` §5.8), and each grant is `mcp__saw__*` (Claude Code) or `saw_*` (OpenCode, `source.js` `MCP_ENTRY_PATTERN`).
- `saw write --apply` and any later `--apply` verb obey the same agent rule: `SAW_APPLY_PATTERN` and `getRunDenial` test `--apply`, not the verb (`hooks/saw-gate.mjs`).

**What a saw update does not complete**
- No hook denies `jq`, `cat`, `bat`, `head`, `tail`, `cut`, `perl -n`, `python -c` in a pipe, or the Write tool for a new file.
- The denial text (`SAW_USE`, `hooks/saw-gate.mjs:38`) names no `json`, `page` or `write` call, and no MCP call.
- The CAROL documents state that saw does not create a file (`CAROL.md:346`).

### Remaining

**A. Before the saw update** (no dependency on saw)
1. **ARCHITECT:** rotate the MiniMax key. It is in the transcript of session `956a3a4e-98b0-42b4-99a9-7ad7db60537f`.
2. **ARCHITECT:** commit `~/.carol`, `~/.config` (`claude/settings.json`) and `saw/RFC-one-tool.md`.
3. **ARCHITECT, on each other machine:** pull `~/.carol` and `~/.config`; install saw; `claude mcp add -s user saw -- saw --mcp`; `bash ~/.carol/agy/install.sh`; run `nvim --headless -l test/run.lua ~/.local/bin/saw` in the saw repo on the CLI lane and on the `mcp` lane.
4. **MACHINIST, checks not run:**
   - Claude Code live: a subagent Write over an existing file is denied; a paraphrased Pathfinder report goes back. A running session keeps the old hooks: start a new session.
   - agy live: `force_ask` under skip-permissions.
   - OpenCode with a real model, and OpenCode on Windows. `opencode mcp list` must show `✓ saw connected`.
   - The shell function on Windows: agy and OpenCode skip it there. The docs do not name the shell of their commands.

**B. After the saw update** (trigger in Next Steps). Each item starts only when saw passes the named RFC part. RFC R10: a denial before saw does all the work of a tool leaves the agent with no way.
1. **MACHINIST, verify saw first:**
   - `saw --version` shows a commit that is not `2f1baaa`.
   - The suite exits 0 on both lanes: `nvim --headless -l test/run.lua ~/.local/bin/saw`.
   - Each command of RFC Scaffold, *Reproduction of the defects*, gives the witness result. Each row of the R10 path table gives the stated result.
   - The benchmark gate of RFC Acceptance, by Pathfinder with scout.
2. **MACHINIST, gate table** (RFC decision *"The hook denial is one line for each denied tool"*): replace the one `SAW_USE` text in `hooks/saw-gate.mjs` by a table. One row for each denied tool: the CLI call and the `mcp__saw__run` call. `agy` and OpenCode read the same table. OpenCode names the tool `saw_run`.
3. **MACHINIST, new denials, in this order. Each one applies to the whole session: the main session and every subagent** (Key Decisions, *"WHOLE session"*):

| Denial | Start after |
|---|---|
| `grep`, `rg` in a main session (a subagent has this denial today) | saw passes D3 to D7, D13 and D14 |
| `jq` | `saw json` passes J1 to J13 |
| `cat`, `bat`, `head`, `tail` | `saw page` passes P1 to P5, and D14 (`-a`) |
| The Write tool, `>` and `tee` into a file | `saw write` passes W, with undo |
| `perl -n`, `perl -p`, `python -c`, `node -e`, `cut` | `saw json` passes J1 to J13 |

   Today `getShellDenial` (`hooks/saw-gate.mjs:98`) reads `SESSION_TOOLS` for a main session and `SUBAGENT_TOOLS` for a subagent. Move each tool above to `SESSION_TOOLS` at its start point. `getGuardedCommand` reads the same lists.

4. **MACHINIST, tests:** add the cases to `hooks/tests/cases.ts`. Each denial gets one test that reads the named call from the text, runs it, and gets the result of the denied call (RFC Acceptance). Run `claude plugin test .`, `bun test` in `opencode/plugins/carol`, then the live checks of part A item 4.
5. **MACHINIST, documents:** `CAROL.md:321-347` (the table, the steps, and the sentence *"saw does not create a file: use the Write tool"*), `CAROL.md:353`, `agents/engineer.md:76`, `agy/agents/engineer.md:81`, the saw introduction in each agent definition of `agents/` and `agy/agents/`, `opencode/HARNESS.md`, and the Write tool lines of `skills/changelog-writer/SKILL.md:73`, `skills/readme-writer/SKILL.md:70`, `skills/synthesis-writer/SKILL.md:81`.
6. **MACHINIST, OpenCode:** remove `write` from the tool list of every session (`SAW_ONLY_TOOLS`, `opencode/plugins/carol/gate.js`) when `saw write` is in use.
7. **MACHINIST, machine scripts:** `bin/carol-statusline.sh:20,88` and `agy/bin/agy-statusline.sh:123` from jq to `saw json`; `~/.config/zsh/fzf-end.sh:37` from bat to `saw page`; `~/.config/bootstrap-macos.sh:90,93,118,121` and `~/.config/bootstrap-windows.sh:305,314` remove `bat` and `jq`. Read both bootstrap scripts first (machinist.md, Cross-Platform Consistency).
8. **MACHINIST:** reinstall agy with `bash ~/.carol/agy/install.sh`.

### Key Decisions
- *"we should fix saw first, so it live to its premise. then we could enforce the protocol."*
- *"can we prevent any subagent to use sed, awk, grep, rg, or python for file manipulation? must always use saw."*
- *"so Pathfinder should just return verbatim without any additional instruction which previously sometimes being ignored"*
- *"please also read other harness ddocs thoroughly, because you must also wire the exact mechanism to agy and opencode"*
- *"defer opencode, execute agy and claude code. go"*, then *"implement opencode now then."*
- *"why always ask permuission with python? why use python? cant use saw?"*, *"why do you still need jq?"*, *"why still using perl?"*
- *"write comprehensive RFC to saw repo, to add jq full parity feature to saw, so we can entirely replace sed, awk, grep, rg, jq with single deterministic tools: SAW."*
- *"reminder we never vendor, never copy, never byte-to-byte translate, always CLEAN ROOM rewrite from scratch BLESSED translation into our domain"*
- *"SPEC is not the law, it could be stale, empirical findings is the ground of truth"*
- *"so RFC should leave no room for open questions, assumptions nor inference"*
- *"i will ensure saw installed on each machine."*
- MACHINIST asked: *"does the Edit tool stay for main sessions?"*, option A *"Deny Edit in every session."* ARCHITECT: *"A"*.
- MACHINIST asked: *"Do the new denials also apply to main sessions, or only to subagents? Today a main session can still run `grep`, `rg`, `cat`, `jq` and `perl -n`."* ARCHITECT: *"WHOLE session"*. The new denials of that question hold Write, so the ruling covers the Write tool in a main session.

### Files Modified
- `hooks/saw-gate.mjs` — new. The shared gate.
- `hooks/register.js`, `hooks/types/index.d.ts` — Claude Code hooks on the shared gate.
- `hooks/tests/cases.ts`, `hooks/tests/gate.test.ts`, `hooks/tests/report.test.ts`, `hooks/tests/report-cases.ts` — cases shared with OpenCode.
- `agy/hooks/agy-gate.mjs`, `agy/hooks.json`, `agy/mcp_config.json`, `agy/install.sh`, `agy/bin/agycarol`, `agy/agents/*.md`, `agy/skills/contract/` — agy.
- `opencode/plugins/carol/` (`gate.js`, `index.js`, `report.js` new, `source.js`, `tests/`), `opencode/opencode.jsonc`, `opencode/HARNESS.md` — OpenCode.
- `.gitignore` — the plugin folder is not ignored.
- `CAROL.md`, `agents/*.md`, `commands/contract.md`, `skills/clean-up-writer`, `skills/doxygen-protocol`, `skills/iterative-contract-sop`, `cast/common.md`, `bin/carol`, `local/janitor/fix.lua`, `pi/HARNESS.md`, `pi/bin/janitor` — the rule text and the scripts.
- `~/.config/claude/settings.json` — `ask` rows for `python`, `python3`, `lua`; `Edit` moves from `allow` to `deny`.
- `~/Documents/Poems/dev/saw/RFC-one-tool.md` — new. Untracked.

Nothing is committed.

### Open Questions
None.

### Next Steps
- Trigger: ARCHITECT says that saw is updated.
- MACHINIST then does Remaining B item 1. Items 2 to 8 follow, each for the verbs that pass. One verb can ship before the others.
- The OpenCode live rig (fake model and run script) is in `/private/tmp/claude-501/-Users-jreng--carol/956a3a4e-98b0-42b4-99a9-7ad7db60537f/scratchpad/ocrig/` (`rig.sh`, `fake-model.mjs`). The system can clear it. The run needs `< /dev/null`: `opencode run` waits on an open standard input.
