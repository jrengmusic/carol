# CAROL on pi

This session runs in pi. The CAROL documents name Claude Code tools and files. Read each name as its pi
counterpart in these tables. Where a table gives "None", pi has no counterpart.

## Tools

HOUSEKEEPER has no tools. `housekeeper` passes `--no-tools`, and `carol-gate.ts` blocks every call.

| Claude Code | pi (HOUSEKEEPER) |
| ----------- | ---------------- |
| Read, Write, Edit, Bash | None |
| Glob, Grep, LSP | None |
| Skill | None. `housekeeper` passes `--no-skills`. |
| EnterPlanMode, ExitPlanMode, AskUserQuestion | None. Ask in chat. ARCHITECT's reply is the answer. |
| Agent, Task, SendMessage, Monitor, TaskStop, WebFetch, WebSearch | None |

## Files

| Claude Code | pi |
| ----------- | -- |
| `~/.carol/hooks/register.js` (the `tool.call` hook) | `~/.carol/pi/extensions/carol-gate.ts`: the HOUSEKEEPER tool block |
| The CAROL output style | The system prompt, `agents/housekeeper.md` |
| `CLAUDE.md` | None. `housekeeper` passes `--no-context-files`. |
| The settings ask list | The `carol-gate.ts` tool block |
| The Claude Code harness | The pi harness. Its CAROL integration is `~/.carol/pi/`. |
