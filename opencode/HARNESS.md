# CAROL on OpenCode

This session runs in OpenCode. The CAROL documents name Claude Code tools and files. Read each name as its
OpenCode counterpart in these tables. Where a table gives "None", OpenCode has no counterpart.

## Tools

| Claude Code | OpenCode |
| ----------- | -------- |
| Agent, Task | `subagent`. The agent ID is the lowercase role name: `engineer`, `pathfinder`, `librarian`, `auditor`, `oracle`. |
| SendMessage | `subagent` with the `sessionID` of that child session |
| AskUserQuestion | `question` |
| Bash | `shell`. `run_in_background` is `background`. |
| Read, Write, Edit, Glob, Grep | `read`, `write`, `edit`, `glob`, `grep` |
| WebFetch, WebSearch | `webfetch`, `websearch` |
| Skill | `skill` |
| LSP | `lsp`, with the same operations, on clangd |
| TodoWrite, TaskCreate, TaskGet, TaskList, TaskUpdate | `todowrite` |
| EnterPlanMode, ExitPlanMode | None. Present the plan in chat. ARCHITECT's reply is the approval. |
| TaskOutput, TaskStop, Monitor, Workflow | None |

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
