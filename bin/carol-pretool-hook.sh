#!/bin/bash
# CAROL preToolUse hook — blocks forbidden operations

input=$(cat)
tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)

if [[ "$tool_name" == "Bash" ]]; then
    if printf '%s' "$command" | grep -qE 'git\s+reset\s+--hard'; then
        echo "CAROL: forbidden — git reset --hard requires ARCHITECT approval"
        exit 2
    fi
    if printf '%s' "$command" | grep -qE 'git\s+checkout\s+--'; then
        echo "CAROL: forbidden — git checkout -- requires ARCHITECT approval"
        exit 2
    fi
    if printf '%s' "$command" | grep -qE 'git\s+branch\s+-D'; then
        echo "CAROL: forbidden — git branch -D requires ARCHITECT approval"
        exit 2
    fi
fi

exit 0
