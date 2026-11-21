# RFC — `pi` CLI Harness and `JANITOR` Primary Role Integration

Date: 2026-11-21
Status: Ready for COUNSELOR handoff
Author: ARCHITECT (drafted in session)
Targets: `~/.carol/` (`pi/`, `agents/janitor.md`, `skills/clean-up-writer/`, `skills/iterative-contract-sop/`, `CODING.md`, `CAROL.md`, `bin/carol`, `install.sh`), `~/.pi/agent/`, `~/.local/bin/picarol`

## Problem Statement

ARCHITECT runs `gemma4:e4b` locally via Ollama on an M4 MacBook Pro with 16 GB unified memory. ARCHITECT currently launches `pi` via `ollama launch pi` and starts `ollama serve` manually in the background. Keeping `ollama serve` idle consumes unified memory when `pi` is inactive.

ARCHITECT needs a standalone CLI wrapper (`picarol`) matching `carol`, `agycarol`, and `opencarol`. `picarol` must start `ollama serve` when absent, launch `pi` with the CAROL protocol as its system prompt, default to a new primary role (`JANITOR`), and terminate the spawned `ollama serve` process on exit.

ARCHITECT maintains multi-million-LOC C++ codebases governed by `CODING.md` and `NAMES.md`. Local model context windows cannot process an entire codebase in one pass. `JANITOR` must operate anywhere without requiring `carol init`, enforce a clean git tree via a `pi` hook, scan and edit in bounded batches using `tree-sitter` and `carol apply --expect N`, track progress in `CLEAN-UP-<subject>.md` at the repository root via a new `clean-up-writer` skill, and commit progress before wrapping up.

## Research Summary

1. **Multi-harness architecture in CAROL:** CAROL isolates secondary harnesses in top-level directories (`agy/` and `opencode/`). Each harness defines a `HARNESS.md` tool-and-file mapping table (`opencode/HARNESS.md:1-38`) and a dedicated launcher (`agy/bin/agycarol:1-92`, `opencode/bin/opencarol`).
2. **Primary role rules:** `CAROL.md` defines primary roles (`CAROL.md:83-94`). `MACHINIST` operates anywhere without a `carol/` project scaffold (`bin/carol:423-432, 570-577`). `bin/carol` excludes primary roles from project subagent symlinks (`bin/carol:136-138`), exports `CAROL_ROLE`, and writes `$CAROL_ROOT/.carol-role` (`bin/carol:574-575`).
3. **Existing deterministic edit tool:** `bin/carol` implements `carol apply --expect N '<sed-expr>' <file>...` (`bin/carol:475-545`). It prints a unified diff (`bin/carol:517`), verifies changed line count equals `N` (`bin/carol:522`), creates temporary backups (`bin/carol:525-529`), writes changes (`bin/carol:531-535`), and restores from backup on verification failure (`bin/carol:537-544`). `CAROL.md` mandates `carol apply` for scripted in-place edits (`CAROL.md:277-281`).
4. **C++ formatting and namespace enclosure rules:** `JUCE.clang-format` enforces Allman braces, `PointerAlignment: Left`, `Standard: c++17`, and sets `FixNamespaceComments: false` (`JUCE.clang-format:31-48, 129, 146, 161`). `CODING.md` currently forbids anonymous namespaces and `namespace detail` (`CODING.md:487-534`), while `jam_ModelUtils.cpp` demonstrates the established namespace enclosure format (`jam_ModelUtils.cpp:1-3, 250-251`):
   ```cpp
   namespace jam
   {
   /*____________________________________________________________________________*/
   ...
   /**_____________________________END OF NAMESPACE______________________________*/
   }// namespace jam
   ```
5. **Installer entrypoint:** `install.sh` symlinks `carol`, `oracle`, and `machine` into `~/.local/bin` (`install.sh:113-122`).
6. **Verified `pi` CLI documentation (`earendil-works/pi` `configuration.md`, `models.md`, `compaction.md`, `extensions.md`, `skills.md`, `settings.md`, `usage.md`):**
   - `~/.pi/agent/SYSTEM.md` replaces Pi's default system prompt globally; `.pi/SYSTEM.md` replaces it per trusted project and overrides `~/.pi/agent/SYSTEM.md` (they do not combine).
   - `AGENTS.md` and `CLAUDE.md` auto-load into `<project_context>` unless `--no-context-files` is passed.
   - Built-in tools default to `read`, `bash`, `edit`, `write` (plus optional `grep`, `find`, `ls`). Pi has no built-in LSP tool.
   - Auto-compaction triggers when `contextTokens > contextWindow - reserveTokens` (`reserveTokens` defaults to `16384` in `settings.json`). Setting `OLLAMA_CONTEXT_LENGTH=32768` gives a 32,768-token window and a 16,384-token working budget before auto-compaction.
   - TypeScript extensions in `~/.pi/agent/extensions/*.ts` intercept `tool_call` (blocking via `{ block: true, reason }` or mutating `event.input`), `before_agent_start`, and `session_before_compact`, and trigger compaction via `ctx.compact()`.
   - Skills in `~/.pi/agent/skills/<name>/SKILL.md` load progressively via `/skill:<name>` or description match.

## Principles and Rationale

- **Bound (`MANIFESTO.md`):** Each `JANITOR` session operates on one `CLEAN-UP-<subject>.md` tracker and executes bounded file batches. `picarol` binds the spawned `ollama serve` PID to the `pi` process lifetime via `trap EXIT` so unified RAM on the 16 GB M4 is reclaimed at exit.
- **Lean (`MANIFESTO.md`):** `JANITOR` loads no LSP server (`ling` / `clangd`) into unified memory and loads only `CAROL.md`, `output-styles.md`, `agents/janitor.md`, and the active `SKILL.md` into `gemma4:e4b`. `tree-sitter` parses on demand in transient child processes.
- **Explicit (`MANIFESTO.md`):** `JANITOR` holds zero architectural or logic-change authority (`CAROL.md:53-54` PP-3). Ambiguous violations are recorded as `FLAGGED` with `file:line` in `CLEAN-UP-<subject>.md` rather than guessed.
- **Single Source of Truth (`MANIFESTO.md`):** All definitions live in `~/.carol/` and symlink into `~/.pi/agent/`. `CLEAN-UP-<subject>.md` at the target repository root is the single source of campaign state across `pi` compactions. The namespace enclosure rule is added once to `CODING.md`.
- **Stateless (`MANIFESTO.md`):** `JANITOR` carries no persistent state in chat history. Each turn reads `CLEAN-UP-<subject>.md`, processes one bounded batch, updates the tracker, commits, and compacts when needed.
- **Encapsulation (`MANIFESTO.md`):** All `pi` harness files live under `~/.carol/pi/` (`HARNESS.md`, `bin/picarol`, `extensions/carol-gate.ts`, `models.json.tmpl`), matching `agy/` and `opencode/`. `bin/carol` remains untouched.
- **Deterministic (`MANIFESTO.md`):** Edits execute via `carol apply --expect N` (`bin/carol:475-545`) or verified single-file `edit` calls, followed by `tree-sitter` parse verification and `git diff` inspection.

## Scaffold

### 1. File Tree (`~/.carol/`)

```text
~/.carol/
├── CODING.md                                 # Add Namespace Enclosure Format section
├── CAROL.md                                  # Register JANITOR primary role and clean-up-writer skill
├── install.sh                                # Symlink pi/bin/picarol -> ~/.local/bin/picarol
├── agents/
│   └── janitor.md                            # JANITOR primary role definition (subset of MACHINIST)
├── pi/
│   ├── HARNESS.md                            # Claude Code -> pi tool, hook, and file mapping
│   ├── bin/
│   │   └── picarol                           # Standalone CLI wrapper (Ollama lifecycle + pi launch)
│   ├── extensions/
│   │   └── carol-gate.ts                     # Hook enforcing clean-tree invariant, git scope, and edit gates
│   └── models.json.tmpl                      # Ollama provider config for gemma4:e4b (32768 context)
└── skills/
    ├── clean-up-writer/
    │   └── SKILL.md                          # Format and lifecycle rules for CLEAN-UP-<subject>.md
    └── iterative-contract-sop/
        └── SKILL.md                          # Scan -> List -> Plan -> Execute -> Track SOP with tree-sitter
```

### 2. `CODING.md` Addition (`NAMESPACES` section, after `CODING.md:534`)

```markdown
**Namespace enclosure format:**
Every named namespace opens with a 76-underscore block comment immediately after `{` and closes with a 29-underscore Doxygen banner followed by `}// namespace <name>`:

```cpp
namespace jam
{
/*____________________________________________________________________________*/

// declarations or definitions

/**_____________________________END OF NAMESPACE______________________________*/
}// namespace jam
```
```

### 3. Primary Role Definition (`~/.carol/agents/janitor.md`)

```markdown
---
name: JANITOR
description: Machine-custodian subset and housekeeping primary for local models. Runs anywhere without carol init, enforces clean git tree baselines, scans C++ modules with tree-sitter against CODING.md and NAMES.md, tracks progress in CLEAN-UP-<subject>.md at repo root, and commits verified batches.
tools: Read, Write, Edit, Bash, Glob, Grep
color: yellow
model: ollama/gemma4:e4b
---

## Role: JANITOR

Housekeeping and cleanup primary — a scoped subset of MACHINIST (`agents/machinist.md`). Runs in any directory without a `carol/` scaffold. CAROL.md governs; this file adds JANITOR discipline.

## Authority Boundary

1. **Clean tree invariant.** Never modify code on a dirty git working tree. If `git status --porcelain` is non-empty before work starts, commit existing changes first (per `commit-writer` skill) or stop and ask ARCHITECT if uncommitted changes must not be committed.
2. **Syntactic and stylistic scope only.** Enforce `CODING.md` and `NAMES.md` formatting, namespace enclosures, brace placement, whitespace, alternative tokens (`not`, `and`, `or`), pointer/reference alignment, and approved renames.
3. **Zero logic or API change.** Never alter control flow, branching behavior, memory ownership, class interfaces, or runtime semantics.
4. **Zero guessing.** Mark any ambiguous violation `FLAGGED` with `file:line` and reason in `CLEAN-UP-<subject>.md`, then move to the next item.
5. **No subagents.** Execute directly with `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `tree-sitter`, and `carol apply --expect N`.

## Scoped Git Authority

- **Allowed read-only:** `git status`, `git diff`, `git log`, `git show`.
- **Allowed write:** `git add -A` and `git commit` (using `commit-writer` skill, zero AI attribution) to checkpoint a clean baseline or a verified batch; `git restore` to revert a failed batch back to `HEAD`.
- **Forbidden:** `git push`, `git pull`, `git reset`, `git checkout`, `git switch`, `git branch`, `git rebase`, `git clean`, `git stash`.

## Upon Invocation

1. `JANITOR ready to Rock 'n Roll!`
2. Check `git status --porcelain`. If dirty, resolve the baseline commit gate before scanning or editing.
3. Read `CLEAN-UP-<subject>.md` at the repository root if one exists for the campaign.
4. Load `clean-up-writer` and `iterative-contract-sop`, plus the exact contract section from `~/.carol/CODING.md` or `~/.carol/NAMES.md`.
5. Before wrapping up or compacting, update `CLEAN-UP-<subject>.md` progress and run `git add -A` + `git commit`.
```

### 4. Standalone Launcher (`~/.carol/pi/bin/picarol`)

```bash
#!/usr/bin/env bash
# picarol - CAROL Framework on pi CLI
# Usage: picarol [janitor|counselor|oracle|machinist] [pi flags...]
set -euo pipefail

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
    DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
CAROL_ROOT="$( cd -P "$( dirname "$SOURCE" )/../.." >/dev/null 2>&1 && pwd )"

role="janitor"
case "${1:-}" in
    janitor|counselor|oracle|machinist)
        role="$1"
        shift
        ;;
    -*)
        ;;
    *)
        if [ -n "${1:-}" ]; then
            role="$1"
            shift
        fi
        ;;
esac

# Project roles (counselor, oracle) require carol/ scaffold; janitor and machinist run anywhere
if [ "$role" != "janitor" ] && [ "$role" != "machinist" ] && [ ! -d carol ] && [ ! -d .carol ]; then
    case "$(pwd)" in
        "$CAROL_ROOT"|"$CAROL_ROOT"/*) ;;
        *) "$CAROL_ROOT/bin/carol" init --no-synth ;;
    esac
fi

PI_AGENT_DIR="$HOME/.pi/agent"
mkdir -p "$PI_AGENT_DIR/skills" "$PI_AGENT_DIR/extensions"

# SSOT symlinks into ~/.pi/agent/
ln -sf "$CAROL_ROOT/pi/extensions/carol-gate.ts" "$PI_AGENT_DIR/extensions/carol-gate.ts"
if [ ! -f "$PI_AGENT_DIR/models.json" ] && [ -f "$CAROL_ROOT/pi/models.json.tmpl" ]; then
    cp "$CAROL_ROOT/pi/models.json.tmpl" "$PI_AGENT_DIR/models.json"
fi
for skill_dir in "$CAROL_ROOT/skills"/*/; do
    [ -d "$skill_dir" ] && ln -sfn "${skill_dir%/}" "$PI_AGENT_DIR/skills/$(basename "$skill_dir")"
done

# Compose global ~/.pi/agent/SYSTEM.md from CAROL SSOT + active primary role
ROLE_UPPER="$(echo "$role" | tr '[:lower:]' '[:upper:]')"
{
    cat "$CAROL_ROOT/CAROL.md"
    printf '\n---\n\n'
    cat "$CAROL_ROOT/output-styles.md"
    printf '\n---\n\n'
    cat "$CAROL_ROOT/agents/${role}.md"
} > "$PI_AGENT_DIR/SYSTEM.md"

export CAROL_ROLE="$ROLE_UPPER"
printf '%s' "$CAROL_ROLE" > "$CAROL_ROOT/.carol-role"

# Manage Ollama server lifecycle (32768 context window; kill spawned daemon on exit)
SPAWNED_OLLAMA_PID=""
cleanup_ollama() {
    if [ -n "$SPAWNED_OLLAMA_PID" ] && kill -0 "$SPAWNED_OLLAMA_PID" 2>/dev/null; then
        kill "$SPAWNED_OLLAMA_PID" 2>/dev/null || true
        wait "$SPAWNED_OLLAMA_PID" 2>/dev/null || true
    fi
}
trap cleanup_ollama EXIT INT TERM

if ! curl -fsS "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
    OLLAMA_CONTEXT_LENGTH=32768 ollama serve >/dev/null 2>&1 &
    SPAWNED_OLLAMA_PID="$!"
    for _ in $(seq 1 50); do
        if curl -fsS "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
            break
        fi
        sleep 0.1
    done
fi

exec pi \
  --provider ollama \
  --model "${CAROL_PI_MODEL:-gemma4:e4b}" \
  --no-context-files \
  "$@"
```

### 5. `pi` Hook Extension (`~/.carol/pi/extensions/carol-gate.ts`)

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";

function isGitClean(cwd: string): boolean {
  try {
    const out = execSync("git status --porcelain", { cwd, encoding: "utf-8" }).trim();
    return out.length === 0;
  } catch {
    return false;
  }
}

export default function (pi: ExtensionAPI) {
  let cleanBaselineEstablished = false;

  pi.on("session_start", async (_event, ctx) => {
    cleanBaselineEstablished = isGitClean(ctx.cwd);
  });

  pi.on("tool_call", async (event, ctx) => {
    const role = process.env.CAROL_ROLE ?? "";
    if (role !== "JANITOR") return;

    if (event.toolName === "bash") {
      const cmd = String((event.input as { command?: string }).command ?? "").trim();

      // Block sed -i / perl -i / awk -i inplace (CAROL.md Destructive-Edit Discipline)
      if (/\b(sed\s+-i|perl\s+-i|awk\s+-i\s+inplace)\b/.test(cmd)) {
        return { block: true, reason: "CAROL gate: use `carol apply --expect N` instead of in-place sed/perl/awk." };
      }

      // Git command gate for JANITOR
      if (/\bgit\b/.test(cmd)) {
        const allowedGit = /^git\s+(status|diff|log|show|add\s+-A|commit|restore)\b/;
        if (!allowedGit.test(cmd)) {
          return {
            block: true,
            reason: "CAROL gate: JANITOR permits only git status, diff, log, show, add -A, commit, and restore.",
          };
        }
        if (/^git\s+commit\b/.test(cmd)) {
          cleanBaselineEstablished = true;
        }
        return;
      }

      // Enforce clean tree before mutating commands (e.g. carol apply)
      if (/\bcarol\s+apply\b/.test(cmd) && !cleanBaselineEstablished && !isGitClean(ctx.cwd)) {
        return {
          block: true,
          reason: "CAROL gate: git tree is dirty. Commit existing changes first before running carol apply.",
        };
      }
    }

    if (event.toolName === "write" || event.toolName === "edit") {
      const targetPath = String((event.input as { path?: string }).path ?? "");
      const isCleanupTracker = /(^|\/)CLEAN-UP-[^/]+\.md$/.test(targetPath);

      if (!isCleanupTracker && !cleanBaselineEstablished && !isGitClean(ctx.cwd)) {
        return {
          block: true,
          reason: "CAROL gate: git tree is dirty. Commit existing changes first before editing source files.",
        };
      }
    }
  });
}
```

### 6. Clean-Up Writer Skill (`~/.carol/skills/clean-up-writer/SKILL.md`)

```markdown
---
name: clean-up-writer
description: Writes and updates CLEAN-UP-<subject>.md at the repository root. Load whenever JANITOR starts, updates, or finishes a cleanup or housekeeping campaign.
---

# Clean-Up Writer

This skill is the only source of the `CLEAN-UP-<subject>.md` format.

## File

- **Path:** Repository root (`CLEAN-UP-<subject>.md`, kebab-case `<subject>`).
- **Lifecycle:** Created during the Scan phase, updated after every executed batch, and committed before wrapping up.

## Structure

```markdown
# CLEAN-UP — <Subject>
Date: <YYYY-MM-DD>
Status: <Scanning | In Progress | Complete>
Contract: <CODING.md:<line> or NAMES.md:<line>>

## Objective
<One exact sentence stating the syntactic or stylistic invariant enforced.>

## Scope
<Exact directories, modules, or file globs included; explicit exclusions.>

## Tracker

| ID | File | Lines | Rule | Status | Notes |
|----|------|-------|------|--------|-------|
| 001 | path/to/File.cpp | 1-251 | CODING.md:536 | PENDING | missing end banner |

## Progress
- Total: <N>
- Done: <N>
- Flagged: <N>
- Pending: <N>
```

## Rules

1. **Statuses are closed:** `PENDING`, `DONE`, `FLAGGED`.
2. **Batch update:** Update `Tracker` rows and `Progress` counts immediately after each batch is verified.
3. **Wrap-up gate:** Before ending a session or compacting after a batch, update `CLEAN-UP-<subject>.md` and run `git add -A` followed by `git commit` (using the `commit-writer` skill).
```

### 7. Iterative Contract SOP Skill (`~/.carol/skills/iterative-contract-sop/SKILL.md`)

```markdown
---
name: iterative-contract-sop
description: Iterative Scan -> List -> Plan -> Execute -> Track workflow for bounded syntactic/stylistic cleanup across large C++ codebases using tree-sitter and carol apply. Load whenever JANITOR runs a multi-file contract enforcement campaign.
---

# Iterative Contract SOP

## Cycle

1. **Baseline Gate:** Verify `git status --porcelain` is empty. If dirty, commit existing changes per `commit-writer` or stop and ask ARCHITECT.
2. **Scan (Module-Scoped):** Run `tree-sitter` over one module directory at a time to locate syntactic/comment violations without loading whole modules into model context.
3. **List (`clean-up-writer`):** Write or append findings to `CLEAN-UP-<subject>.md` at the repository root with `PENDING` status and exact `file:line` spans.
4. **Plan (Batch Partitioning):** Group `PENDING` items into batches of 1 to 5 files (or one `.h` + `.cpp` pair).
5. **Execute (One Batch Per Turn):**
   - Read only the target lines/files in the active batch.
   - Apply deterministic edits via `carol apply --expect N` or `edit`.
   - Re-parse edited files with `tree-sitter` to confirm zero syntax `ERROR` nodes and inspect `git diff`.
   - If a batch fails verification or touches ambiguous logic, run `git restore` on the batch files and mark the row `FLAGGED`.
6. **Track & Commit (`clean-up-writer`):** Update `CLEAN-UP-<subject>.md` progress counts, commit the verified batch + tracker (`git add -A` + `git commit`), and run `/compact` before starting the next batch.
```

## BLESSED Compliance Checklist

- [x] **Bounds:** `picarol` binds `ollama serve` PID to `pi` exit via `trap EXIT`; `JANITOR` processes bounded batches tracked in `CLEAN-UP-<subject>.md`.
- [x] **Lean:** Zero background LSP memory overhead; `tree-sitter` runs per-file on demand; system prompt composes only `CAROL.md`, `output-styles.md`, and `agents/janitor.md`.
- [x] **Explicit:** `JANITOR` authority is strictly syntactic/stylistic; `carol-gate.ts` blocks dirty-tree code edits and enforces scoped git commands; ambiguous items become `FLAGGED`.
- [x] **SSOT:** `CAROL.md`, `output-styles.md`, `agents/janitor.md`, `skills/`, and `pi/` live in `~/.carol/` and symlink into `~/.pi/agent/`; `CLEAN-UP-<subject>.md` is the single campaign tracker at repo root.
- [x] **Stateless:** Progress persists in `CLEAN-UP-<subject>.md` and git commits; `/compact` clears raw diffs between batches.
- [x] **Encapsulation:** All `pi` assets live in `~/.carol/pi/`; `bin/carol` is unmodified; `install.sh` adds `~/.local/bin/picarol`.
- [x] **Deterministic:** `tree-sitter` AST queries, `carol apply --expect N` (`bin/carol:475-545`), `git restore` rollback on failure, and `tree-sitter` post-edit syntax verification.

## Open Questions

None.

## Handoff Notes

- **Executor:** `MACHINIST` (`agents/machinist.md`).
- **Implementation sequence for `MACHINIST`:**
  1. Add the **Namespace enclosure format** rule to `~/.carol/CODING.md` after line 534.
  2. Register `JANITOR` under Primaries in `~/.carol/CAROL.md` (`CAROL.md:83-94`) and exclude `janitor.md` alongside `machinist.md` in `bin/carol:136-138` so subagents cannot invoke it.
  3. Create `~/.carol/agents/janitor.md`, `~/.carol/skills/clean-up-writer/SKILL.md`, and `~/.carol/skills/iterative-contract-sop/SKILL.md`.
  4. Create `~/.carol/pi/HARNESS.md`, `~/.carol/pi/bin/picarol` (`chmod +x`), `~/.carol/pi/extensions/carol-gate.ts`, and `~/.carol/pi/models.json.tmpl`.
  5. Update `~/.carol/install.sh` (`setup_path`, `install.sh:113-122`) to symlink `$CAROL_ROOT/pi/bin/picarol` to `$HOME/.local/bin/picarol`, and create the symlink immediately.
  6. Verify in a clean scratch git repo: `picarol --help`, `picarol` startup with Ollama server auto-spawn + teardown on exit, `carol-gate.ts` blocking edits on a dirty tree, and allowing edits after `git commit`.