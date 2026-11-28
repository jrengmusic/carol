# CAROL on OpenCode

This session runs in OpenCode. The CAROL documents name Claude Code tools and files. Read each name as its
OpenCode counterpart in these tables. Where a table gives "None", OpenCode has no counterpart.

## Tools

| Claude Code | OpenCode |
| ----------- | -------- |
| Agent, Task | `subagent`. The agent ID is the lowercase role name: `engineer`, `pathfinder`, `librarian`, `auditor`. `pathfinder` runs in the foreground only: its report is checked before you read it. |
| SendMessage | `subagent` with the `sessionID` of that child session |
| AskUserQuestion | `question` |
| Bash | `shell`. `run_in_background` is `background`. |
| Read, Write, Glob, Grep | `read`, `write`, `glob`, `grep` |
| `mcp__saw__run` | `saw_run`, with the same arguments |
| `mcp__whatdbg__*` | `whatdbg_*`, with the same arguments |
| `mcp__scout__run` | `scout_run`, with the same arguments |
| WebFetch, WebSearch | `webfetch`, `websearch` |
| Skill | `skill` |
| LSP | `lsp`, with the same operations, on clangd |
| EnterPlanMode, ExitPlanMode | None. Present the plan in chat. ARCHITECT's reply is the approval. |
| TaskStop, Monitor, Workflow | None |

No session has an `edit`, `patch`, `grep`, and `write` tool: search, edit, and write with saw. A subagent
has no `question` tool.

## Subagent Model

CAROL.md Subagent Model says that every Agent call passes `model`. In OpenCode, omit `model` on a `subagent`
call. The agent definition sets the model. The carol plugin denies a `model` value that is different from the
definition.

## Files

| Claude Code | OpenCode |
| ----------- | -------- |
| `~/.carol/hooks/register.js` (the `tool.call`, `prompt.submit` and `Stop` hooks) | `~/.carol/opencode/plugins/carol/`, with the same gates |
| `CLAUDE.md` | An instruction file, loaded with `AGENTS.md` |
| The CAROL output style | The session instruction entry `carol.output-style` |
| The settings ask list | `ask` permission rules on each CAROL agent |
| The Claude Code harness | The OpenCode harness. Its CAROL integration is `~/.carol/opencode/`. |
