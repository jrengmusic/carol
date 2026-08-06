#!/usr/bin/env bash
# CAROL UserPromptSubmit hook: inject protocol reminder every N prompts.
# Reads hook JSON from stdin, tracks per-session prompt count in
# ~/.claude/carol-counters/<session_id>, outputs an additionalContext
# injection when (count % N == 0).
set -euo pipefail

N=5
STALE_DAYS=7
input=$(cat)

session_id=$(printf '%s' "$input" | jq -r '.session_id // "default"' 2>/dev/null || echo "default")

counter_dir="$HOME/.claude/carol-counters"
mkdir -p "$counter_dir"
find "$counter_dir" -type f -mtime +"$STALE_DAYS" -delete 2>/dev/null || true
counter_file="$counter_dir/$session_id"

count=$(cat "$counter_file" 2>/dev/null || echo 0)
count=$((count + 1))
echo "$count" > "$counter_file"

if (( count % N == 0 )); then
  role="${CAROL_ROLE:-}"
  if [ -z "$role" ] && [ -f "$HOME/.carol/.carol-role" ]; then
    role=$(cat "$HOME/.carol/.carol-role")
  fi
  role="${role:-COUNSELOR}"

  if [ "$role" = "MACHINIST" ]; then
    nudge="CAROL NUDGE — MACHINIST executes directly with its own hands; @Pathfinder grounds unfamiliar surface; cross-platform consistency holds for ~/.config/ edits. Discuss before executing changes. Lead with the answer, cite file:line, address ARCHITECT."
  else
    nudge="CAROL NUDGE — Stay in role: plan and delegate (@Engineer code, @Pathfinder discovery, @Auditor once at sprint completion). Answer by reading; every claim cites file:line. Hold answers — dispatch only on ARCHITECT's explicit go. Lead with the answer, address ARCHITECT."
  fi
  jq -cn --arg ctx "$nudge" '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":$ctx}}'
fi
