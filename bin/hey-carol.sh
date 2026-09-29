#!/usr/bin/env bash
# CAROL hook for UserPromptSubmit, PreToolUse and Stop.
# UserPromptSubmit: inject the protocol nudge every N prompts. A prompt that says
#   "no gate" arms a COUNSELOR no-gate run; any other prompt disarms it.
# PreToolUse: in an armed COUNSELOR run, deny AskUserQuestion and plan mode.
# Stop: in an armed COUNSELOR run, block one end of turn before the sprint log.
# Per-session state lives in ~/.claude/carol-counters/<session_id>[.nogate].
set -euo pipefail

N=5
STALE_DAYS=7
NO_GATE_PATTERN='no[ -]?gate'
SPRINT_LOG='carol/SPRINT-LOG.md'
STEP_GATE='No gate until /log: this run ends at the sprint log. A text-only end of turn is a report, not the endpoint. Per CAROL.md Step Gate, a stop before the log is evidence that CONTRACT was not read at that point. Read ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md again with the Read tool, then read the implicated code at file:line. Correct course with the CONTRACT clause that covers it, and do the next step. Stop only for the closed stop set in CAROL.md Step Gate. If a subagent is still running, end the turn and wait for it.'

input=$(cat)
event=$(jq -r '.hook_event_name // ""' <<<"$input")
session_id=$(jq -r '.session_id // "default"' <<<"$input")

counter_dir="$HOME/.claude/carol-counters"
mkdir -p "$counter_dir"
counter_file="$counter_dir/$session_id"
no_gate_marker="$counter_file.nogate"

role="${CAROL_ROLE:-}"
if [ -z "$role" ] && [ -f "$HOME/.carol/.carol-role" ]; then
  role=$(cat "$HOME/.carol/.carol-role")
fi
role="${role:-COUNSELOR}"

is_no_gate_run() {
  [ "$role" = "COUNSELOR" ] && [ -f "$no_gate_marker" ]
}

on_prompt() {
  find "$counter_dir" -type f -mtime +"$STALE_DAYS" -delete 2>/dev/null || true

  if jq -r '.prompt // ""' <<<"$input" | grep -qiE "$NO_GATE_PATTERN"; then
    touch "$no_gate_marker"
  else
    rm -f "$no_gate_marker"
  fi

  local count
  count=$(cat "$counter_file" 2>/dev/null || echo 0)
  count=$((count + 1))
  echo "$count" > "$counter_file"

  if (( count % N == 0 )); then
    local nudge
    if [ "$role" = "MACHINIST" ]; then
      nudge="CAROL NUDGE — MACHINIST executes directly with its own hands; @Pathfinder grounds unfamiliar surface; cross-platform consistency holds for ~/.config/ edits. Discuss before executing changes; cite file:line."
    else
      nudge="CAROL NUDGE — Stay in role: plan and delegate (@Engineer code, @Pathfinder discovery, @Auditor once at sprint completion). Answer by reading; every claim cites file:line. Before the plan locks, hold answers until ARCHITECT's go. After the lock, execute to the endpoint per CAROL.md Step Gate."
    fi
    jq -cn --arg ctx "$nudge" '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":$ctx}}'
  fi
}

on_tool() {
  if is_no_gate_run; then
    jq -cn --arg reason "$STEP_GATE" '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$reason}}'
  fi
}

on_stop() {
  if is_no_gate_run; then
    local cwd is_continuation
    cwd=$(jq -r '.cwd // ""' <<<"$input")
    is_continuation=$(jq -r '.stop_hook_active // false' <<<"$input")

    if [ "$cwd/$SPRINT_LOG" -nt "$no_gate_marker" ]; then
      rm -f "$no_gate_marker"
    elif [ "$is_continuation" = "false" ]; then
      jq -cn --arg reason "$STEP_GATE" '{"decision":"block","reason":$reason}'
    fi
  fi
}

case "$event" in
  UserPromptSubmit) on_prompt ;;
  PreToolUse)       on_tool ;;
  Stop)             on_stop ;;
esac
