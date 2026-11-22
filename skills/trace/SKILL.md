---
name: trace
description: Debug native binaries through the whatdbg MCP server (breakpoints, crash triage, locals, expressions, stack inspection). Accessible to COUNSELOR and Pathfinder only; hooks enforce this boundary. No Lua scripts, no DAP wrappers, no profiling (profiling uses scout exclusively).
---

# trace

`whatdbg` is the native debugger (CAROL.md Debugging). It runs as a native MCP stdio server (`whatdbg --mcp`). No Lua scripts and no spec files are used.

Profiling and stack sampling belong exclusively to `scout` (`profile` skill). Never use `whatdbg` for profiling.

## Access

- **COUNSELOR** and **@Pathfinder** may call `whatdbg` MCP tools.
- Hooks (`~/.carol/hooks/register.js`, `~/.carol/agy/hooks/agy-gate.mjs`) deny `whatdbg` MCP calls from all other roles and subagents.

## Tools (`whatdbg` MCP server)

| Phase | Tools |
|---|---|
| Session start | `launch` (`program`, optional `cwd`) or `attach` (`pid`, optional `cwd`) → returns `{session}` |
| Setup | `setBreakpoints` (`session`, `source.path`, `breakpoints`), then `configurationDone` (`session`) |
| Wait for events | `events` (`session`, `timeoutMs`) — returns `stopped`, `output`, `process`, `thread`, `breakpoint`, `exited`, `terminated` |
| Inspect | `threads`, `stackTrace`, `scopes`, `variables`, `evaluate`, `exceptionInfo` |
| Control | `continue`, `next`, `stepIn`, `stepOut`, `pause` |
| Session end | `disconnect` (`session`, `terminateDebuggee`) or `terminate` (`session`) |

## Protocol

1. Confirm the target binary is already built. This skill does not build.
2. Call `launch` (or `attach` when the target needs command-line arguments or is already running).
3. For breakpoint traces, call `setBreakpoints` with absolute source paths, then `configurationDone`. For crash triage, skip `setBreakpoints` and call `configurationDone`.
4. Call `events` with a bounded `timeoutMs` (up to `60000`) to wait for a `stopped` or `exited` event.
5. On a stop, inspect with `threads`, `stackTrace`, `scopes`, `variables`, `evaluate`, or `exceptionInfo`.
6. Always end the session with `disconnect` or `terminate` before returning.
7. When COUNSELOR delegates a debug run to `@Pathfinder`, COUNSELOR names the binary/pid, breakpoints, and expressions; `@Pathfinder` executes the `whatdbg` MCP calls and returns the raw structured results verbatim in `EVIDENCE`.

## Limits

- `launch` takes `program` and `cwd` only; it passes no command-line arguments and sets no environment. Start binaries that need arguments separately, then call `attach` with the `pid`.
- Breakpoints use absolute `file` paths and 1-based `line` numbers.
- Function names resolve without `-g`; `file:line` locations and locals require `-g`.
