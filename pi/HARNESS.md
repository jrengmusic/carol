# CAROL on pi

This session runs in pi. The CAROL documents name Claude Code tools and files. Read each name as its pi
counterpart in these tables. Where a table gives "None", pi has no counterpart.

## Tools

JANITOR has only its own tools (`agents/janitor.md` `tools:`). The `iterative-contract-sop` skill gives
each tool's job.

| Claude Code | pi (JANITOR) |
| ----------- | ------------ |
| Read | `read_range`: numbered lines, at most 80 per call |
| Write, Edit, Bash | None. `fix_batch` makes every change through `saw patch`. |
| Glob, Grep, LSP | None. `scan_rule` finds the violations with tree-sitter queries. |
| Skill | None. The `iterative-contract-sop` skill is part of this prompt. |
| EnterPlanMode, ExitPlanMode, AskUserQuestion | None. Ask in chat. ARCHITECT's reply is the answer. |
| Agent, Task, SendMessage, Monitor, TaskStop, WebFetch, WebSearch | None |

## Files

| Claude Code | pi |
| ----------- | -- |
| `~/.carol/hooks/register.js` (the `tool.call` hook) | `~/.carol/pi/extensions/carol-gate.ts`: the JANITOR tool allow-list and the compaction handoff |
| The CAROL output style | The system prompt that `janitor` composes |
| `CLAUDE.md` | None. `janitor` passes `--no-context-files`. |
| The settings ask list | The `carol-gate.ts` allow-list |
| The Claude Code harness | The pi harness. Its CAROL integration is `~/.carol/pi/`. The tools are in `~/.carol/local/janitor/`. |
