---
name: profile
description: Measure code with scout, the one deterministic profiler. A manifest names the benchmarks, the epochs and the baseline. One run writes one generated markdown report with the median, the spread and the change from the baseline. Use when COUNSELOR delegates a profile run to Pathfinder. Pathfinder runs scout with the given manifest path and returns the exit code, the stderr and the report verbatim. Pathfinder never writes the manifest, never builds and never writes a benchmark.
---

# profile

scout is *Systematic Context Observer for Unit Telemetry*. It replaces the hand-written
harness that each optimisation round needed. The method is fixed: a fixed input, a fixed
protocol, fixed statistics, and a generated report. A timing value is not deterministic.
Each value carries its stated spread.

scout is a console binary (`dev/scout/`). It is on PATH.

## Protocol

1. COUNSELOR owns the manifest. COUNSELOR decides which benchmarks run, the epochs and the
   baseline, and writes the manifest file.
2. COUNSELOR puts the absolute manifest path in the Pathfinder delegation prompt.
3. Pathfinder runs the one command below with that path.
4. Pathfinder returns the exit code, the stderr, and the report file verbatim in EVIDENCE.
5. COUNSELOR reads the evidence and decides the next step.

Pathfinder does not edit the manifest. Pathfinder does not build. When scout prints a
validation diagnostic, Pathfinder returns it under `Needs` and stops.

## Command

```
scout <absolute-manifest-path>
```

Run it in the foreground. scout takes one argument. Any other argument count prints the
embedded help and exits with `EXIT_FAILURE`.

| Exit code | Cause |
|---|---|
| `EXIT_SUCCESS` | Every benchmark passed and the report was written. |
| `EXIT_FAILURE` | A manifest validation failure (the diagnostic goes to stderr as `path:line (column)`), a benchmark failure, or a report that could not be written (its path goes to stderr). |

Preconditions, all on COUNSELOR:

- `scout` is built with cast and is on PATH (Builds below).
- Every path in the manifest is relative to the manifest.

## Manifest

A manifest is markdown with pandoc grid tables, the cast format. scout parses it with
`jam::ConfigDocument::parse` and validates it with `jam::ConfigValidator`.

Table `## run`, columns `key | type | value`:

| key | type | meaning |
|---|---|---|
| `epochs` | `int` | Number of epochs each benchmark runs. |
| `seed` | `int` | Seed of the `juce::UnitTestRunner` run. |
| `output` | `string` | Report path, relative to the manifest. |
| `baseline` | `string` | Earlier report to compare with, relative to the manifest. Empty = no comparison. |

The `type` cell takes `int`, `float`, `bool`, `string`, `colour` or `numbers`. A C++ type
name such as `integer` fails validation.

Table `## benchmark`, column `name`: one registered benchmark name per row. One exists:
`Terminal`.

### Template

```
## run

+----------+---------+---------------+
| key      | type    | value         |
+==========+=========+===============+
| epochs   | int     | 11            |
+----------+---------+---------------+
| seed     | int     | 0             |
+----------+---------+---------------+
| output   | string  | eve-report.md |
+----------+---------+---------------+
| baseline | string  |               |
+----------+---------+---------------+

## benchmark

+----------+
| name     |
+==========+
| Terminal |
+----------+
```

Sample: `~/Documents/Poems/dev/scout/eve.md`.

## Report

The report is markdown. `jam::ProfileReport` builds it.

- One `## <BENCHMARK>` heading and one grid table for each benchmark. The heading is the
  benchmark name in SCREAMING_SNAKE_CASE, for example `## TERMINAL`.
- One row for each zone. Columns:

| Column | Meaning |
|---|---|
| `key` | Zone key. |
| `type` | `float`. |
| `value` | Median, over the epochs, of the zone's total time in one epoch, in ns. |
| `errorPercent` | Median absolute deviation of the epoch values, as a percent of the median. |
| `min`, `max` | Shortest and longest epoch value, in ns. |
| `calls` | Calls of the zone in one epoch. |
| `samples` | Every epoch value, in ns. |
| `baseline` | With a baseline only: the baseline median. |
| `change` | With a baseline only: (median − baseline) / baseline × 100. |
| `probability` | With a baseline only: two-sided Mann–Whitney U p-value. A small value means the change is not noise. |

- Every benchmark also reports two rows. `epoch` is the whole epoch. `zone` is the probe's
  own cost: `calls` empty zones per epoch, so the cost of one zone is `value / calls`.
- One mermaid `xychart-beta` bar chart of the medians for each benchmark.
- The report is also the next baseline. The same parser reads it back.

Zones in the EVE chain:

| Zone key | Function |
|---|---|
| `terminalProcess` | `jam::TerminalProcessor::process` |
| `swapLiveLines` | `jam::TerminalSwap::setLiveLines` |
| `swapHistoryLines` | `jam::TerminalSwap::writeFromTerminalBuffer` |
| `editorLanes` | `jam::TextEditor::addLanes()` |

## Builds

All commands run in the project directory.

| Need | Command | Source |
|---|---|---|
| scout for a verdict | `cast cast/spell.md --no-sign` (Release) | `scout/project-info.md` `## toolchain` |
| scout for a quick check | `cast cast/spell.md --debug` | same |
| EVE live profile | `cast cast/spell.md --profile` (Release, `CAST_PROFILE=ON`, `JAM_USING_PROFILER=1`) | `eve/project-info.md` `## toolchain` |

A Debug build gives Debug timings. Only a Release build gives a performance verdict.

The EVE live profile writes `profile.md` in the EVE settings directory when the processor
is destroyed. Its samples are one value per call, not per epoch.

## Adding a benchmark

This work is COUNSELOR's. It is not part of a Pathfinder run.

1. Subclass `jam::Benchmark` (`jam_unit_test/benchmark/jam_Benchmark.h`). Implement
   `runEpoch()` (one epoch of the fixed input) and `getOutput() const` (the epoch's output,
   compared on every epoch).
2. Record the fixed input once in `initialise()`. The sibling is `TerminalBenchmark`.
3. Own the instance in `scout/Source/Main.cpp` `main`, next to `TerminalBenchmark
   terminalBenchmark;`. A `juce::UnitTest` registers itself while it lives.
4. Add a zone where the code needs one: `const jam::Profiler::Zone zone { Id::<key> };`
   under `#if JAM_USING_PROFILER`, with the key in that module's `cast/<module>.md`
   identifiers.

## Limits

- `scout` resolves a relative manifest path against the working directory. Use an absolute
  path.
- The `Terminal` benchmark records its input with `seq`. Windows has no `seq` on PATH by
  default. This is not verified.
- `ProfileReport` wraps the `samples` column at 40 characters. In each report one row's
  cell stays unwrapped. The round trip is still exact.
- `jam_profiler` and `jam_unit_test` are `kernel` modules of jam. KANJUT does not carry
  them yet.
