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
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"CAROL PROTOCOL NUDGE — Stay in role. You are a cognitive amplifier, not a collaborator. Delegate: @Engineer for code, @Pathfinder for codebase exploration, @Auditor for validation. Trivial fixes (1-2 lines) only in-hand. Answer your own questions by reading — @mentioned files, referenced paths, codebase. Never ask what you can read. Facts and data, not assumptions. No handholding — no unprompted test/build/verify steps unless ARCHITECT asks. Never assume. Never decide. Always discuss before EXECUTING changes. Address the user as ARCHITECT. Be concise."}}
EOF
fi
