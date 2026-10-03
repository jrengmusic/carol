#!/usr/bin/env bash
# CAROL hook for UserPromptSubmit, PreToolUse and Stop.
# UserPromptSubmit: inject the protocol nudge every N prompts. A prompt that says
#   "no gate" arms a COUNSELOR no-gate run; any other prompt disarms it.
# PreToolUse: in an armed COUNSELOR run, deny AskUserQuestion and plan mode.
#   On an Agent call, deny a model that differs from the definition's model: line.
#   On a Bash call, deny an in-place sed, perl or awk edit. Deny git unless the last
#   prompt names git, commit or push, or every git call is status, log, diff or show
#   (the MACHINIST session also push or pull).
# Stop: in an armed COUNSELOR run, block one end of turn before the sprint log.
# Per-session state lives in ~/.claude/carol-counters/<session_id>[.nogate|.git].
set -euo pipefail

N=5
STALE_DAYS=7
NO_GATE_PATTERN='no[ -]?gate'
GIT_INSTRUCTION_PATTERN='git|commit|push'
GIT_COMMAND_PATTERN='(^|[[:space:];&|(`/])git([[:space:]]|$)'
GIT_INVOCATION_PREFIX='(^|[[:space:];&|(`/])git([[:space:]]+(-C[[:space:]]+[^[:space:]]+|-c[[:space:]]+[^[:space:]]+|--[a-z-]+(=[^[:space:]]+)?))*[[:space:]]+'
GIT_INVOCATION_SUFFIX='([[:space:];&|)]|$)'
GIT_READ_ONLY_PATTERN="${GIT_INVOCATION_PREFIX}(status|log|diff|show)${GIT_INVOCATION_SUFFIX}"
GIT_SYNC_PATTERN="${GIT_INVOCATION_PREFIX}(push|pull)${GIT_INVOCATION_SUFFIX}"
GIT_SYNC_AGENT_TYPE='MACHINIST'
IN_PLACE_PATTERN='(^|[[:space:];&|(`/])(sed|perl)[[:space:]]+([^|;&]*[[:space:]])?(-[A-Za-z]*i[A-Za-z.]*|--in-place)([[:space:]=]|$)|awk[[:space:]]+-i[[:space:]]+inplace'
SPRINT_LOG='carol/SPRINT-LOG.md'
AGENTS_DIR="$HOME/.carol/agents"
GIT_GATE="This git command needs ARCHITECT's instruction, and ARCHITECT's last prompt names no git command (CAROL.md Git). Read-only git is allowed, and MACHINIST also runs push and pull. Do not retry. Read the working tree with the Read tool, or report what you need."
IN_PLACE_GATE="An in-place edit with sed, perl or awk is not allowed (CAROL.md Destructive-Edit Discipline). Run: carol apply --expect N 'sed-expression' file... It backs up each file, prints the preview, checks that the changed-line count equals N, applies, verifies, and restores on a mismatch."
STEP_GATE='No gate until /log: this run ends at the sprint log. A text-only end of turn is a report, not the endpoint. Per CAROL.md Step Gate, a stop before the log is evidence that CONTRACT was not read at that point. Read ~/.carol/MANIFESTO.md, ~/.carol/CODING.md and ~/.carol/NAMES.md again with the Read tool, then read the implicated code at file:line. Correct course with the CONTRACT clause that covers it, and do the next step. Stop only for the closed stop set in CAROL.md Step Gate. If a subagent is still running, end the turn and wait for it.'

input=$(cat)
event=$(jq -r '.hook_event_name // ""' <<<"$input")
session_id=$(jq -r '.session_id // "default"' <<<"$input")

counter_dir="$HOME/.claude/carol-counters"
mkdir -p "$counter_dir"
counter_file="$counter_dir/$session_id"
no_gate_marker="$counter_file.nogate"
git_instruction_marker="$counter_file.git"

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

  if jq -r '.prompt // ""' <<<"$input" | grep -qiwE "$GIT_INSTRUCTION_PATTERN"; then
    touch "$git_instruction_marker"
  else
    rm -f "$git_instruction_marker"
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

deny_tool() {
  jq -cn --arg reason "$1" '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$reason}}'
}

on_agent() {
  local agent_type definition expected passed
  agent_type=$(jq -r '.tool_input.subagent_type // ""' <<<"$input" | tr '[:upper:]' '[:lower:]')
  definition="$AGENTS_DIR/$agent_type.md"

  if [ -f "$definition" ]; then
    expected=$(sed -n '/^model:/{s/^model:[[:space:]]*//;p;q;}' "$definition")
    passed=$(jq -r '.tool_input.model // ""' <<<"$input")

    [ "$passed" = "$expected" ] || deny_tool "Agent call needs model \"$expected\", the model: value in $definition. Pass model \"$expected\" on every Agent call. Per CAROL.md Subagent Model, a tier change is ARCHITECT's edit to the definition."
  fi
}

count_matches() {
  { grep -oE "$1" <<<"$2" || true; } | wc -l | tr -d ' '
}

on_git() {
  local agent_type invocations permitted_invocations
  agent_type=$(jq -r '.agent_type // ""' <<<"$input")
  invocations=$(count_matches "$GIT_COMMAND_PATTERN" "$1")
  permitted_invocations=$(count_matches "$GIT_READ_ONLY_PATTERN" "$1")

  if [ "$agent_type" = "$GIT_SYNC_AGENT_TYPE" ]; then
    permitted_invocations=$((permitted_invocations + $(count_matches "$GIT_SYNC_PATTERN" "$1")))
  fi

  [ "$invocations" -eq "$permitted_invocations" ] || deny_tool "$GIT_GATE"
}

on_bash() {
  local command
  command=$(jq -r '.tool_input.command // ""' <<<"$input")

  if grep -qE "$IN_PLACE_PATTERN" <<<"$command"; then
    deny_tool "$IN_PLACE_GATE"
  elif grep -qE "$GIT_COMMAND_PATTERN" <<<"$command"; then
    [ -f "$git_instruction_marker" ] || on_git "$command"
  fi
}

on_tool() {
  local tool_name
  tool_name=$(jq -r '.tool_name // ""' <<<"$input")

  case "$tool_name" in
    Agent|Task)
      on_agent
      ;;
    Bash)
      on_bash
      ;;
    *)
      if is_no_gate_run; then
        deny_tool "$STEP_GATE"
      fi
      ;;
  esac
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
