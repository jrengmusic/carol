---
name: whatdbg-trace
description: Run one deterministic whatdbg debug trace from a spec file and report the result. Use when COUNSELOR delegates a trace to Pathfinder — crash triage or breakpoint inspection of a native binary. Pathfinder runs the driver with the given spec path and reports the output verbatim. Pathfinder never writes the spec and never writes DAP or Lua.
---

# whatdbg-trace

whatdbg is the debugger (CAROL.md Debugging). This skill is the one driver for it.

## Protocol

1. COUNSELOR owns the spec. COUNSELOR decides what to trace and writes the spec file.
2. COUNSELOR puts the absolute spec path in the Pathfinder delegation prompt.
3. Pathfinder runs the one command below with that path.
4. Pathfinder returns the driver output verbatim in EVIDENCE.
5. COUNSELOR reads the evidence and decides the next step.

Pathfinder does not edit the spec. Pathfinder does not add a breakpoint or an
expression. Pathfinder does not read `whatdbg --help`. Pathfinder does not write Lua.
The driver prints `SPEC ERROR` lines when the spec is wrong. Pathfinder returns them
under `Needs` and stops.

## Command

```
nvim --headless -l ~/.claude/skills/whatdbg-trace/trace.lua <absolute-spec-path>
```

Run it in the foreground. The run is bounded by `timeoutMs` in the spec.

Preconditions, all on COUNSELOR:

- `nvim` and `whatdbg` are on PATH.
- The target is already built with debug symbols. This skill does not build.
- Every path in the spec is absolute.

## Spec

The spec is a JSON file. Every field is required. The driver has no defaults.
An unknown field is an error.

| Field | Type | Meaning |
|---|---|---|
| `mode` | `"launch"` or `"attach"` | How the session starts. |
| `program` | string | Launch only. Absolute path of the binary. |
| `pid` | positive integer | Attach only. Process id. |
| `cwd` | string | Seeds the symbol and source search paths. |
| `breakpoints` | list of `{file, line}` | `file` is an absolute source path. `line` is a positive integer. An empty list is valid. |
| `onStop.stackDepth` | positive integer | How many frames to report at each stop. |
| `onStop.locals` | boolean | Report the locals of each reported frame. |
| `onStop.expressions` | list of string | Evaluated in frame #0 at each stop. An empty list is valid. |
| `afterStop` | `"continue"`, `"next"`, `"stepIn"` or `"stepOut"` | What the driver does after each stop that does not end the run. |
| `maxStops` | positive integer | The run ends at this stop count. |
| `timeoutMs` | positive integer | The run ends when this time passes with no ending event. |

### Template

```json
{
  "mode": "launch",
  "program": "/absolute/path/to/binary",
  "cwd": "/absolute/path/to/source/root",
  "breakpoints": [{ "file": "/absolute/path/to/file.cpp", "line": 40 }],
  "onStop": { "stackDepth": 3, "locals": true, "expressions": ["counter"] },
  "afterStop": "continue",
  "maxStops": 1,
  "timeoutMs": 30000
}
```

Crash trace: set `breakpoints` to `[]`. A crash stops the run by itself. The driver
captures the exception, the frames, and the locals. The driver then ends the run.
`afterStop` is required and unused on a crash stop.

## Output

One line per fact, in the order the events arrive. A newline inside a value prints as
`\n`.

| Line | Meaning |
|---|---|
| `TRACE mode=<mode>` | Run start. |
| `BREAKPOINT <file>:<line> verified=<bool> line=<line>` | Result of the breakpoint request. May add `message=`. |
| `BREAKPOINT-CHANGED id=<n> verified=<bool> line=<line>` | whatdbg resolved a breakpoint later. |
| `PROCESS name=<name> pid=<pid>` | The debuggee started. |
| `OUTPUT <category> <text>` | Debuggee output. |
| `STOP <n> reason=<r> thread=<id> text=<t> description=<d>` | A stop. `nil` means the field was absent. |
| `EXCEPTION id=<id> description=<d> breakMode=<m>` | Exception detail. Only on `reason=exception`. |
| `FRAME #<i> <function> <file>:<line>` | A frame. `<no source>` replaces the location when the frame has no source. |
| `LOCAL #<i> <name> : <type> = <value>` | A local of frame `#<i>`. |
| `EVAL <expression> = <result>` or `EVAL <expression> ERROR <message>` | Expression result in frame #0. |
| `EXITED code=<n>` | The debuggee exited. |
| `DRIVER ERROR <message>` | The session failed. The message names the request. |
| `END outcome=<outcome> stops=<n>` | Run end. |
| `SPEC ERROR <field>: <problem>` | The spec is wrong. The run did not start. |

Outcomes:

- `exited` — the debuggee ended by itself.
- `crash` — an exception stop ended the run. The driver then killed the debuggee.
- `limit` — the stop count reached `maxStops`. The driver then killed the debuggee.
- `timeout` — `timeoutMs` passed. The driver then killed the debuggee.
- `error` — see the `DRIVER ERROR` line. The driver then killed the debuggee.

Exit code: 0 when the trace ran. 2 when the spec is wrong.

## Limits

- whatdbg launch takes `program` and `cwd` only. No arguments. No environment.
- Breakpoints are `file:line` only.
- Locals and expression results are whatdbg's own text. Nested values are not expanded.
  The driver prints every local whatdbg returns and filters nothing.
- `timeoutMs` bounds the wait for events after setup. Each setup request has its own
  fixed timeout.
