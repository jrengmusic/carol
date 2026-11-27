## Handoff to MACHINIST: Finish live checks and cross-machine sync for saw enforcement

**From:** MACHINIST
**Date:** 2026-11-27
**Status:** In Progress

Whole-session `saw` enforcement is wired isomorphically across Claude Code, `agy`, and OpenCode. All automated test suites pass on `saw 0.0.1 (c8865a6)`. Only interactive live checks, cross-machine sync, and one `saw` stdin defect remain.

### Read First
1. `~/.carol/hooks/saw-gate.mjs` — the shared gate and per-tool denial table for all three harnesses.
2. `~/.carol/CAROL.md:321-361` — Destructive-Edit Discipline.
3. `~/.carol/opencode/HARNESS.md` — the OpenCode tool map.
4. `~/.config/claude/settings.json` — Claude Code `allow`, `deny`, and `ask` rules.

### Context
ARCHITECT wanted one deterministic tool (`saw`) to replace `sed`, `awk`, `grep`, `rg`, `jq`, `cat`, `bat`, `head`, `tail`, `cut`, `Edit`, `Write`, and `Grep` across Claude Code, `agy`, and OpenCode. `saw 0.0.1 (c8865a6)` shipped `json`, `page`, and `write`. MACHINIST wired whole-session denials, aligned tool grants isomorphically across all three harnesses, migrated statusline and fzf scripts off `jq`/`bat`, and verified all automated suites.

### Completed

**Isomorphic state by harness**

| Rule | Claude Code | `agy` 1.5.18 | OpenCode 2.2.5 |
|---|---|---|---|
| `saw` MCP | `claude mcp list`: connected | `agy/mcp_config.json` (`carol_saw`) | `opencode/opencode.jsonc` (`protocol` `2026-07-28`, `saw_run`) |
| `sed`, `awk`, `grep`, `rg`, `jq`, `cat`, `bat`, `head`, `tail`, `cut`, `perl -i/-n/-p`, `python -c`, `node -e` denied whole session | yes | yes | yes |
| `tail -f` and `tail -F` exempt | yes | yes | yes |
| Redirect or `tee` into a project file denied whole session | yes | yes | yes |
| Shell function guards positions patterns cannot read | yes | yes (macOS/Linux) | yes (macOS/Linux) |
| `saw --apply` only for Engineer and doxygen Pathfinder | yes | yes | yes |
| Native `Edit`, `Write`, `Grep` denied and removed from tool grants | `register.js` + `settings.json` `deny` + `agents/*.md` | `agy-gate.mjs` (`edit_file`, `write_file`, `grep_search`) + `agy/agents/*.md` | `gate.js` (`DENIED_TOOLS`: `edit`, `patch`, `grep`, `write`) |
| Native `Read` kept for single-file reads, contract reads, and binary media | yes | yes | yes |
| Pathfinder excerpt verification | `SubagentStop` | `send_message` denial | `execute.after` (foreground) |
| `python` and `lua` ask ARCHITECT in main session | `settings.json` `ask` | `force_ask` | `ask` rules from `cast/common.md` |

**Verified evidence**
- `saw --version` prints `saw 0.0.1 (c8865a6)` (`~/.local/bin/saw`, rebuilt 2026-11-27 23:00).
- `saw` CLI suite: `cd ~/Documents/Poems/dev/saw && nvim --headless -l test/run.lua ~/.local/bin/saw` exits 0.
- `saw` MCP suite: `cd ~/Documents/Poems/dev/saw && nvim --headless -l test/run.lua ~/.local/bin/saw mcp` exits 0.
- Claude Code MCP: `claude mcp list` shows `saw`, `ling`, `whatdbg`, and `scout` connected.
- Claude Code tests: `cd ~/.carol && claude plugin test .` passes 190/190 (0 fail).
- OpenCode tests: `cd ~/.carol/opencode/plugins/carol && bun test` passes 196/196 (1 skip, 0 fail).
- OpenCode config: `OPENCODE_CONFIG_DIR="$HOME/.carol/opencode" opencode debug config --standalone` loads `mcp.servers.saw`, and `opencode debug agents --standalone` loads all CAROL agents with `saw_*`.
- `agy` install: `bash ~/.carol/agy/install.sh` passes validation (`skills 15 · agents 7 · rules 3 · hooks 1 · mcpServers 4`).
- Machine scripts migrated: `bin/carol-statusline.sh` and `agy/bin/agy-statusline.sh` use `saw json`; `~/.config/zsh/fzf-end.sh` uses `saw page`; `~/.config/bootstrap-macos.sh` and `~/.config/bootstrap-windows.sh` drop `bat` and `jq`.

### Remaining
1. **MACHINIST, Claude Code live check:** start a fresh Claude Code session and confirm `Write`, `Edit`, and `Grep` are absent/denied and a paraphrased Pathfinder report goes back.
2. **MACHINIST, `agy` live check:** test `force_ask` on `python`/`lua` under skip-permissions.
3. **MACHINIST, OpenCode live check:** run a live session with a real model to confirm `saw_run` connects (`opencode mcp list --standalone` prints `No MCP servers configured` when no session is active).
4. **MACHINIST, Windows check:** verify `agy` and OpenCode shell behavior on Windows, where the shell function guard is skipped.
5. **ARCHITECT, other machines:** pull `~/.carol` and `~/.config`, build/install `saw` (`c8865a6` or later), run `claude mcp add -s user saw -- saw --mcp`, run `bash ~/.carol/agy/install.sh`, and run both `saw` test lanes.
6. **ARCHITECT:** rotate the MiniMax key from session `956a3a4e-98b0-42b4-99a9-7ad7db60537f` if not already rotated.
7. **COUNSELOR (`saw` repo):** fix `saw page` piped stdin crash (`... | saw page -r 1:40` exits 139 / SIGSEGV on `c8865a6`) and implement `tail -F` follow support later if desired.

### Key Decisions
- *"we should fix saw first, so it live to its premise. then we could enforce the protocol."*
- *"can we prevent any subagent to use sed, awk, grep, rg, or python for file manipulation? must always use saw."*
- *"so Pathfinder should just return verbatim without any additional instruction which previously sometimes being ignored"*
- *"please also read other harness ddocs thoroughly, because you must also wire the exact mechanism to agy and opencode"*
- *"i will ensure saw installed on each machine."*
- MACHINIST asked: *"does the Edit tool stay for main sessions?"*, option A *"Deny Edit in every session."* ARCHITECT: *"A"*.
- MACHINIST asked: *"Do the new denials also apply to main sessions, or only to subagents?"* ARCHITECT: *"WHOLE session"*.
- *"any file tools (sed, awk, grep, rg, find, jq, Write, Read) could be exclusive to saw MCP first. probably the missing feature now is tail -F, that could be implemented later on saw engine."*
- *"ok. so Write and Read multiple files and excerpt must use saw?"* (Confirmed: native `Read` stays for single-file reads, contract reads, and media; `Write`, `Edit`, and `Grep` stay denied in favor of `saw`.)

### Files Modified
**`~/.carol`:**
- `hooks/saw-gate.mjs` — whole-session denials (`cat`, `bat`, `head`, `tail`, `cut`, `jq`, `grep`, `rg`, `perl -n`, `python -c`, `node -e`, project redirects), `tail -f`/`-F` exemption, per-tool CLI + MCP denial table.
- `hooks/register.js` — whole-session `Edit`, `Write`, and `Grep` denials using the shared table.
- `hooks/tests/cases.ts` — whole-session denial tests including `Write`, `Edit`, and `Grep`.
- `agy/hooks/agy-gate.mjs` — whole-session `edit_file`, `write_file`, and `grep_search` denials using the shared table.
- `agy/agents/counselor.md`, `agy/agents/engineer.md`, `agy/agents/machinist.md`, `agy/agents/oracle.md`, `agy/agents/auditor.md`, `agy/agents/librarian.md`, `agy/agents/pathfinder.md` — remove `write_file` grants and align `saw` MCP instructions.
- `agents/counselor.md`, `agents/engineer.md`, `agents/machinist.md`, `agents/oracle.md`, `agents/auditor.md`, `agents/librarian.md`, `agents/pathfinder.md` — remove `Write` and `Grep` grants and align `saw` MCP instructions.
- `opencode/plugins/carol/gate.js`, `opencode/plugins/carol/index.js`, `opencode/plugins/carol/tests/gate.test.js`, `opencode/plugins/carol/tests/harness.js`, `opencode/HARNESS.md` — remove and deny `edit`, `patch`, `grep`, and `write` in every session via the shared table.
- `CAROL.md`, `skills/changelog-writer/SKILL.md`, `skills/readme-writer/SKILL.md`, `skills/synthesis-writer/SKILL.md` — update Destructive-Edit Discipline and `saw write` instructions.
- `bin/carol-statusline.sh`, `agy/bin/agy-statusline.sh` — replace `jq` with `saw json`.
- `HANDOFF-saw-enforcement.md` — updated to current state.

**`~/.config`:**
- `claude/settings.json` — move `Edit`, `Write`, and `Grep` to `deny`; add `ask` rules for `python`, `python3`, `lua`; set `ENABLE_TOOL_SEARCH` and Opus medium effort.
- `zsh/fzf-end.sh` — replace `bat` with `saw page`.
- `bootstrap-macos.sh`, `bootstrap-windows.sh` — remove `bat` and `jq`.

### Open Questions
None.

### Next Steps
- Run the remaining interactive live checks (Remaining items 1 to 4) as each harness or Windows machine is opened.
- After ARCHITECT syncs the other machines (Remaining item 5), delete `HANDOFF-saw-enforcement.md`.
