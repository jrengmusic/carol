# RFC — CAROL Protocol Update and Harness MCP Wiring for ling, whatdbg, and scout
Date: 2026-11-22
Status: implemented
Author: COUNSELOR
Targets: `~/.carol/CAROL.md`, `~/.carol/agents/counselor.md`, `~/.carol/agents/pathfinder.md`, `~/.carol/hooks/register.js`, `~/.carol/skills/trace/SKILL.md`, `~/.carol/skills/profile/SKILL.md`, `~/.carol/skills/doxygen-protocol/SKILL.md`, `~/.carol/agy/mcp_config.json`, `~/.carol/agy/install.sh`, `~/.claude.json` / `~/.claude/settings.json`

## Problem Statement

`ling --mcp`, `whatdbg --mcp`, and `scout --mcp` are now complete native MCP stdio servers (revision `2026-07-28`) built on `jam_model_context_protocol` and installed on `PATH` (`/Users/jreng/.local/bin/ling`, `/Users/jreng/.local/bin/whatdbg`, `/Users/jreng/.local/bin/scout`).

CAROL's protocol documents, agent definitions, skills, hooks, and harness configurations do not yet wire or describe these MCP servers:

1. Claude Code has zero `mcpServers` registered (`~/.claude.json`, `~/.claude/settings.json`).
2. Antigravity (`agy`) registers only `carol-ling` through a Node wrapper (`~/.carol/agy/mcp_config.json:1-8` → `ling-bridge.mjs`), with neither `whatdbg --mcp` nor `scout --mcp` registered.
3. `CAROL.md`, `counselor.md`, `pathfinder.md`, `trace/SKILL.md`, `profile/SKILL.md`, and `doxygen-protocol/SKILL.md` instruct agents to drive `whatdbg` through Lua scripts, `scout` through shell commands, and `ling` through the LSP tool only.
4. `~/.carol/hooks/register.js` matches no `mcp__*` tool names.

ARCHITECT's directive, verbatim:

> *"write RFC for machinist at ~/.carol/ for :*
> *- update all carol protocol with whatdbg, scout, ling mcp*
> *- wire the mcp for claude code and agy"*

ARCHITECT's prior ruling R19 (`jam/PLAN-model-context-protocol-0-tracker.md:41`), verbatim:

> *"but reading help each new session, wire script and harnesses for profiling is equally context taxing no?"*
> *"can you update jam plan mcp tracker to write your understanding especially for scout with lazy mcp to reserve context tax?"*

## Research Summary

### 1. Native MCP Binaries on PATH

All three binaries exist in `/Users/jreng/.local/bin/` and passed macOS `scout` verification on 2026-11-22 (`jam/PLAN-model-context-protocol-0-tracker.md:60-63`):

| Binary | Command | Tools | Verified Manifest |
|---|---|---|---|
| `/Users/jreng/.local/bin/ling` | `ling --mcp <manifest> [--<word>]` | 13 read-only AST/LSP tools (`ling/Source/tools.json`) | `ling/benchmark/mcp.md` (exit 0) |
| `/Users/jreng/.local/bin/whatdbg` | `whatdbg --mcp` | 18 DAP + `events` tools (`whatdbg/Source/tools.json`) | `whatdbg/benchmark/mcp.md` (exit 0) |
| `/Users/jreng/.local/bin/scout` | `scout --mcp` | 1 `run` tool (`scout/Source/tools.json`) | `scout/benchmark/mcp.md` (exit 0) |

All three `HELP.md` files document `--mcp`:
- `ling/Source/HELP.md:60`: `` `ling --mcp <manifest> [--<word>]` | Serves the operations of the daemon as Model Context Protocol tools over stdio (revision 2026-07-28). Ends when stdin closes. | 0 ``
- `whatdbg/Source/HELP.md:14`: `whatdbg --mcp      serve debug sessions as Model Context Protocol tools on stdin and stdout`
- `scout/Source/HELP.md:15`: `` `scout --mcp` | Serves the run tool as Model Context Protocol over stdin and stdout. Ends when stdin closes. | 0 ``

### 2. Current Harness MCP Configurations

- **Claude Code:**
  - `/Users/jreng/.claude.json` has no top-level `mcpServers` key, and every entry under `.projects` has `"mcpServers": {}`.
  - `/Users/jreng/.claude/settings.json:1-100` has no `mcp*`, `enableAllProjectMcpServers`, or tool-search keys.
  - Claude Code 2.1.326 negotiates MCP `2026-07-28` first (`server/discover`), delivers `structuredContent` JSON when `content` is empty, enforces a 25000-token output limit (`MAX_MCP_OUTPUT_TOKENS`), and prefixes hook tool names as `mcp__<server>__<tool>` (`jam/PLAN-model-context-protocol-0-tracker.md:162-167`, host facts H1–H6).
- **Antigravity (`agy`):**
  - `/Users/jreng/.gemini/config/plugins/carol/mcp_config.json:1-8` is installed from `/Users/jreng/.carol/agy/mcp_config.json:1-8` by `/Users/jreng/.carol/agy/install.sh:20`.
  - Current content (`~/.carol/agy/mcp_config.json:1-8`):
    - Registers `"carol-ling"` via `"command": "node"`, `"args": ["/Users/jreng/.gemini/config/plugins/carol/mcp/ling-bridge.mjs"]`.
    - Antigravity loads registered MCP servers lazily (`Lazy:` tool list in session prompt).
  - `/Users/jreng/.gemini/config/mcp_config.json` is 0 bytes.

### 3. Current CAROL Protocol Surfaces

- `~/.carol/CAROL.md`:
  - `## Debugging` (`:349-356`): specifies `whatdbg` over DAP stdio and the `trace` skill; zero mentions of `mcp`.
  - `## Profiling` (`:358-364`): specifies `scout` CLI and the `profile` skill; zero mentions of `mcp`.
  - `## Doxygen` (`:375-389`): specifies Doxygen XML + LSP tool (`ling`) and `doxygen-protocol` skill; zero mentions of `mcp`.
- `~/.carol/agents/counselor.md`:
  - Trace specs (`:269-272`): delegates `whatdbg` traces to `@Pathfinder` with `trace` or `sample` driver and a scratchpad spec file.
  - Profile manifests (`:273-297`): delegates `scout` runs to `@Pathfinder` with an absolute manifest path; instructs `sudo -n scout <manifest>` for `## sample` tables.
  - Note: `scout --mcp` already inspects the manifest for `## sample` and launches `sudo -n scout <path>` automatically (`scout/Source/ToolServer.cpp:118-122`).
- `~/.carol/agents/pathfinder.md`:
  - Verification (`:35-38`), Trace protocol (`:46-56`), Profile protocol (`:58-70`), Doxygen protocol (`:72-91`): `tools:` line (`:7`) lists `Read, Edit, Grep, Glob, Bash, LSP`; zero `mcp` tool references.
- `~/.carol/hooks/register.js`:
  - Registered `tool.call` hooks (`:162-194`): `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode`, `Read`, `Agent`, `Task`, `Bash`, `Monitor`.
  - Zero `mcp__*` matchers (`register.js` has no match for `mcp__`, `whatdbg`, `scout`, or `ling`).
- Skills:
  - `~/.carol/skills/trace/SKILL.md:1-30`: describes `trace.lua` and `sample.lua` DAP drivers only.
  - `~/.carol/skills/profile/SKILL.md:1-30`: describes `scout <manifest>` and `sudo -n scout <manifest>` CLI invocation only.
  - `~/.carol/skills/doxygen-protocol/SKILL.md:1-30`: describes `ling project-info.md` via the LSP tool only.

### 4. Operational Constraint on `ling --mcp`

`whatdbg --mcp` and `scout --mcp` take zero startup arguments and operate on whatever session or manifest path each tool call passes. `ling --mcp <manifest> [--<word>]` requires a manifest path at server startup (`ling/Source/HELP.md:60`). A single static global MCP entry for `ling --mcp` therefore cannot serve multiple project repositories unless either:
- each project provides a `.mcp.json` naming its own `project-info.md`, or
- a thin workspace-aware launcher passes `<cwd>/project-info.md` to `ling --mcp`, or
- `ling --mcp` itself stays per-project while `agy` keeps or replaces `ling-bridge.mjs`.

## Principles and Rationale

- **S (Single Source of Truth):** One native C++ MCP server per tool (`ling`, `whatdbg`, `scout`) eliminates duplicate script wrappers (`ling-bridge.mjs`, `trace.lua`/`dap.lua` where MCP covers the workflow) and keeps tool schemas in each tool's embedded `tools.json`.
- **E (Explicit):** MCP tool schemas (`tools.json`) declare exact parameter names, types, bounds, and annotations (`readOnlyHint`, `destructiveHint`). Lazy loading on the harness keeps idle session context near zero while avoiding repeated reads of `HELP.md` and `SKILL.md` (R19).
- **B (Bound):** Each MCP server owns its child processes and exits cleanly on stdin close (`whatdbg/Source/ToolServer.cpp:41-45`, `scout/Source/ToolServer.cpp:49-54`, `ling/Source/ToolRelay.cpp:40-44`).
- **E (Encapsulation):** Existing CLI, LSP, and DAP contracts remain intact for Neovim and direct terminal use (ruling R12).
- **Considered and rejected:** Adding a Node/Python wrapper around `whatdbg` or `scout`. Rejected under **S (SSOT)** and **L (Lean)** because both native binaries already speak MCP `2026-07-28` over stdio.

## Scaffold

Target Antigravity (`~/.carol/agy/mcp_config.json`) structure for direct native `whatdbg` and `scout` registration alongside `ling`:

```json
{
  "mcpServers": {
    "carol-ling": {
      "command": "node",
      "args": ["/Users/jreng/.gemini/config/plugins/carol/mcp/ling-bridge.mjs"]
    },
    "carol-whatdbg": {
      "command": "whatdbg",
      "args": ["--mcp"]
    },
    "carol-scout": {
      "command": "scout",
      "args": ["--mcp"]
    }
  }
}
```

Target Claude Code user-level (`~/.claude.json` `mcpServers`) structure for `whatdbg` and `scout`:

```json
{
  "mcpServers": {
    "whatdbg": {
      "command": "whatdbg",
      "args": ["--mcp"]
    },
    "scout": {
      "command": "scout",
      "args": ["--mcp"]
    }
  }
}
```

## BLESSED Compliance Checklist
- [ ] Bounds  - [ ] Lean  - [ ] Explicit  - [ ] SSOT
- [ ] Stateless  - [ ] Encapsulation  - [ ] Deterministic

Not checked: design choices below are open for MACHINIST and ARCHITECT.

## Open Questions

1. **Server naming across Claude Code and Antigravity.**
   - Option A: prefix all three with `carol-` (`carol-ling`, `carol-whatdbg`, `carol-scout`) on both harnesses, matching existing `carol-ling` (`~/.carol/agy/mcp_config.json:3`).
   - Option B: bare names (`ling`, `whatdbg`, `scout`) on Claude Code and `carol-*` on Antigravity (matching plugin namespace).
   - Settled by: ARCHITECT / MACHINIST.

2. **`ling --mcp` manifest dispatch in global MCP config.**
   - Option A: keep `ling-bridge.mjs` in Antigravity (or add a tiny shell/JS launcher) solely to resolve `<workspace>/project-info.md` and exec `ling --mcp <manifest>`, and register per-project `.mcp.json` in Claude Code.
   - Option B: update `ling --mcp` (in a separate `ling` sprint) to default to `<cwd>/project-info.md` when no manifest argument is given, so both harnesses run `"command": "ling", "args": ["--mcp"]` directly with zero wrapper. (Recommended under **S (SSOT)** and **L (Lean)** — eliminates `ling-bridge.mjs` completely.)
   - Settled by: ARCHITECT.

3. **Role ownership of MCP tool calls (`whatdbg` and `scout`).**
   - Option A: keep current delegation split — COUNSELOR writes manifests/plans, `@Pathfinder` calls `mcp__*__whatdbg` and `mcp__*__scout` (add MCP tools to `pathfinder.md` `tools:`), and hooks in `register.js` gate mutation or enforce protocol rules on `mcp__*` calls.
   - Option B: allow COUNSELOR to invoke `scout` and `whatdbg` MCP tools directly (since `scout --mcp` takes only an absolute manifest path and `whatdbg --mcp` returns structured JSON), keeping `trace.lua` / `sample.lua` only for scripted crash/stack sampling.
   - Settled by: ARCHITECT.

4. **Claude Code lazy-loading configuration.**
   - Option A: rely on Claude Code's built-in Tool Search / deferred MCP loading for `whatdbg`, `scout`, and `ling` (verify the exact setting key in Claude Code 2.1.326 before editing `~/.claude/settings.json`).
   - Option B: register `whatdbg` and `scout` at user scope (`~/.claude.json`) and `ling` per-project (`.mcp.json`) so non-C++ sessions load zero `ling` tools.
   - Settled by: MACHINIST (verify Claude Code setting) + ARCHITECT.

5. **Disposition of `trace/SKILL.md` Lua drivers (`trace.lua`, `sample.lua`) and `profile/SKILL.md` CLI instructions.**
   - Option A: update `CAROL.md`, `counselor.md`, `pathfinder.md`, `trace/SKILL.md`, and `profile/SKILL.md` to make MCP the primary interface while keeping `sample.lua` (stack sampling) and CLI `scout` documented as fallback / Where-lane tools.
   - Option B: replace `trace.lua` with `whatdbg --mcp` completely and keep only `sample.lua` for attach/stack sampling.
   - Settled by: ARCHITECT.

6. **Hook rules in `~/.carol/hooks/register.js`.**
   - Option A: add no `mcp__*` restrictions initially; rely on each tool's built-in schema validation and `scout`'s `sudo -n` handling.
   - Option B: add `mcp__*` matchers in `register.js` to enforce subagent boundaries (for example, denying `whatdbg` `terminate` or `scout` `run` from `@Auditor`).
   - Settled by: ARCHITECT / MACHINIST.

## Handoff Notes

- Windows verification of Parts 4, 6, 7, and 8 (`stdio-client-windows.md`, `ling/benchmark/mcp.md`, `whatdbg/benchmark/mcp.md`, `scout/benchmark/mcp.md`) is pending ARCHITECT's Windows host run (ruling R4). macOS runs all passed on 2026-11-22.
- `scout --mcp` automatically detects `## sample` tables in the manifest and launches `sudo -n scout <path>` (`scout/Source/ToolServer.cpp:118-122`), so `~/.config/setup-scout.sh` `NOPASSWD` rule continues to cover sampled runs without extra wrapper scripts.
- All three binaries are installed in `/Users/jreng/.local/bin/` and on `PATH`.
- `jam/PLAN-model-context-protocol-0-tracker.md` holds all MCP spec facts (F1–F19), host facts (H1–H6), and rulings (R1–R19) for reference.
