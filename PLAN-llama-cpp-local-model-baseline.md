# PLAN: llama.cpp Local Model Baseline

**RFC:** none — objective from ARCHITECT prompt (2026-11-22). Context: `RFC-pi_cli_harness_and_housekeeper_primary_role_integration.md`, `PLAN-pi-cli-harness-and-housekeeper-primary-role-integration.md`, `~/Documents/Poems/dev/caroline/RFC-local-model-workers.md`.
**Date:** 2026-11-22
**BLESSED Compliance:** verified
**Language Constraints:** bash 3.2 (`/bin/bash`, macOS), pi 1.6.0 built-in `llama.cpp` provider, Homebrew `llama.cpp` 1.0.0
**Executor:** MACHINIST (direct execution, no Engineer)

## Overview

Replace Ollama with llama.cpp as the local model server for `housekeeper`. Then measure four model families, one model at a time, from the smallest total parameter count to the largest. The numbers answer one question for CAROLINE: can this machine run a local model under the CAROL protocol productively?

## ARCHITECT Directives (this session)

1. "delete ollama and all its models". "if llama path works, why would i need ollama anymore?" — Ollama goes fully: the formula, `~/.ollama`, and its pi config.
2. "ok brew" — install llama.cpp with Homebrew.
3. "at ~/.carol/models/ but gitignored" — the models folder.
4. "start from the smallest up to biggest params. but with proper infra" and "download model one by one, and get the number first".
5. "lower the model temperature" — the task is deterministic.
6. pi is temporary. CAROLINE is the goal, and it stays model-agnostic.

## Evidence Carried In

| Fact | Source |
|---|---|
| Ollama default tags are MLX `nvfp4` builds. Resident memory: `gemma4:e4b` 8.8 GiB, `qwen3.5:9b` 9.2 GB at a 16k context. | `ollama show`, `ollama ps`, `runner.go:233` log |
| The MLX runner prefills the whole prompt in one batch, and Ollama has no chunk setting for it. A 4303-token prompt failed with a Metal out-of-memory error, even with 6.9 GiB of system memory free. | `prefix_cache.go:151`, `sched.go:651` logs; Librarian (binary strings) |
| A 9.2 GB model on the GPU slowed END and almost corrupted its Vulkan rendering. The GPU wired limit is 12713115648 bytes. | ARCHITECT, this session; `caroline/RFC-local-model-workers.md:44` |
| The pi provider ID is `llama.cpp`, at `http://127.0.0.1:9931`, set through `LLAMA_BASE_URL`. | `dist/extensions/llama/provider.js:6-13` |
| pi reads the context window from the server (`n_ctx` or `-c`), and the API is `openai-completions`. | `provider.js:41-48, 102` |
| The Homebrew formula installs `llama` and the `llama-*` tools. | `llama.cpp.rb:74, 79` |
| Hybrid models (Qwen3.5) need `--ctx-checkpoints` to reuse a partly cached prompt. | `docs/llama-cpp.md:113` |
| `qwen3.5:9b` on Ollama, full CAROL prompt, 16k context: report task correct (161 s). Token task: it skipped the baseline commit, so the gate blocked it (120 s). Banner task: timed out (420 s). | `scratchpad/t11/bench.out` |

## Framework Inventory

### 1. API

| Need | Module | API | Source | Step |
|---|---|---|---|---|
| Remove Ollama | Homebrew | `brew uninstall ollama` | `brew list --versions ollama` → 0.40.15 | 1 |
| Install the server | Homebrew | `brew install llama.cpp` | `brew info llama.cpp` → stable 1.0.0 (bottled) | 3 |
| Serve models from a folder | llama.cpp | `llama serve --models-dir`, `--models-preset`, `--no-models-autoload` | `docs/llama-cpp.md:23-52` | 3, 5 |
| Raw throughput | llama.cpp | `llama-bench` | formula bin set | 6 |
| Context, batches, KV, flash attention | llama-server | `-c`, `-b`, `-ub`, `-ctk`, `-ctv`, `-fa` | `llama-server --help` (Ollama's bundled copy); Librarian, server README | 4 |
| Thinking off | llama-server, pi | `--reasoning-budget 0` or `-rea off`; pi `--thinking off` | Librarian; `cli.md:72` | 4, 6 |
| Temperature | llama-server | `--temp` | to verify in Step 3 | 4 |
| Prompt reuse | llama-server | `--cache-reuse`, `--ctx-checkpoints` | Librarian; `llama-cpp.md:113` | 4 |
| pi provider | pi | `--provider llama.cpp --model <id>`, `LLAMA_BASE_URL` | `provider.js:6-13, 83` | 5 |
| Model download | Hugging Face | `https://huggingface.co/<repo>/resolve/main/<file>`; the size from `/api/models/<repo>/tree/main` | HF API reads this session | 6 |

### 2. Pattern usage

| Pattern | Exemplar | Step |
|---|---|---|
| Spawn the server only when it is absent; stop only the spawned PID; one `trap cleanup EXIT` | `pi/bin/housekeeper` | 5 |
| One warm server for a batch of runs; never reload per request | lesson from `t9`, `t10` (70 GB of reloads) | 6 |
| Gitignored machine-local asset folder | `.gitignore:29-33` (`providers/`) | 2 |
| Fixture repo copied per run; ground truth from a deterministic transform | `scratchpad/t11/template`, `t11/expected` | 6 |

### 3. Names

| Name | Family | Step |
|---|---|---|
| `~/.carol/models/` | ARCHITECT directive 3 | 2, 6 |
| `LLAMA_URL` (in `housekeeper`) | `LLAMA_BASE_URL` (`provider.js:9`) | 5 |
| Preset file in `pi/` | name and format follow the `--models-preset` docs read in Step 3 | 4 |

### 4. Synthesis

| Rule | Form | Step |
|---|---|---|
| SSOT | The server preset holds the context, sampling, and batch settings once. pi reads the context from the server (`provider.js:41-48`). `models.json` no longer holds a context value. | 4, 5 |
| Bound | `housekeeper` owns only the `llama serve` process it spawned. | 5 |
| No magic values | Named constants in `housekeeper`. Preset values in one file. | 4, 5 |
| Deterministic | Temperature 0 and thinking off on the server. | 4 |

### 5. Absence

| Need | Proof | Step |
|---|---|---|
| Ollama after this plan | ARCHITECT directive 1 | 1 |

## Validation Gate

MACHINIST validates each step before the next step, against MANIFESTO.md, NAMES.md, CODING.md, the Inventory rows, and the directives above. @Auditor runs once, after Step 5, on the repo changes. Step 6 is measurement only. ARCHITECT, 2026-11-22: "skip auditor". This session has no Auditor agent type.

## Steps

### Step 1: Remove Ollama
**Scope:** Homebrew, `~/.ollama`, `~/.pi/agent/models.json`, `~/.pi/agent/settings.json`, `~/.pi/agent/npm`
**Action:**
1. `brew uninstall ollama`.
2. `rm -rf ~/.ollama` (26 GB of models, plus `config.json`, `history`, and the key pair).
3. Delete `~/.pi/agent/models.json`. It holds only the `ollama` provider.
4. Remove the Ollama package with pi's own command: `npm:@ollama/pi-web-search`. Read the exact remove command from `pi --help` first.
5. In `settings.json`, remove `defaultProvider`, `defaultModel`, and the package entry. Replace `compaction.modelOverrides["ollama/gemma4:e4b"]` with a global `compaction.reserveTokens 8192` and `keepRecentTokens 4096` (locked PLAN Decision 2 values; every local model uses the same 32k context).
**Validation:**
- `command -v ollama` is empty.
- `~/.ollama` is absent.
- `jq` parses `settings.json`.
- `pi --version` runs.

### Step 2: Make the models folder
**Scope:** `~/.carol/.gitignore`, `~/.carol/models/`
**Action:** Add `/models/` to `.gitignore` with a comment line, in the style of `.gitignore:29-33`. Create `~/.carol/models/`.
**Validation:** `git status --porcelain` does not list `models/`.

### Step 3: Install llama.cpp and read its CLI
**Scope:** Homebrew
**Action:**
1. `brew install llama.cpp`.
2. Read `llama --help`, `llama serve --help`, `llama-bench --help`, and the `--models-preset` file format.
3. Confirm each flag in the API table: `--models-dir`, `--models-preset`, `-c`, `-ub`, `-ctk`, `-ctv`, `-fa`, `--temp`, `--reasoning-budget`, `--cache-reuse`, `--ctx-checkpoints`, `--host`, `--port`.
**Validation:** Each flag exists in the installed `--help`. A missing flag is a finding. Stop and report it.

### Step 4: Write the server preset
**Scope:** one preset file in `~/.carol/pi/` (name and format from Step 3)
**Action:** One preset per model file, with the same settings for every model:
- `-c 32768` (locked PLAN Decision 2)
- `-ub 512`
- `-ctk q8_0 -ctv q8_0 -fa on`
- `--temp 0`
- thinking off on the server
- `--cache-reuse` on
- `--ctx-checkpoints` for the Qwen3.5 entries

Each value is written once, in this file.
**Validation:** `llama serve --models-dir ~/.carol/models --models-preset <file>` starts and `/health` answers. No model is loaded yet.

### Step 5: Rework `housekeeper` for llama.cpp
**Scope:** `pi/bin/housekeeper`, `agents/housekeeper.md`, `PLAN-pi-cli-harness-and-housekeeper-primary-role-integration.md`
**Action:**
1. Replace the Ollama block:
   - When `$LLAMA_URL/health` fails, spawn `llama serve --models-dir "$CAROL_ROOT/models" --models-preset <file> --host 127.0.0.1 --port 9931` and record its PID.
   - Wait for `/health`.
   - Export `LLAMA_BASE_URL`.
2. Run `pi --provider llama.cpp --model "$PI_MODEL" --thinking off …`.
3. Remove the `jq` context read and the `OLLAMA_*` constants.
4. `PI_MODEL` defaults to the first model in Step 6 until ARCHITECT picks one from the numbers. `CAROL_PI_MODEL` overrides it.
5. Mark the Ollama-specific parts of the earlier plan as superseded by this plan: Step 5, Decision 2 (its override key), and Risk 1.
6. `housekeeper.md` `model:` stays as it is until ARCHITECT picks a model.
7. Compose the prompt from the HOUSEKEEPER core of CAROL.md (Locked Decision 1), extracted by heading with `awk`, then `output-styles.md`, `pi/HARNESS.md`, and `agents/housekeeper.md`.
**Validation:**
- `bash -n`.
- A `housekeeper --print` probe against Qwen3.5-4B answers.
- `pgrep -fl "llama serve"` is empty after exit, when `housekeeper` spawned the server.
- The gate probes pass (git scope, dirty write, tracker write, commit flip).

### Step 6: Measure, one model at a time

> **Halted by ARCHITECT, 2026-11-22** ("stop then. expecting it to figure out itself are wasting time. must be determistic from the get go"). It continues as Phases C and D of `PLAN-housekeeper-deterministic-loop.md`.

**Scope:** `~/.carol/models/`, scratchpad harness. Run unattended, on ARCHITECT's signal.
**Order (total parameters, `ollama show`):**
1. Qwen3.5-4B Q4_K_M (2.74 GB)
2. Gemma 4 E2B Q4_K_M (3.10 GB)
3. Gemma 4 E2B Q8_0 (5.04 GB)
4. Gemma 4 E4B Q4_K_M (4.97 GB)
5. Qwen3.5-9B Q4_K_M (5.68 GB)

All files come from `unsloth/<model>-GGUF`.

**Action, per model:**
1. Download the GGUF into `~/.carol/models/`. Check that the byte size equals the size from the HF API. Add an empty `[<model id>]` section to `pi/models-preset.ini`. pi lists an unloaded model only when its `source` is `preset` (`provider.js:16-24`). An empty section named after a `--models-dir` model makes it a preset.
2. `llama-bench`: prefill tok/s at 512 and 4096 tokens, decode tok/s at 128 tokens, with `-fa on`.
3. Start one warm `llama serve` with the preset. Record from the load log:
   - the weights, KV, and compute buffer sizes
   - the free memory reported during the runs
4. Run the 3 HOUSEKEEPER tasks (report, alternative tokens, namespace banners), 3 repeats each. Use `housekeeper --mode json --no-session` on a fresh fixture copy, with a 420 s cap per run. Record:
   - **report:** lines 8 and 10 found, no edit
   - **edit tasks:** exact match with `t11/expected`, tree-sitter exit code, baseline commit made before the edit, tool sequence
   - **all tasks:** wall time; prefill time cold (repeat 1) and cached (repeats 2-3); stability (the same `module.cpp` hash across repeats)
5. Stop the server. Append the model's row to the results section of `caroline/RFC-local-model-workers.md` (Locked Decision 2), and report it in chat. Then go to the next model.
**Validation:** Each number comes from a log line or a file. Nothing is estimated.

## BLESSED Alignment

- **Bound:**
  - `housekeeper` owns only the server it spawned.
  - The benchmark owns one warm server per model.
  - Nothing reloads per request.
- **Lean:** Ollama and its 26 GB are gone. One server binary, one preset file.
- **Explicit:** Each preset value is visible in one file. Each benchmark number cites its log.
- **SSOT:** The context size lives once, in the server preset, and pi reads it from the server.
- **Stateless:** Each run starts from a fresh fixture copy.
- **Encapsulation:** The pi-specific parts stay in `pi/`. The models stay in `models/`, outside git.
- **Deterministic:**
  - temperature 0
  - thinking off
  - fixed fixtures with known ground truth
  - stability measured across repeats

## Locked Decisions (ARCHITECT, 2026-11-22)

1. **"core CAROL tailored specifically for housekeeper role."**
   - `housekeeper` extracts the HOUSEKEEPER core from CAROL.md by section heading when it composes the prompt. CAROL.md stays the only copy of the text (SSOT).
   - The heading list is one named constant in `housekeeper`.
   - Kept sections:
     - Writing Standard
     - Ground of Truth (PROTOCOL LEVEL)
     - Protocol Principles
     - Scope
     - Code Contract (STRICT)
     - Destructive-Edit Discipline
     - Instruction Hierarchy, without its `/ode` subsection
   - Left out:
     - Git: `housekeeper.md` holds HOUSEKEEPER's git list, and `carol-gate.ts` enforces it.
     - Roles, Gates, Documentation, Subagent Model, Subagent Return Format, Doxygen, Debugging, Profiling: COUNSELOR, subagent, and LSP workflows that HOUSEKEEPER does not run.
     - Voice, DCF, Constructive Challenge, Refactor-Rewrite, Build, Build Environment, Code Hygiene.
   - The prompt is the core, then `output-styles.md`, `pi/HARNESS.md`, and `agents/housekeeper.md`.
   - Step 5 implements it. Step 6 uses it for every model.
2. **The numbers go to `~/Documents/Poems/dev/caroline/RFC-local-model-workers.md`, in a results section.** Step 6.5 appends each model's row there and in chat.
   - **Superseded, 2026-11-22:** the results go to `caroline/MACHINIST-REPORT-local-model-benchmark.md`, and the open-ended run is dropped. See `PLAN-housekeeper-deterministic-loop.md`, Locked Decision 3.
3. **Open items from the earlier plan:** Step 9.6 (ARCHITECT's interactive exit test) and Step 9.7 (Auditor) move to the end of Step 5.
