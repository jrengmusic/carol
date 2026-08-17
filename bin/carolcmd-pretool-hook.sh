#!/usr/bin/env bash
# carolcmd-pretool-hook.sh — CAROL destructive-command guard for Command Code.
# Mirrors ~/.carol/bin/carol-pretool-hook.sh (Claude Code) with Command Code's
# hook input schema: tool_name is "shell_command", not "Bash".
# Blocks git operations that require ARCHITECT approval.

input=$(cat)
tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)

if [[ "$tool_name" == "shell_command" ]]; then
    if printf '%s' "$command" | grep -qE 'git\s+reset\s+--hard'; then
        echo "CAROL: forbidden — git reset --hard requires ARCHITECT approval" >&2
        exit 2
    fi
    if printf '%s' "$command" | grep -qE 'git\s+checkout\s+--'; then
        echo "CAROL: forbidden — git checkout -- requires ARCHITECT approval" >&2
        exit 2
    fi
    if printf '%s' "$command" | grep -qE 'git\s+branch\s+-D'; then
        echo "CAROL: forbidden — git branch -D requires ARCHITECT approval" >&2
        exit 2
    fi
fi

exit 0
