---
name: profile
description: Measure code with scout, the statistics and gate lane of four measurement lanes. A manifest names the command, the epochs and the baseline. scout runs the command once per epoch, reads the samples file that the command writes, and writes one generated markdown report with the median, the spread and the change from the baseline. Use when COUNSELOR delegates a profile run to Pathfinder. Pathfinder runs scout with the given manifest path and returns the exit code, the stderr and the report verbatim. Pathfinder never writes the manifest and never writes a workload. scout builds the target from the manifest's toolchain table.
---

# profile

scout is *Systematic Context Observer for Unit Telemetry*. The method is fixed: a fixed
workload, a fixed protocol, fixed statistics, and a generated report. A timing value is
not deterministic. Each value carries its stated spread.

scout is a console binary (`dev/scout/`). It is on PATH. It contains no workload. The
workload is a command in the profiled project. scout runs that command once for each
epoch.

## Lanes

Four lanes answer four questions. Each lane has its own tool.

| Lane | Tool | What is rebuilt | Question it answers | What it may not claim |
|---|---|---|---|---|
| Where | whatdbg `sample`, attach by pid (trace skill) | the target (names resolve without debug symbols) | Which functions are hot on each thread? | Throughput or wall time. The driver pauses the process. |
| How long | zones compiled into the target's profile build | the target only | How long does each stage take, per call? | Kernel time of a child process. |
| Statistics and gate | scout | the target, through the manifest's `## toolchain` table | Median, spread, baseline, p-value. | Anything that no lane measured. |
| Verdict | scout `user` and `system` rows, or `time seq` | nothing | The number against endless. | Where the time goes. |

Rules:

1. One measurement at a time on the machine. A Where-lane epoch is its own scout run.
   It never runs during a How-long or a Verdict run. A parallel benchmark disturbs the other (ghostty
   `src/benchmark/AGENTS.md:29-30`).
2. A performance verdict needs a Release build. The report states the build type in its
   `RUN` table.
3. A finding names its lane. A "where" claim cites a Where-lane tally. A "how long" claim
   cites a report row. A "faster than endless" claim cites a Verdict number.

## Protocol

1. COUNSELOR owns the manifest. COUNSELOR decides the command, the epochs and the
   baseline, and writes the manifest file.
2. COUNSELOR puts the absolute manifest path and the expected duration in the Pathfinder
   delegation prompt. A live 100M epoch lasts about 65 s. Eleven epochs last about 12
   minutes. Pathfinder runs the command to completion before its report.
3. Pathfinder runs the one command below with that path, from the project root.
4. Pathfinder returns the exit code, the stderr, and the report file verbatim in EVIDENCE.
5. COUNSELOR reads the evidence and decides the next step.

Pathfinder does not edit the manifest. Pathfinder runs no build command of its own; the
build is part of the scout run. When scout prints a validation diagnostic, Pathfinder returns it under `Needs` and stops.

Build permission. ARCHITECT: *"profiling with scout is granted with build permission"*.
This is the standing request for every profile build: scout, the profiled target's
profile build, and the replay workload binary. COUNSELOR delegates or runs these builds
under this grant.

## Command

```
scout <absolute-manifest-path>
```

Run it in the foreground, from the folder that the toolchain rows assume (for EVE, the
project root).

| Command line | Result |
|---|---|
| `scout --help`, `scout`, `scout <manifest> --help` | The guide. Exit 0. |
| `scout --version`, `scout <manifest> --version` | `scout 0.1.0 (<commit>)`. Exit 0. |
| `scout missing.md` | The guide, and stderr `scout: not found: missing.md`. Exit 1. |

scout runs in this order. It parses and validates the manifest. It runs each `## toolchain`
row in order. Then, when a `## run` table exists, it runs the epochs and writes the report.
A manifest with no `## run` table runs the toolchain only.

Every stderr line is `scout: <message>` with a newline. On a terminal, scout clears the
screen first and prints `scout: Fine.` on success.

For each epoch scout deletes the samples file, runs `command <manifest-path>` with the
manifest folder as the working folder, and waits until the command ends. Then scout reads
the samples file.

| Exit code | Cause |
|---|---|
| `EXIT_SUCCESS` | Help, version, or every step passed. |
| `EXIT_FAILURE` | Missing manifest: the guide, then `scout: not found: <manifest file name>`. |
| `EXIT_FAILURE` | Validation failure: the diagnostic goes to stderr. |
| `EXIT_FAILURE` | Toolchain column missing: `scout: <path>:<line> (toolchain): toolchain column not declared`. |
| `EXIT_FAILURE` | Toolchain row failure: `scout: <command> <flag>: toolchain command failed`. No epoch runs. |
| `EXIT_FAILURE` | Unknown argument after the manifest: `scout: <argument>: unknown flag`. |
| `EXIT_FAILURE` | Missing baseline file: `scout: not found: <baseline path>`. |
| `EXIT_FAILURE` | Command failure: `scout: <command path>: command failed`. |
| `EXIT_FAILURE` | Missing samples file: `scout: not found: <samples path>`. |
| `EXIT_FAILURE` | Report not writable: `scout: <report path>: cannot write output`. |

Preconditions, all on COUNSELOR:

- `scout` is built with cast and is on PATH (Builds below).
- The manifest's `## toolchain` table builds the command. The command writes the samples file (Adding a workload below).
- Every path in the `run` table is relative to the manifest.
- Every path in a `## toolchain` row is relative to the folder that scout is called from.

## Manifest

A manifest is markdown with pandoc grid tables, the cast format. scout parses it with
`jam::ConfigDocument::parse` and validates it with `jam::ConfigValidator`.

Table `## run`, columns `key | type | value`:

| key | type | meaning |
|---|---|---|
| `epochs` | `int` | Number of epochs. Each epoch runs the command once. |
| `command` | `string` | The program to run, relative to the manifest. |
| `samples` | `string` | The file that the command writes in each epoch, relative to the manifest. |
| `output` | `string` | Report path, relative to the manifest. scout creates the folder. |
| `baseline` | `string` | Earlier report to compare with, relative to the manifest. Empty = no comparison. |

scout reads the `run` and `toolchain` tables. The other tables of the manifest belong to
the target. The target reads them (the `profiler` table in the sample below).

### toolchain

Table `## toolchain`, columns `command | flag`.

- Each row runs as one child process.
- The working folder is the folder that scout is called from.
- The output streams to stdout.
- Every row runs, in order. No flag selects rows.
- A failed row prints `scout: <command> <flag>: toolchain command failed` and exits with 1.
  No epoch runs.
- A header without both columns prints
  `scout: <path>:<line> (toolchain): toolchain column not declared`.

The `type` cell takes `int`, `float`, `bool`, `string`, `colour` or `numbers`. A C++ type
name such as `integer` fails validation.

### Template

```
## run

+----------+--------+--------------------------------------------------------------------------------+
| key      | type   | value                                                                          |
+==========+========+================================================================================+
| epochs   | int    | 11                                                                             |
+----------+--------+--------------------------------------------------------------------------------+
| command  | string | ../Builds/Profile/EVE_artefacts/Release/Standalone/EVE.app/Contents/MacOS/EVE  |
+----------+--------+--------------------------------------------------------------------------------+
| samples  | string | live-samples.md                                                                |
+----------+--------+--------------------------------------------------------------------------------+
| output   | string | live-report.md                                                                 |
+----------+--------+--------------------------------------------------------------------------------+
| baseline | string |                                                                                |
+----------+--------+--------------------------------------------------------------------------------+

## profiler

+-------+--------+----------------------+
| key   | type   | value                |
+=======+========+======================+
| shell | string | /bin/zsh             |
+-------+--------+----------------------+
| args  | string | -c "seq 1 100000000" |
+-------+--------+----------------------+

## toolchain

+---------+----------------------------------------------------------------------------------------------+
| command | flag                                                                                         |
+=========+==============================================================================================+
| cast    | ../jam/cast/spell.md                                                                         |
+---------+----------------------------------------------------------------------------------------------+
| cmake   | -S . -B Builds/Profile -G Ninja -DCMAKE_BUILD_TYPE=Release -DCAST_SIGN=OFF -DCAST_PROFILE=ON |
+---------+----------------------------------------------------------------------------------------------+
| ninja   | -C Builds/Profile                                                                            |
+---------+----------------------------------------------------------------------------------------------+
```

Samples: `~/Documents/Poems/dev/eve/benchmark/live.md` (live epoch, 100M lines) and
`replay.md` (replay epoch, 1M lines). The input size is data: it sits in the `args` cell.

EVE under scout (profile and replay builds, `JAM_USING_PROFILER=1`):

1. EVE reads the manifest from its first command-line argument
   (`EVETerminalProcessor.cpp:41`). It opens the shell from the `profiler` table
   (`:170-180`).
2. EVE quits by itself when the shell exits (`EVETerminalProcessor.cpp:32-35`). The
   `EVEProcessor` destructor then drains the profiler and calls `writeSamples`
   (`EVEProcessor.cpp:58-68`). EVE does not read the `samples` key.
   `jam::Profiler::writeSamples` reads it (`jam_Profiler.cpp:159-161`).
3. In a build without `JAM_USING_PROFILER`, EVE registers no listener and does not quit
   (`EVETerminalProcessor.cpp:181-193`).

## Samples file

The target writes it. `jam::Profiler::writeSamples` is the one writer in the in-house
frameworks.

- One table `## <TYPE>`, one row for each zone. Columns: `key | type | value | calls | unit | bins`.
  `value` is the sum of the zone's durations in the epoch, in ns. `calls` is the sum of
  the bins. `bins` holds one count for each log bin of the call time: 64 bins for each
  octave, 40 octaves.
- A `dropped` row follows the zone rows. Its unit is `count`.
- A `## RUN` table follows. It holds `buildType`, `Debug` or `Release`.

## Report

The report is markdown. scout builds it with `ProfileReport`.

| Table | Content |
|---|---|
| `## <TYPE>` | One row for each zone. The value is the median time of one epoch. |
| `## <TYPE>_CALLS` | One row for each zone. The value is the median time of one call, from the merged bins of all epochs. |
| `## RUN` | The `buildType` of the target. |

Columns of a zone row:

| Column | Meaning |
|---|---|
| `key` | Row name. |
| `type` | `float`. |
| `value` | Median of the samples. |
| `errorPercent` | Error of the median, in percent. |
| `min`, `max` | Smallest and largest sample. |
| `calls` | Calls of the zone in one epoch. |
| `unit` | Unit of the samples, for example `ns`. |
| `samples` | The sample of each epoch. |
| `baseline` | With a baseline only: the baseline median. |
| `change` | With a baseline only: the change from the baseline. |
| `probability` | With a baseline only: the probability that the change is noise. A small value means the change is not noise. |

The `_CALLS` table has `bins` in place of `samples`, and one more column, `percentile`:
the 99.9th percentile of the merged bins. Its `value`, `errorPercent`, `min`, `max` and
`percentile` come from the merged bins of all epochs. Its `calls` is the number of calls
of all epochs.

The `## <TYPE>` table also has these rows:

| Row | Meaning |
|---|---|
| `epoch` | Wall time of one epoch, measured by scout. |
| `user` | User CPU time of the child in the epoch. macOS and Linux only. |
| `system` | System CPU time of the child in the epoch. macOS and Linux only. |
| `dropped` | Entries that the target lost, because a thread had no slot or its ring was full. |

`user` and `system` come from `getrusage (RUSAGE_CHILDREN)` before and after the epoch.
They are the Verdict-lane numbers.

The report has one median mermaid `xychart-beta` for each unit. It also has one
distribution chart for each zone of the `_CALLS` table. The x axis is the lower edge of
the octave, in ns.

Every row holds one sample for each epoch. A row absent from an epoch adds 0.

The report is also the next baseline. The same parser reads it back.

Zones in the EVE chain:

| Zone key | Function |
|---|---|
| `deviceClock` | the `onBytesReady` lambda in `EVEProcessor` (`EVEProcessor.cpp:37`). It covers `device.clock (0)`. |
| `ttyBytesReady` | `TerminalUnixTTY` read handler, around `onBytesReady()` (`jam_TerminalTTY_posix.cpp:219`) |
| `terminalProcess` | `jam::TerminalProcessor::process` (`jam_TerminalProcessor.cpp:34`) |
| `terminalRead` | `jam::TerminalProcessor::read`, around `tty.read` (`jam_TerminalProcessor.cpp:71`) |
| `swapLiveLines` | `jam::TerminalSwap::setLiveLines` (`jam_TerminalSwap.cpp:67`) |
| `swapHistoryLines` | `jam::TerminalSwap::writeFromTerminalBuffer` (`jam_TerminalSwap.cpp:95`) |
| `editorLanes` | `jam::TextEditor::addLanes()` (`jam_TextEditor.cpp:796`) |

`VirtualDevice::clock` has no zone of its own. `deviceClock` covers it from the caller.
The Q_B history writer has no zone of its own. `swapHistoryLines` covers its work. The
async path `VirtualDevice::handleAsyncUpdate` calls `clock (0)` with no zone.

## Builds

All commands run in the project directory.

| Need | Command | Source |
|---|---|---|
| scout | `cast cast/spell.md --no-sign` (Release) | `scout/project-info.md` `## toolchain` |
| scout, quick check | `cast cast/spell.md --debug` | same |

The profiled target builds inside the scout run, from the `## toolchain` table of its
manifest. cast and `project-info.md` carry no profile or replay row. The EVE manifests
use these build folders and CMake options:

| Manifest | Build folder | Extra CMake options |
|---|---|---|
| `live.md` | `Builds/Profile` | `-DCAST_PROFILE=ON` |
| `replay.md` | `Builds/Replay` | `-DCAST_PROFILE=ON -DCAST_REPLAY=ON` |

scout is built once, when scout itself changes. A change in the profiled project rebuilds
that project only.

A Debug build gives Debug timings. Only a Release build gives a performance verdict.

## Adding a workload

This work is COUNSELOR's. It is not part of a Pathfinder run.

1. A workload is a command in the profiled project. It is not a class in scout. The
   command takes the manifest path as its one argument, runs one epoch, writes the
   samples file named by the `samples` key, and exits with 0.
2. Add a zone where the code needs one: `const jam::Profiler::Zone zone { Id::<key> };`
   under `#if JAM_USING_PROFILER`. The key goes in the module's `cast/<module>.md`
   identifiers. A project zone goes in the project's identifier table.
3. The target writes the samples file with `jam::Profiler::writeSamples`, after
   `drain()`.
4. Write a manifest next to the project's benchmark results (`eve/benchmark/`).

## Limits

- `scout` resolves a relative manifest path against the working directory. Use an
  absolute path.
- `user` and `system` count the children that the epoch reaped. In a live EVE run, `seq`
  is a descendant of EVE, and on macOS the TTY child first tries to start through
  `/usr/bin/login` (`jam_TerminalTTY_posix.h:24`). The first live run (2026-10-28, 100M,
  11 epochs, Release) gave these medians: `epoch` 6.7365e10 ns, `user` 9.4932e10 ns,
  `system` 8.9613e10 ns. `time seq 1 100000000 > /dev/null` gave 10.53 s user, 0.03 s
  system, 10.561 s total. The `user` and `system` rows include the time of EVE itself, so
  this comparison does not isolate `seq`. Whether `RUSAGE_CHILDREN` includes the `seq`
  grandchild is still not verified.
- The profiler has 64 thread slots (`jam_Profiler.h:111`) and 65536 entries per ring. An
  entry that finds no slot or a full ring adds 1 to the `dropped` row. A `dropped` value
  above 0 means the zone sums are low.
- The EVE profile build has no debug symbols. `debugSymbols` is Debug only
  (`eve/project-info.md`, `## compile option`). Function names resolve without `-g`. A file:line location needs `-g`.
- In a Where-lane report, the `epoch`, `user` and `system` rows include the debugger pauses. They are not timings of the target.
- The replay workload records its input with `seq`. Windows has no `seq` on PATH by
  default. This is not verified.
- `ProfileReport` wraps the `samples` column at 40 characters. In each report one row's
  cell stays unwrapped. The round trip is still exact.
