# PLAN: pi CLI Harness and HOUSEKEEPER Primary Role Integration

**RFC:** RFC-pi_cli_harness_and_housekeeper_primary_role_integration.md
**Date:** 2026-11-21
**Status:** SUPERSEDED (2026-11-28) — Ollama and deleted Lua skills are replaced. Read `HANDOFF-housekeeper.md` for current state.
**BLESSED Compliance:** verified
**Language Constraints:** bash 3.2 (`/bin/bash`, macOS), TypeScript pi extension (`@earendil-works/pi-coding-agent` 1.6.0), Markdown contract documents
**Executor:** MACHINIST (direct execution, no Engineer)

## Overview

Add `housekeeper`, a pi launcher that starts `ollama serve` when it is absent and stops it at exit. Add the `HOUSEKEEPER` primary role, the `carol-gate.ts` pi extension, and two skills. HOUSEKEEPER runs bounded, syntax-only clean-up campaigns on large C++ codebases with a local model. The RFC objective holds. This plan corrects the RFC citations and mechanisms that a read or a test disproved.

## Verification of RFC Claims

Each RFC claim was read or run in this session. Status: **holds**, **corrected**, or **false**.

### Research Summary

| # | RFC claim | Status | Evidence |
|---|---|---|---|
| 1 | Secondary harnesses live in `agy/` and `opencode/` | holds | `ls ~/.carol` |
| 1 | Each harness has a `HARNESS.md` (`opencode/HARNESS.md:1-38`) | corrected | `opencode/HARNESS.md` has 35 lines. `agy/HARNESS.md` does not exist. |
| 1 | `agy/bin/agycarol:1-92` | corrected | the file has 90 lines |
| 1 | OpenCode loads its HARNESS.md | holds | `opencode/opencode.jsonc:11` |
| 2 | Primaries at `CAROL.md:83-94` | holds | `CAROL.md:83-93` |
| 2 | MACHINIST runs without a scaffold (`bin/carol:423-432, 570-577`) | corrected | `bin/carol:1060-1068` (`_launch_machinist`), `bin/carol:1131-1137` |
| 2 | Primary exclusion from project subagent symlinks (`bin/carol:136-138`) | corrected | `bin/carol:210` (stale-link removal), `bin/carol:227` (skip in the symlink loop) |
| 2 | `CAROL_ROLE` export and `.carol-role` write (`bin/carol:574-575`) | corrected | `bin/carol:1067-1068`, `1174-1175`, `1198-1199` |
| 3 | `carol apply` at `bin/carol:475-545` | corrected | `cmd_apply` at `bin/carol:956-1014`, helpers at `918-955` |
| 3 | apply prints a diff, checks N, backs up, writes, restores on failure | holds | `bin/carol:990-1013`. Test T5: 2 of 2 lines applied; a mismatch wrote nothing. |
| 3 | `CAROL.md:277-281` mandates `carol apply` | corrected | `CAROL.md:310-332` (Destructive-Edit Discipline, hook text at 329-332) |
| 4 | `JUCE.clang-format:31-48, 129, 146, 161` | corrected | `~/.config/nvim/clang-format/JUCE.clang-format`: `BreakBeforeBraces: Allman` :35, `FixNamespaceComments: false` :136, `PointerAlignment: Left` :146, `Standard: c++17` :164 |
| 4 | Namespace rules at `CODING.md:487-534` | corrected | `## NAMESPACES` at `CODING.md:612-668`; `## CONTROL FLOW` at 672 |
| 4 | Enclosure exemplar `jam_ModelUtils.cpp:1-3, 250-251` | corrected | open banner at :1-3, close banner at :313-314 |
| 5 | `install.sh:113-122` symlinks carol, oracle, machine | corrected | `setup_path` at `install.sh:114-130`, `ln -sf` at 121-123 |
| 6 | `~/.pi/agent/SYSTEM.md` replaces the prompt; `.pi/SYSTEM.md` overrides it; they do not combine | holds | `configuration.md:19, 32, 39` |
| 6 | AGENTS.md and CLAUDE.md load into `<project_context>` unless `--no-context-files` | holds | `cli.md:216-217`; `dist/core/system-prompt.js:98-99` |
| 6 | Default tools `read, bash, edit, write`; optional `grep, find, ls`; no LSP tool | holds | `cli.md:130, 150-151`; no LSP tool in the docs |
| 6 | Auto-compaction at `contextTokens > contextWindow - reserveTokens`, reserve 16384 | holds | `compaction.md:32-35`; `settings.md:74` |
| 6 | `OLLAMA_CONTEXT_LENGTH=32768` gives a 32768 window | holds | Test T6: `ollama ps` shows `CONTEXT 32768` |
| 6 | That window gives a 16384-token working budget | false | The budget includes the system prompt (about 9k tokens, see below). `keepRecentTokens` defaults to 20000 (`compaction.md:435`), which is above the threshold. |
| 6 | Extensions intercept `tool_call` (block or mutate), `before_agent_start`, `session_before_compact`; `ctx.compact()` exists | holds | `extensions.md:364, 534, 615, 973-1004, 1288` |
| 6 | Skills in `~/.pi/agent/skills/<name>/SKILL.md`, loaded by `/skill:<name>` or description | holds | `configuration.md:21`; `skills.md:42-46` |

### Scaffold and Mechanism Claims

| RFC element | Status | Evidence |
|---|---|---|
| `exec pi` with `trap cleanup_ollama EXIT` stops the spawned Ollama | false | Test T1: after `exec`, the EXIT trap does not run. A child process plus the EXIT trap runs it. |
| `trap … EXIT INT TERM` | corrected | Test T1b (bash 3.2): the EXIT trap alone runs on HUP, INT, and TERM. The extra INT/TERM traps run cleanup without exit. |
| Kill of `ollama serve` frees the model memory | holds | Test T6: after the kill, `pgrep -fl ollama` gives none. The `mlx` runner (9.4 GB) also stopped. |
| `import type { ExtensionAPI } from "@mariozechner/pi-coding-agent"` | false | The package is `@earendil-works/pi-coding-agent` (`extensions.md:73`). Test T6 loaded it. |
| `models.json.tmpl` copied when `models.json` is absent | false | `~/.pi/agent/models.json` exists, so the copy never runs. It lists `gemma4:e4b` with `contextWindow: 131072`. |
| Git gate `^git\s+(status\|…)` | false | It checks only the start of the command. `git status && git push` passes. Test T6 with the corrected gate blocked it. |
| `cleanBaselineEstablished = true` in `tool_call` on `git commit` | false | `tool_call` runs before execution (`extensions.md:975`). A failed commit opens the gate. |
| A blocked call returns a reason to the model | holds, incomplete | Test T6: `gemma4:e4b` reported "created successfully" for a blocked write and "executed" for a blocked `sed -i`. A blocked call must end the run: `terminate: true` (`extensions.md:987-988`). |
| `--system-prompt` keeps the pi tool list | false | With a custom prompt, pi drops its tool list, rules, and docs. It keeps the addendum, project context, skills, and cwd (`system-prompt.js:78-111`). HARNESS.md must name the pi tools. |
| `tree-sitter` scans C++ | corrected | The CLI has no config and no grammar cache. Test T4: `tree-sitter parse --lib-path ~/.local/share/nvim/site/parser/cpp.so --lang-name cpp` parses, and exits 1 on an `ERROR` node. `tree-sitter query` with the same flags captures the namespace open banner. |
| SOP step "run `/compact`" | false | `/compact` is a user command. The model has only the tools `read, bash, edit, write, grep, find, ls`. Pi auto-compaction or ARCHITECT runs it. |
| Close banner is "29-underscore" | corrected | `jam_ModelUtils.cpp:313`: `/**` + 29 `_` + `END OF NAMESPACE` + 30 `_` + `*/`, 80 columns. Open banner: `/*` + 76 `_` + `*/`, 80 columns (:3). |
| HOUSEKEEPER in `agents/` is excluded from project subagents only by `bin/carol` | incomplete | The OpenCode plugin reads every `~/.carol/agents/*.md` (`opencode/plugins/carol/source.js:111-126`) and updates each ID (`index.js:142-152`). The agy harness uses its own copies (`agy/install.sh:25`), so a new file does not reach agy. |
| `.carol-role` write | holds | Sibling pattern (`agy/bin/agycarol:87-88`). `hooks/register.js:56-60` reads the file only when `CAROL_ROLE` is unset. |

### Test Log (this session, scratchpad)

| ID | Test | Result |
|---|---|---|
| T1 | `exec` with an EXIT trap, and a child with an EXIT trap | exec: no trap. Child: trap runs. |
| T1b | EXIT trap under HUP, INT, TERM, bash 3.2 | cleanup runs in all three |
| T4 | tree-sitter parse and query with the nvim `cpp.so` | parse exit 0; broken file exit 1 with `ERROR`; banner captured |
| T5 | `carol apply --expect 2`, then `--expect 5` on a 1-line change | applied; mismatch wrote nothing |
| T6 | Spawn `OLLAMA_CONTEXT_LENGTH=32768 ollama serve`; `pi --print --system-prompt -e gate.ts`; kill | role `HOUSEKEEPER` from the custom prompt; `CONTEXT 32768`; git-scope blocked; dirty write blocked; tracker write allowed; `sed -i` blocked; no Ollama process after the kill |

Not tested yet (Step 9 tests them):
- the clean-tree path, and the gate flip after a commit (needs `git init` and `git commit` in a scratch repo)
- the interactive TUI exit through `housekeeper`

### Token Budget (estimate, chars/4)

| Part | Tokens |
|---|---|
| `CAROL.md` | ~5450 |
| `output-styles.md` | ~1280 |
| `agents/housekeeper.md` | ~1000 |
| `pi/HARNESS.md` | ~500 |
| Skill index (14 skills) | ~1000 |
| **System prompt total** | **~9200** |

With the window at 32768 and the defaults (reserve 16384, keepRecent 20000):
- Compaction starts at 16384 tokens. That leaves about 7k tokens of working room.
- The retained 20000 tokens alone exceed the threshold.

Step 9 measures the real `prompt_eval_count`.

## Language / Framework Constraints

- `/bin/bash` is 3.2. `housekeeper` uses no bash 4 features.
- `housekeeper` is macOS-only by purpose (local Ollama on the M4). `install.sh` also runs on the Windows machines. The symlink there is inert. No `~/.config/` file changes.
- The tree-sitter C++ parser path is the nvim `stdpath('data')` on macOS: `~/.local/share/nvim/site/parser/cpp.so`.
- `jq` is at `/opt/homebrew/bin/jq`.
- A pi extension is TypeScript, loaded by pi from `~/.pi/agent/extensions/*.ts` (`extensions.md:131`).

## Framework Inventory

### 1. API

| Need | Module | API | Source | Step |
|---|---|---|---|---|
| Replace the system prompt per session | pi CLI | `--system-prompt <path>` | `cli.md:231` | 6 |
| Disable AGENTS.md and CLAUDE.md | pi CLI | `--no-context-files` | `cli.md:216` | 6 |
| Select the tools | pi CLI | `--tools read,bash,edit,write,grep,find,ls` | `cli.md:121-130` | 6 |
| Gate a tool call | pi extension | `pi.on("tool_call")`, `isToolCallEventType`, `{ block, reason, terminate }` | `extensions.md:973-1004` | 7 |
| Observe an executed call | pi extension | `pi.on("tool_result")` | `extensions.md` `#### tool_result` | 7 |
| Session baseline | pi extension | `pi.on("session_start")`, `ctx.cwd` | `extensions.md:473-478` | 7 |
| Context window of a model | pi config | `models.json` `providers.ollama.models[].contextWindow` | `~/.pi/agent/models.json` | 5, 6 |
| Compaction budget per model | pi settings | `compaction.modelOverrides["ollama/gemma4:e4b"]` | `compaction.md:440-459` | 5 |
| Ollama context length | ollama | `OLLAMA_CONTEXT_LENGTH` | `ollama serve --help` | 6 |
| Ollama readiness | ollama | `GET /api/tags` | Test T6 | 6 |
| Deterministic edit | carol | `carol apply --expect N` | `bin/carol:956-1014` | 3 (skills) |
| C++ parse check | tree-sitter | `parse --lib-path … --lang-name cpp` | Test T4 | 3 (skills) |

### 2. Pattern usage

| Pattern | Exemplar | Use sites | Step |
|---|---|---|---|
| Symlink-resolving launcher header | `agy/bin/agycarol:5-11` | `opencode/bin/opencarol:5-12` | 6 |
| One launcher, one fixed role, one harness | `bin/machine:2` (MACHINIST on Claude Code) | — | 6 |
| `CAROL_ROLE` export and `.carol-role` write | `agy/bin/agycarol:87-88` | `bin/carol:1067-1068` | 6 |
| Skill symlink loop | `bin/carol:215-221` | — | 6 |
| Primary exclusion from project agents | `bin/carol:210, 227` | — | 2 |
| `~/.local/bin` launcher symlink | `install.sh:121-123` | — | 8 |
| HARNESS.md tool and file tables | `opencode/HARNESS.md:1-35` | — | 4 |
| Primary role definition frontmatter | `agents/machinist.md:1-8` | — | 3 |
| Skill frontmatter (`name`, `description`) | `skills/commit-writer/SKILL.md:1-4` | all `skills/*/SKILL.md` | 3 |
| Role-exception paragraph in Git | `CAROL.md:292-293` (`MACHINIST sync`) | — | 1 |

### 3. Names

| Name | Family | Source | Step |
|---|---|---|---|
| `housekeeper` | `machine` (role-named launcher) | `~/.local/bin` | 6, 8 |
| `HOUSEKEEPER` / `housekeeper.md` | `MACHINIST` / `machinist.md` | `agents/` | 1-3 |
| `carol-gate.ts` | `agy-gate.mjs`, `opencode/plugins/carol/gate.js` | RFC §5 | 7 |
| `clean-up-writer` | `*-writer` skills (`commit-writer`, `handoff-writer`, `rfc-writer`) | `skills/` | 3 |
| `iterative-contract-sop` | RFC-named skill | RFC §7 | 3 |
| `CLEAN-UP-<subject>.md` | `HANDOFF-<subject>.md`, `PLAN-<objective>.md` | `CAROL.md` Documentation | 1, 3 |
| `HOUSEKEEPER checkpoint` | `MACHINIST sync` | `CAROL.md:292` | 1 |
| `CAROL_PI_MODEL` | `CAROL_ROLE`, `CAROL_ROOT` | RFC §4 | 6 |

### 4. Synthesis

| Rule | Established form | Step |
|---|---|---|
| Constants over magic values (MANIFESTO E) | Named shell variables at the script top | 6, 7 |
| SSOT (MANIFESTO S) | Context length lives once, in `models.json`. `housekeeper` reads it with `jq` and sets `OLLAMA_CONTEXT_LENGTH`. | 5, 6 |
| Bound (MANIFESTO B) | `housekeeper` owns the Ollama process it spawned, and only that one. The EXIT trap stops it. | 6 |
| No defensive garbage | No `kill -0` probe. The PID is set only when `housekeeper` spawned the server. | 6 |
| Positive checks | `if [ -n "$spawned_ollama_pid" ]` | 6 |

### 5. Absence

| Need | Proof of absence | Step |
|---|---|---|
| pi LSP tool | No LSP tool in the pi docs (`cli.md:140-155`) | 4 |
| Model-callable compaction | Tools are `read, bash, edit, write, grep, find, ls`. `/compact` is user input (`compaction.md:41`). | 3 |
| tree-sitter C++ grammar config | `~/.config/tree-sitter/config.json` and `~/Library/Caches/tree-sitter/lib` do not exist | 3 |
| `agy/HARNESS.md` | does not exist | 4 |

## Validation Gate

MACHINIST validates each step before the next step. The references are:
- MANIFESTO.md (BLESSED), NAMES.md, and `~/.carol/CODING.md`
- the Inventory rows of that step
- the locked decisions of this plan (no deviation, no scope drift)

@Auditor runs once, after Step 9, for cross-harness consistency and drift.

## Steps

### Step 1: Register HOUSEKEEPER in CAROL.md
**Scope:** `CAROL.md`
**Action:**
1. Add a `**HOUSEKEEPER**` entry under Primaries, after the MACHINIST entry (`CAROL.md:89-92`). It is the housekeeping primary for local models on pi. It runs anywhere without `carol init`. It does syntax and style clean-up only, in bounded batches tracked in `CLEAN-UP-<subject>.md`. It has no subagents.
2. In Documentation, add `CLEAN-UP-<subject>.md` (HOUSEKEEPER, format in the `clean-up-writer` skill) to the documents-at-project-root list.
3. In Git, add a `**HOUSEKEEPER checkpoint.**` paragraph after `MACHINIST sync` (`CAROL.md:292-293`). HOUSEKEEPER runs `git add -A`, `git commit`, and `git restore` on the batch files without instruction, only to checkpoint a baseline or a verified batch, or to revert a failed batch. Read-only git follows the main-session rule. `carol-gate.ts` enforces the rest.
**Inventory:** Pattern `CAROL.md:292-293`; Names `HOUSEKEEPER checkpoint`, `CLEAN-UP-<subject>.md`.
**Validation:** STE prose. No other CAROL.md section changes. No version bump.

### Step 1b: Add the namespace enclosure format to CODING.md
**Scope:** `CODING.md`, end of `## NAMESPACES` (after `CODING.md:668`)
**Action:** Add `**Namespace enclosure format:**` (RFC §2, RFC handoff step 1), with the exact 80-column banners from `jam_ModelUtils.cpp:3` and `:313-314`.
**Inventory:** Exemplar `jam_ModelUtils.cpp:1-3, 313-314`.
**Validation:** Both banner strings in CODING.md match the exemplar byte for byte.

### Step 2: Exclude housekeeper.md from project subagents
**Scope:** `bin/carol:210`, `bin/carol:227`
**Action:**
1. At :210, also remove a stale `.claude/agents/housekeeper.md`.
2. At :227, skip `housekeeper.md` with `machinist.md`, as one `case` on the basename.
**Inventory:** Pattern `bin/carol:210, 227`.
**Validation:** `bash -n bin/carol`. Run `carol update` in a scratch dir with a `carol/` directory, then check that `.claude/agents/` has no `housekeeper.md`.

### Step 3: Create housekeeper.md and the two skills
**Scope:** `agents/housekeeper.md`, `skills/clean-up-writer/SKILL.md`, `skills/iterative-contract-sop/SKILL.md`
**Action:** Write the RFC §3, §6, and §7 content, with these corrections:
1. `housekeeper.md` adds the rule "A tool result is the only evidence. Report the result verbatim. A blocked call ends the run." (Test T6: the model reported blocked calls as successes.)
2. `housekeeper.md` Upon Invocation step 4 loads the CODING.md section by its heading, not by line number.
3. The SOP Scan step gives the exact commands:
   - `tree-sitter parse --lib-path ~/.local/share/nvim/site/parser/cpp.so --lang-name cpp --quiet <file>`
   - `tree-sitter query --lib-path … --lang-name cpp <query.scm> <file>`
4. The SOP Verify step: tree-sitter exit 0, then `git diff --stat` shows only the batch files.
5. SOP step 6 drops "run `/compact`". The tracker carries the state. Pi auto-compaction (Step 5 budget) or ARCHITECT's `/compact` frees the context.
6. The `clean-up-writer` example row cites the Namespace enclosure rule by its CODING.md heading.
**Inventory:** Patterns `agents/machinist.md:1-8`, `skills/commit-writer/SKILL.md:1-4`; API tree-sitter, `carol apply`; Absence: model-callable compaction, tree-sitter config.
**Validation:** Frontmatter parses. STE prose. Each command in the SOP ran in Test T4 or T5.

### Step 4: Create pi/HARNESS.md
**Scope:** `pi/HARNESS.md`
**Action:** Use the `opencode/HARNESS.md` structure. Tools table:

| Claude Code | pi |
|---|---|
| Read, Write, Edit | `read`, `write`, `edit` |
| Bash | `bash` |
| Glob | `find` |
| Grep | `grep` |
| LS | `ls` |
| Agent, Task, SendMessage, AskUserQuestion, LSP, Skill tool, EnterPlanMode, ExitPlanMode, Monitor, TaskStop, WebFetch, WebSearch | None |

Notes:
- Skills load from the skill index by a read of `SKILL.md`, or by ARCHITECT's `/skill:<name>`.
- The plan is presented in chat, and ARCHITECT's reply is the approval.

Files table:
- `~/.carol/hooks/register.js` → `~/.carol/pi/extensions/carol-gate.ts` (HOUSEKEEPER gates only)
- the CAROL output style → the composed system prompt
- `CLAUDE.md` → None (`--no-context-files`)
- the settings ask list → the `carol-gate.ts` blocks
- the tree-sitter C++ parser flags
**Inventory:** Pattern `opencode/HARNESS.md:1-35`; Absence: pi LSP tool.
**Validation:** Each pi tool name matches `cli.md:121-151`.

### Step 5: Set the model context and the compaction budget

> **Superseded** by `PLAN-llama-cpp-local-model-baseline.md` (2026-11-22). Ollama is removed. The context size lives in `pi/models-preset.ini`. The compaction budget is global in `~/.pi/agent/settings.json`.

**Scope:** `~/.pi/agent/models.json`, `~/.pi/agent/settings.json` (outside the repo, machine-local)
**Action:**
1. In `models.json`, set `contextWindow` of the `ollama` / `gemma4:e4b` entry to `32768`, with one Edit.
2. In `settings.json`, add the locked Decision 2 values under `compaction.modelOverrides["ollama/gemma4:e4b"]`, with one Edit.
3. Do not create `pi/models.json.tmpl`. It never applies (RFC §4 guard), and it makes a second copy of the window value.
**Inventory:** API `models.json`, `compaction.modelOverrides`; Synthesis SSOT.
**Validation:** `jq` reads back both values. `pi --list-models` or a pi start shows no settings error.

### Step 6: Create pi/bin/housekeeper
**Scope:** `pi/bin/housekeeper` (`chmod +x`)
**Action:** Use the RFC §4 structure, with these changes:
1. Keep the header, the extension symlink, and the skill symlink loop. The role is fixed to HOUSEKEEPER (locked Decision 4): no role `case`, no scaffold check.
2. Make named constants at the top:
   - `OLLAMA_URL="http://127.0.0.1:11434"`
   - `PI_MODEL="${CAROL_PI_MODEL:-gemma4:e4b}"`
   - `PI_TOOLS="read,bash,edit,write,grep,find,ls"`
   - the readiness attempt count and interval
3. Compose the prompt from `CAROL.md`, `output-styles.md`, `pi/HARNESS.md`, and `agents/housekeeper.md`. The destination follows locked Decision 1.
4. Read the context length: `jq -r --arg id "$PI_MODEL" '.providers.ollama.models[] | select(.id == $id) | .contextWindow' "$PI_AGENT_DIR/models.json"`.
5. Spawn `OLLAMA_CONTEXT_LENGTH="$context_length" ollama serve` only when `/api/tags` fails. Record its PID.
6. `cleanup` stops the recorded PID and removes the composed prompt when it is a session file. Use one `trap cleanup EXIT`.
7. Run `pi` as a child, not with `exec`:

   ```
   pi --provider ollama --model "$PI_MODEL" --no-context-files --system-prompt <prompt> --tools "$PI_TOOLS" "$@"
   ```

   `set -e` ends the script with pi's exit code, and then the trap runs.
8. Remove `models.json.tmpl` from the scaffold.
**Inventory:** Patterns agycarol header, `bin/machine` fixed role, `.carol-role`, skill loop; API `--system-prompt`, `--no-context-files`, `--tools`, `OLLAMA_CONTEXT_LENGTH`; Synthesis SSOT, Bound, positive checks.
**Validation:** `bash -n`. Bash 3.2 syntax only. No magic values. Test T1 and T1b behavior holds.

### Step 7: Create pi/extensions/carol-gate.ts
**Scope:** `pi/extensions/carol-gate.ts`
**Action:** Use the gate that passed Test T6, with these changes:
1. Import from `@earendil-works/pi-coding-agent`. Narrow with `isToolCallEventType`.
2. All gates apply only when `process.env.CAROL_ROLE === "HOUSEKEEPER"`.
3. Bash gates:
   - Block `sed -i`, `perl -i`, and `awk -i inplace`.
   - Block when any `git <subcommand>` in the command is outside `status, diff, log, show, add -A, commit, restore`. Check every match (`matchAll`).
   - Block `carol apply` on a dirty tree without a clean baseline.
4. Write and edit gate: block when the path is not `CLEAN-UP-*.md` and no clean baseline exists.
5. Every block returns `terminate: true` with the reason text from RFC §5.
6. `session_start` sets the baseline from `git status --porcelain`.
7. `tool_result` for a bash call that contains `git commit` sets the baseline again from `git status --porcelain`. A failed commit leaves the tree dirty, so the gate stays closed.
**Inventory:** API `tool_call`, `tool_result`, `session_start`, `isToolCallEventType`, `terminate`; Name `carol-gate.ts`.
**Validation:** Each gate maps to an RFC §5 gate. Test T6 cases pass again in Step 9.

### Step 8: Wire install.sh and the symlinks
**Scope:** `install.sh` `setup_path` (`install.sh:114-130`), `~/.pi/agent/extensions/`, `~/.local/bin/housekeeper`
**Action:**
1. Add `chmod +x "$CAROL_ROOT/pi/bin/housekeeper"` and `ln -sf "$CAROL_ROOT/pi/bin/housekeeper" "$LOCAL_BIN/housekeeper"`.
2. Update the success line.
3. Create the `~/.local/bin/housekeeper` symlink now.
**Inventory:** Pattern `install.sh:121-123`.
**Validation:** `bash -n install.sh`. `readlink ~/.local/bin/housekeeper` points to `~/.carol/pi/bin/housekeeper`.

### Step 9: Verify end to end
**Scope:** scratch git repo in the session scratchpad. ARCHITECT's TUI session for the interactive checks.
**Action:**
1. Make a scratch repo: `git init` and an initial `git commit`. This needs ARCHITECT's go prompt to name `git`, because `hooks/register.js` denies it otherwise.
2. Run `housekeeper --print` probes:
   - The role answer is `HOUSEKEEPER`.
   - `ollama ps` shows `CONTEXT` equal to the `models.json` value.
   - Measure the real system-prompt tokens with `prompt_eval_count` from the Ollama API on the composed prompt.
3. Run the gate probes:
   - A write on a clean tree passes.
   - A write after the tree becomes dirty in a new session is blocked and ends the run.
   - After `git add -A` and `git commit`, a write passes.
   - `git status && git push` is blocked.
   - `sed -i` is blocked.
   - A `CLEAN-UP-test.md` write passes on a dirty tree.
4. After each probe, `pgrep -fl ollama` gives none, when `housekeeper` spawned the server.
5. Check OpenCode: start `opencarol` in a scratch dir, and check that no `housekeeper` agent appears in the agent list. If it appears, stop and report. That is a scope change in `opencode/plugins/carol/`.
6. ARCHITECT runs `housekeeper` interactively. Exit with Ctrl+D, Ctrl+C, and a tab close. Then `pgrep -fl ollama` gives none.
7. Run @Auditor once: cross-harness consistency (`agy/`, `opencode/`, `pi/`) and drift against this plan.
**Validation:** Each probe result is recorded in chat. Every Auditor finding is resolved before done.

## BLESSED Alignment

- **Bound:**
  - `housekeeper` owns only the Ollama process that it spawned. The EXIT trap stops it on every exit path (Tests T1, T1b, T6).
  - Each HOUSEKEEPER batch is bounded by the tracker.
- **Lean:**
  - No LSP server.
  - tree-sitter runs as a transient child process.
  - The system prompt has four files.
  - No `models.json.tmpl`.
- **Explicit:**
  - The gates block with a reason and end the run, so the model cannot report a false success.
  - The constants are named.
- **SSOT:**
  - The context window lives once, in `models.json`, and `housekeeper` derives `OLLAMA_CONTEXT_LENGTH` from it.
  - The namespace rule lives once, in CODING.md.
  - The definitions live in `~/.carol/`.
- **Stateless:**
  - The tracker and the commits carry the campaign state.
  - The one gate variable, the baseline, comes from `git status` at session start and after each commit. It is never set from intent.
- **Encapsulation:** The pi assets live in `pi/`. The `bin/carol` change is limited to the primary exclusion (see Decision 3).
- **Deterministic:**
  - `carol apply --expect N`
  - the tree-sitter exit code
  - `git diff --stat`
  - `git restore` on failure

## Locked Decisions (ARCHITECT, 2026-11-21)

1. **System prompt destination: per-session file.**
   - `housekeeper` composes the prompt into a `mktemp` file and passes it with `--system-prompt`.
   - `cleanup` removes the file at exit.
   - The global `~/.pi/agent/SYSTEM.md` stays untouched.
   - Step 8.4 adds no `.gitignore` entry, because the file is outside the repo.
   - Evidence: `cli.md:231`; Test T6.
2. **Compaction budget for `ollama/gemma4:e4b`: `reserveTokens 8192`, `keepRecentTokens 4096`.** The values hold. The `ollama/gemma4:e4b` override key is superseded: the values are now global (`PLAN-llama-cpp-local-model-baseline.md` Step 1).
   - Compaction starts at 24576 tokens.
   - After a compaction, about 9.2k tokens (prompt), the summary, and 4k recent tokens stay. That is below the threshold.
   - Evidence: `compaction.md:32, 440-459`.
3. **Edit `bin/carol` (RFC handoff step 2).**
   - This overrides "`bin/carol` remains untouched" in `RFC:46` and `RFC:378`.
   - Reason: `bin/carol:225-229` symlinks every `agents/*.md` except `machinist.md` into project `.claude/agents/`.
4. **Launcher `housekeeper`, not `picarol` (ARCHITECT, in session).**
   - `machine` is always MACHINIST on Claude Code (`bin/machine:2`). `housekeeper` is always HOUSEKEEPER on pi, with a local model.
   - The launcher has no role argument and no project-scaffold check.
   - `pi/bin/housekeeper` symlinks to `~/.local/bin/housekeeper`.

## Risks

1. **Superseded: Ollama is removed (`PLAN-llama-cpp-local-model-baseline.md` Step 1).** `ollama launch pi` may rewrite `models.json`. The entries carry `"_launch": true`. Not tested: a test would overwrite ARCHITECT's config. If it rewrites `contextWindow`, `housekeeper` still sets Ollama to the same value (SSOT), but the memory use grows with the value.
2. **OpenCode agent leak.** Step 9.5 checks it. A leak is a scope change. MACHINIST stops and reports.
