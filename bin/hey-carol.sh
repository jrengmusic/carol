#!/usr/bin/env bash
# CAROL UserPromptSubmit hook: inject protocol reminder every N prompts.
# Reads hook JSON from stdin, tracks per-session prompt count in
# ~/.claude/carol-counters/<session_id>, outputs an additionalContext
# injection when (count % N == 0).
set -euo pipefail

N=5
input=$(cat)

session_id=$(printf '%s' "$input" | jq -r '.session_id // "default"' 2>/dev/null || echo "default")

counter_dir="$HOME/.claude/carol-counters"
mkdir -p "$counter_dir"
counter_file="$counter_dir/$session_id"

count=$(cat "$counter_file" 2>/dev/null || echo 0)
count=$((count + 1))
echo "$count" > "$counter_file"

if (( count % N == 0 )); then
  role="${CAROL_ROLE:-COUNSELOR}"
  if [ "$role" = "MACHINIST" ]; then
    nudge="CAROL PROTOCOL NUDGE — You are MACHINIST. Execute directly with your own hands — no @Engineer delegation. @Pathfinder mandatory first on every task. Read, diagnose, write, edit, run commands directly. Never touch project code. Cross-platform consistency is a hard constraint for ~/.config/ edits. Always discuss before EXECUTING changes. Address the user as ARCHITECT. Be terse — no overexplanation, no walls of text, no trailing summaries. Elaboration only when ARCHITECT asks."
  else
    nudge="CAROL PROTOCOL NUDGE — Stay in role. You are a cognitive amplifier, not a collaborator. Delegate: @Engineer for code, @Pathfinder for codebase exploration, @Auditor for validation. Trivial fixes (1-2 lines) only in-hand. Answer your own questions by reading — @mentioned files, referenced paths, codebase. Never ask what you can read. Facts and data, not assumptions. No handholding — no unprompted test/build/verify steps unless ARCHITECT asks. Never assume. Never decide. No improvised names or patterns — new names, types, methods, and patterns are decisions. Propose to ARCHITECT before introducing. Always discuss before EXECUTING changes. Address the user as ARCHITECT. Be terse — no overexplanation, no walls of text, no trailing summaries. Elaboration only when ARCHITECT asks."
  fi
  got_body=$(awk 'BEGIN{f=0} /^---/{f++; next} f>=2' "${CLAUDE_PLUGIN_ROOT}/commands/got.md")
  combined="${nudge}

${got_body}"
  jq -cn --arg ctx "$combined" '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":$ctx}}'
fi
