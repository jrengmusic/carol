---
name: takeover
description: Recover and continue an interrupted session across any CLI harness (agy, Claude Code, OpenCode, Pi) without a clean handoff. Reads the newest prior session transcript for the current repo, reconciles it with the working tree and repo docs, and reports the exact resume state. Load when /takeover runs or ARCHITECT switches harnesses mid-sprint.
---

# takeover

Recover an interrupted session on the current repository across any CLI harness. Use this protocol when a usage limit or abrupt stop prevents `/handoff` or `/log`.

## Arguments (CLI-Agnostic)

| Command | Target |
|---|---|
| `/takeover` | Newest prior primary session for `pwd` across all harnesses (default) |
| `/takeover agy` | Newest prior agy primary session for `pwd` |
| `/takeover claude` | Newest prior Claude Code session for `pwd` |
| `/takeover opencode` | Newest prior OpenCode session for `pwd` |
| `/takeover pi` | Newest prior Pi session for `pwd` |
| `/takeover <id>` | Exact session UUID in any harness |

## Tool Rules

- Read transcript files with `saw` (`page`, `excerpt`, `find`) or the harness `Read` tool.
- Never run `cat`, `head`, `tail`, `jq`, `grep`, or `rg` (`saw-gate.mjs` denies them).
- Query SQLite databases with `sqlite3 -readonly`.
- Run `git status --short` and `git diff --stat` (permitted read-only git per `CAROL.md` Git).
- COUNSELOR may delegate transcript discovery to `@Pathfinder` or read directly. MACHINIST and ORACLE execute directly.

## Harness Session Stores

### agy
- Index: `~/.gemini/antigravity-cli/conversation_summaries.db`
- Query:
  ```sql
  SELECT conversation_id, last_modified_time, title
  FROM conversation_summaries
  WHERE workspace_uris LIKE '%file://<cwd>%'
    AND nesting_depth = 0
  ORDER BY last_modified_time DESC
  LIMIT 5;
  ```
- Transcript: `~/.gemini/antigravity-cli/brain/<conversation_id>/.system_generated/logs/transcript.jsonl`
- Skip the active `conversation_id` when running inside agy.

### Claude Code
- Directory: `~/.claude/projects/<encoded-cwd>/`
- Encoding rule: replace every `/` and `.` in `<cwd>` with `-` (example: `/Users/jreng/.carol` becomes `-Users-jreng--carol`).
- Files: `<uuid>.jsonl`, sorted newest first with `ls -t`.
- Skip subagent directories and skip the active session file (detect the current `/takeover` turn in the newest file).
- Message keys: `"type":"user"` and `"message":{"role":"assistant",...}`.

### OpenCode
- Database: `~/.local/share/opencode/opencode.db`
- Session query:
  ```sql
  SELECT id, time_updated, title
  FROM session
  WHERE directory = '<cwd>'
  ORDER BY time_updated DESC
  LIMIT 5;
  ```
- Tail query: read the last 20 rows from `message` and `part` for the chosen `session_id`, ordered by `time_created DESC`.
- Skip the active session when running inside OpenCode.

### Pi
- Directory: `~/.pi/agent/sessions/--<encoded-cwd>--/` (replace `/` with `-`; keep `.`, example: `--Users-jreng-.carol--`).
- Files: `<timestamp>_<uuid>.jsonl`, sorted newest first with `ls -t`.
- Line 1 holds `{"type":"session",...,"cwd":"<path>"}`. Subsequent lines hold `{"type":"message",...}`.

## Protocol

1. **Resolve `<cwd>`:** Run `pwd` to get the exact absolute repository path.
2. **Locate candidates:**
   - If ARCHITECT passed a harness keyword (`agy`, `claude`, `opencode`, `pi`), query only that store.
   - If ARCHITECT passed `<id>`, locate that UUID across all four stores.
   - With no argument, query all four stores for `<cwd>` and sort candidates by last modified timestamp (newest first).
   - Exclude the active session and all subagent sessions.
3. **Resolve ambiguity:**
   - If no prior session exists for `<cwd>`, report that fact and stop.
   - If the top two prior sessions belong to different tasks or have unclear continuity, list the top 3 candidates (harness, timestamp, ID, title or preview) and ask ARCHITECT to pick one.
   - Otherwise, select the single newest prior primary session.
4. **Read the transcript tail:**
   - Read the last 80 to 150 lines of the transcript (or the last 15 to 20 messages in OpenCode).
   - Read further back only if the tail lacks the active role, plan step, or last ARCHITECT instruction.
   - Extract: active role, current objective, last ARCHITECT instruction, last completed step, exact interruption point, and any pending build or subagent result.
5. **Reconcile against ground truth:**
   - Run `git status --short` and `git diff --stat`.
   - Read active state files that exist at the repo root or in `carol/`: `PLAN*.md`, `HANDOFF*.md`, `carol/SPRINT-LOG.md` (tail), `DEBT.md`, `CLEAN-UP-*.md`.
   - Treat the working tree as ground truth (`CAROL.md` Git). Never trust a transcript claim that contradicts the working tree or docs. Flag every mismatch with `file:line` or git output.
6. **Present the Takeover Brief:**
   Output one compact block in chat:
   ```
   TAKEOVER:
   - Source: <harness> | <session-id> | <timestamp>
   - Role: <active role>
   - Objective: <current task or PLAN file>
   - Completed: <last verified step or edit>
   - Interrupted at: <exact point where prior session stopped>
   - Tree state: <clean, or modified/untracked files from git status>
   - Discrepancies: <none, or exact mismatch between transcript and tree/docs>
   - Next step: <concrete next action>
   ```
7. **Gate before mutation:**
   - Stop after the `TAKEOVER:` brief. Wait for ARCHITECT's go-ahead before editing files, running builds, or spawning mutating subagents.
   - Never write a handoff file or log a sprint during `/takeover`.
