# RFC — No background work in subagents (hook gate)
Date: 2026-10-12
Status: Ready for MACHINIST handoff
Author: COUNSELOR (stamp session), on ARCHITECT's request

## Problem Statement

ARCHITECT asked: *"why there's always stale agents on bg? how to avoid this in the future to avoid potential cache re-read?"* and then: *"can you write RFC for MACHINIST to enforce this at hook level? ~/.carol/"*

In the stamp session of 2026-10-12, two subagents started background work of their own and returned their report before that work finished:

1. Pathfinder "document, links, images". Its completion notice said: "This agent stopped with background work of its own still running. It may resume on its own when that work completes or reports, and the same task-id notifies again if it does; the result below may be interim." COUNSELOR stopped it with TaskStop after ARCHITECT saw it in the background list.
2. Librarian "PDF links and outlines". Its report said it wrote a helper script to the scratchpad "to run a background extraction", and that "the background-task output files were also created by the harness".

A subagent that keeps background work alive after its report has three costs:

- The task stays in ARCHITECT's background list as a stale entry.
- When the work completes, the harness sends a new notification. That notification interrupts a later turn of the primary.
- The interruption can resume the primary on a cold cache, which re-reads the context. CAROL.md Step Gate names this cost for stops: "a stop mid-plan pulls ARCHITECT back in … and the session resumes on a cold cache."

A subagent's report is its final output (CAROL.md Subagent Return Format). Background work that outlives the report is work the primary never sees in that report.

## Research Summary (reads, this session)

- `~/.carol/hooks/register.js:145-148`: the Bash gate is `on('tool.call', { tool: 'Bash' }, …)`. It calls `getBashVerdict ($, e.command, e.agentId === undefined)`.
  - `e.agentId === undefined` marks a call from the main session.
  - A defined `e.agentId` marks a call from a subagent.
  - The MACHINIST push/pull rule uses the same test (`register.js:86`).
- `register.js:82-88` `getBashVerdict`: the first check is the in-place edit gate (`:83`), then the git gate.
- The tool-call event carries the tool's own input fields. The hook reads `e.command` for Bash (`:146`) and `e.subagent_type` and `e.model` for Agent (`:136-138`).
- The Bash tool input field that starts a background command is `run_in_background`. Source: the harness Monitor tool description in this session: "use **Bash with `run_in_background`** and a command that exits when the condition is true". The Bash schema itself was not read: the COUNSELOR session has no Bash tool. See Open Questions.
- The Monitor tool always runs in the background: "Start a background monitor that streams events from a long-running script … you keep working and notifications arrive in the chat" (harness Monitor tool description, this session).
- Subagent tool sets (Agent tool listing, this session):
  - Pathfinder: Read, Grep, Glob, Bash.
  - Librarian: Read, Grep, Glob, Bash, WebFetch, WebSearch.
  - Engineer: Read, Write, Edit, Bash, Glob, Grep.
  - Auditor: Read, Grep, Glob, Bash.
  - So for today's subagents, Bash is the only tool that can start background work. Monitor is not in any subagent's list.
- Tests: `~/.carol/hooks/tests/gate.test.ts:16-24` `getToolInput` builds the Bash input from `testCase.command`, and adds `agentId: 'sub1'` when `testCase.subagent` is set. `~/.carol/hooks/tests/cases.ts:22` already uses `subagent: true`.

## Principles and Rationale

- **One gate, one owner.** The Bash gate already owns the per-command verdicts (in-place edit, git). The background rule joins `getBashVerdict` as one more verdict. No new handler is needed for Bash (NAMES Rule 5, nearest-sibling precedence; MANIFESTO S).
- **Scope: subagents only.** The main session keeps background Bash and Monitor. ARCHITECT's own sessions, MACHINIST builds and COUNSELOR's watchers use them, and the primary sees their notifications by design. The defect is only in work that outlives a subagent's report.
- **Deny with the fix in the message.** Each gate message names the rule and the correct action (pattern: `IN_PLACE_GATE`, `register.js:24`). The subagent then runs the command in the foreground and continues. It does not stop.
- **Monitor.** No subagent has Monitor today. A gate for it in subagents keeps the rule whole if a definition adds the tool later. This is the one speculative part, so it is an option for ARCHITECT: see Open Questions.

Rejected:
- **Prompt-only rule** (a line in each delegation prompt). COUNSELOR does this now, from 2026-10-12. But it depends on each prompt, and the hook is the CAROL layer that does not (CAROL.md Git "Hook enforcement", Destructive-Edit "Hook enforcement").
- **Agent-definition text only** (`agents/*.md`). Same weakness: text that the model can miss. Good as documentation beside the gate; see Scaffold step 4.

## Scaffold

Exact edits. All paths are under `~/.carol/`.

### 1. `hooks/register.js`

Add the gate text beside the other gate constants (after `IN_PLACE_GATE`, line 24):

```js
const BACKGROUND_GATE = 'A subagent runs no background command (CAROL.md Subagent Return Format: the report is the final output). Run this command in the foreground, wait for it to finish, and put its result in your report.'
```

Extend `getBashVerdict` (lines 82-88) with the background verdict as its first check:

```js
async function getBashVerdict($, command, isMainSession, isBackground) {
  if (!isMainSession && isBackground) return { deny: BACKGROUND_GATE }
  if (IN_PLACE_PATTERN.test(command)) return { deny: IN_PLACE_GATE }
  const invocations = countMatches(GIT_COMMAND_PATTERN, command)
  if (invocations === 0 || (await read($, isGitInstructed))) return undefined
  const isSyncPermitted = isMainSession && (await read($, sessionAgentType)) === MACHINIST_ROLE
  return invocations === getPermittedInvocations(command, isSyncPermitted) ? undefined : { deny: GIT_GATE }
}
```

Pass the flag in the Bash handler (lines 145-148):

```js
on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
  const verdict = await getBashVerdict($, e.command, e.agentId === undefined, e.run_in_background === true)
  return verdict === undefined ? next(e) : verdict
}).catch(failClosed)
```

Only if ARCHITECT chooses the Monitor option (Open Questions 2), add a handler after the Bash handler:

```js
on('tool.call', { tool: 'Monitor' }, async ($, e, next) => {
  return e.agentId === undefined ? next(e) : { deny: BACKGROUND_GATE }
}).catch(failClosed)
```

### 2. `hooks/tests/gate.test.ts`

In `getToolInput` (lines 16-24), add `run_in_background` to the Bash input when the case sets it:

```ts
if (testCase.tool === 'Bash') {
  return {
    tool: 'Bash',
    command: testCase.command,
    ...(testCase.subagent ? { agentId: 'sub1' } : {}),
    ...(testCase.background ? { run_in_background: true } : {}),
  }
}
```

With the Monitor option, add a Monitor branch:

```ts
if (testCase.tool === 'Monitor') {
  return { tool: 'Monitor', command: testCase.command, ...(testCase.subagent ? { agentId: 'sub1' } : {}) }
}
```

### 3. `hooks/tests/cases.ts`

Add these cases beside the existing Bash cases:

```ts
{ name: 'subagent background bash denied', prompts: ['hello'], subagent: true, background: true, tool: 'Bash', command: 'sleep 1', expect: 'deny' },
{ name: 'subagent foreground bash allowed', prompts: ['hello'], subagent: true, tool: 'Bash', command: 'echo hi', expect: 'allow' },
{ name: 'main session background bash allowed', prompts: ['hello'], background: true, tool: 'Bash', command: 'sleep 1', expect: 'allow' },
{ name: 'subagent background read-only git denied', prompts: ['hello'], subagent: true, background: true, tool: 'Bash', command: 'git status', expect: 'deny' },
```

With the Monitor option, also add:

```ts
{ name: 'subagent monitor denied', prompts: ['hello'], subagent: true, tool: 'Monitor', command: 'tail -f x', expect: 'deny' },
{ name: 'main session monitor allowed', prompts: ['hello'], tool: 'Monitor', command: 'tail -f x', expect: 'allow' },
```

### 4. Documentation (one sentence each)

- `CAROL.md`, section Subagent Return Format: add "A subagent runs no background command. Every command finishes before the report. The `tool.call` hook in `~/.carol/hooks/register.js` denies a background Bash call from a subagent."
- `agents/pathfinder.md`, `agents/librarian.md`, `agents/engineer.md`, `agents/auditor.md`: one line in each tool-discipline section: "Run every Bash command in the foreground; never use `run_in_background`." Put it where each file already states its tool rules. MACHINIST reads each file first and follows its own shape.

## BLESSED Compliance Checklist
- [x] Bound — the hook is the single owner of tool-call verdicts.
- [x] Lean — one constant, one condition, one parameter; the Monitor handler is optional.
- [x] Explicit — the deny message names the rule and the fix.
- [x] SSOT — the main-session test reuses `e.agentId === undefined`, the test the git sync rule already uses (`register.js:86, 146`).
- [x] Stateless — no new atom; the verdict reads the event only.
- [x] Encapsulation — the rule lives in `getBashVerdict`, beside its siblings.
- [x] Deterministic — the same event gives the same verdict.

## Open Questions

1. **Field name (verify, MACHINIST).** Confirm that the Bash tool input field is exactly `run_in_background` and its value a boolean. Read the Bash tool schema in a session that has Bash, or log one background call's `e` in the hook. The only source here is the Monitor tool text. If the name differs, change the one expression `e.run_in_background === true` and the test input key.
2. **Monitor gate (ARCHITECT decides).** No subagent has Monitor today. Options:
   - (a) Add the Monitor handler now. The rule then holds if a definition adds Monitor later.
   - (b) Leave it out (MANIFESTO L, YAGNI) and add it with any definition that grants Monitor.
3. **Other background sources.** A subagent with the Agent tool could start its own subagents. Today only ORACLE has the Agent tool (Pathfinder, Librarian), and ORACLE is a primary. No gate is proposed. Raise it again if a subagent definition gains Agent.

## Handoff Notes

- Target: MACHINIST. The hook and the agent definitions are MACHINIST's surface (CAROL.md Roles).
- COUNSELOR edited no file except this RFC.
- Order:
  1. Verify Open Question 1.
  2. Apply Scaffold step 1, plus the Monitor parts if ARCHITECT chose option (a).
  3. Apply steps 2 and 3. Run the hook tests: every existing case must still pass, and the new cases must pass.
  4. Apply step 4.
- Until this lands, COUNSELOR does two things by hand:
  - It puts the line "Run no background commands. Every command must finish before you return your report." in every delegation prompt.
  - It stops at once any subagent whose completion notice says background work is still running.
