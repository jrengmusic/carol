---
name: trace
description: Run one deterministic whatdbg debug run from a spec file and report the result. Two drivers — trace (breakpoints, crash triage) and sample (stack at chosen moments, wall time, aggregate profile). Use when COUNSELOR delegates a trace or a sample to Pathfinder for a native binary. Pathfinder runs the named driver with the given spec path and reports the output verbatim. Pathfinder never writes the spec and never writes DAP or Lua.
---

# trace

whatdbg is the debugger (CAROL.md Debugging). This skill holds the drivers for it.

| Driver | Question it answers |
|---|---|
| `trace.lua` | What are the values at this file:line? Where did it crash? |
| `sample.lua` | Where is the program at T ms? Where does it spend its time? |

Both drivers share `driver.lua` (spec validator, report helpers, session start and end)
and `dap.lua` (DAP client). The spec grammar and the output grammar are the same.

## Protocol

1. COUNSELOR owns the spec. COUNSELOR decides what to trace or sample and writes the spec file.
2. COUNSELOR puts the driver name (`trace` or `sample`) and the absolute spec path in the
   Pathfinder delegation prompt.
3. Pathfinder runs the one command below for that driver with that path.
4. Pathfinder returns the driver output verbatim in EVIDENCE.
5. COUNSELOR reads the evidence and decides the next step.

Pathfinder does not edit the spec. Pathfinder does not add a breakpoint or an
expression. Pathfinder does not read `whatdbg --help`. Pathfinder does not write Lua.
The driver prints `SPEC ERROR` lines when the spec is wrong. Pathfinder returns them
under `Needs` and stops.

## Command

```
nvim --headless -l ~/.claude/skills/trace/trace.lua <absolute-spec-path>
nvim --headless -l ~/.claude/skills/trace/sample.lua <absolute-spec-path>
```

Run it in the foreground. The run is bounded by `timeoutMs` in the spec.

Preconditions, all on COUNSELOR:

- `nvim` and `whatdbg` are on PATH.
- The target is already built with debug symbols. This skill does not build.
- Every path in the spec is absolute.

## Spec — trace

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

## Spec — sample

The sample driver sets no breakpoint. It sends `pause`, waits for the `stopped` event,
reads the stacks, and sends `continue`.

Every field is required. An unknown field is an error.

| Field | Type | Meaning |
|---|---|---|
| `mode` | `"launch"` or `"attach"` | As trace. |
| `program` | string | Launch only. Absolute path of the binary. |
| `pid` | positive integer | Attach only. Process id. |
| `cwd` | string | As trace. |
| `threads` | `"main"` or `"all"` | Which threads each sample records. `main` is the first thread of the `threads` response. |
| `delayMs` | positive integer | Wall time from the `configurationDone` response to the first `pause`. |
| `intervalMs` | positive integer | Wall time from the `continue` of one sample to the next `pause`. Required and unused when `maxSamples` is 1. |
| `maxSamples` | positive integer | The run ends at this sample count. 1 makes a probe. More makes a profile. |
| `stackDepth` | positive integer | Frames recorded per thread per sample. |
| `topRows` | positive integer | Rows per aggregate table. |
| `pauseTimeoutMs` | positive integer | Longest wait for the `stopped` event after one `pause`. |
| `timeoutMs` | positive integer | The run ends when this wall time passes. |

### Template

```json
{
  "mode": "launch",
  "program": "/absolute/path/to/binary",
  "cwd": "/absolute/path/to/source/root",
  "threads": "all",
  "delayMs": 2000,
  "intervalMs": 500,
  "maxSamples": 20,
  "stackDepth": 32,
  "topRows": 10,
  "pauseTimeoutMs": 8000,
  "timeoutMs": 60000
}
```

Probe: set `maxSamples` to 1. One fresh launch gives one stack at `delayMs`.

## Output

One line per fact, in the order the events arrive. A newline inside a value prints as
`\n`.

### Output — trace

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

### Output — sample

`PROCESS`, `OUTPUT`, `FRAME`, `EXITED`, `DRIVER ERROR` and `SPEC ERROR` are as in trace.
The sample driver prints no `TRACE` line.

| Line | Meaning |
|---|---|
| `SAMPLE <n> t=<ms> thread=<id> <name>` | One thread of sample n. `t` is the wall time, in ms, from the `configurationDone` response to the arrival of the `stopped` event. `dap.lua` stamps each message when it arrives. The pause is asynchronous, so `t` includes the pause latency. `<name>` is whatdbg's thread name and can be empty. |
| `FRAME #<i> <function> <file>:<line>` | A frame of the thread named by the last `SAMPLE` line. At most `stackDepth` frames. |
| `INCLUSIVE thread=<id> <count> <percent>% <function>` | Aggregate. Each function counts once per sample, wherever it is in the recorded frames. |
| `LEAF thread=<id> <count> <percent>% <function>` | Aggregate. Frame #0 only. |
| `END outcome=<outcome> samples=<n>` | Run end. `n` counts complete samples. |

Aggregate lines print after the last sample and before `END`, for each thread in order
of first appearance. `INCLUSIVE` rows come first, then `LEAF` rows. Each table holds at
most `topRows` rows, sorted by count high to low, ties by function name. `percent` is
`count` divided by the number of samples that recorded the thread. Aggregates count only
the frames recorded, so `stackDepth` limits them.

A run that fails still prints the samples taken and their aggregate. A `pause` with no
`stopped` event within `pauseTimeoutMs` ends the run with `outcome=error` and a `DRIVER ERROR` line.
A `stopped` event the driver did not ask for ends the run the same way.

Outcomes:

- `limit` — the sample count reached `maxSamples`. The driver then killed the debuggee.
- `timeout` — `timeoutMs` passed. The driver then killed the debuggee.
- `exited` — the debuggee ended by itself.
- `error` — see the `DRIVER ERROR` line. The driver then killed the debuggee.

Exit code (both drivers): 0 when the run happened. 2 when the spec is wrong.

## Limits

- whatdbg launch takes `program` and `cwd` only. No arguments. No environment.
- Breakpoints are `file:line` only. The sample driver sets none.
- Locals and expression results are whatdbg's own text. Nested values are not expanded.
  The driver prints every local whatdbg returns and filters nothing.
- `timeoutMs` bounds the wait for events after setup. Each setup request has its own
  fixed timeout.
- The debuggee is stopped while the sample driver reads stacks. This time does not enter
  `t`. It limits how many samples fit in `timeoutMs`. `stackDepth` and `threads` control it.
