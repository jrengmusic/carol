#!/bin/bash
# CAROL Context Rot Meter — Claude Code status line

data=$(cat)

# Parse context %, model name, cwd (newline-separated to handle spaces in paths)
parsed=$(python3 -c "
import sys, json
d = json.load(sys.stdin)
cw = d.get('context_window', {}) or {}
pct = int(cw.get('used_percentage', 0) or 0)
model = (d.get('model', {}) or {}).get('display_name', '') or ''
cwd = d.get('cwd') or (d.get('workspace') or {}).get('current_dir') or ''
print(pct)
print(cwd)
print(model)
" <<< "$data" 2>/dev/null)

pct=$(sed -n '1p' <<< "$parsed")
cwd=$(sed -n '2p' <<< "$parsed")
model=$(sed -n '3p' <<< "$parsed")

pct=${pct:-0}
model=${model:-""}
cwd=${cwd:-""}

# Color: green → yellow → red
if   [ "$pct" -ge 80 ]; then color="\033[31m"   # red
elif [ "$pct" -ge 60 ]; then color="\033[33m"   # yellow
else                          color="\033[32m"   # green
fi
reset="\033[0m"
dim="\033[2m"
bold="\033[1m"
bg_dark="\033[48;5;236m"   # dark grey background (always)

# Block bar — 20 chars wide
BAR_WIDTH=20
filled=$((pct * BAR_WIDTH / 100))
empty=$((BAR_WIDTH - filled))

bar="${bg_dark}"
for ((i=0; i<filled; i++)); do bar="${bar}${color}${bold}█"; done
for ((i=0; i<empty; i++)); do bar="${bar} "; done
bar="${bar}${reset}"

# Role indicator (written by /counselor or /surgeon slash commands)
role=""
role_color=""
role_label=""
if [ -n "$cwd" ] && [ -f "$cwd/.carol-role" ]; then
    role=$(tr -d '[:space:]' < "$cwd/.carol-role")
fi
case "$role" in
    COUNSELOR) role_color="\033[96m";  role_label="COUNSELOR" ;;  # bright cyan
    SURGEON)   role_color="\033[91m";  role_label="SURGEON"   ;;  # bright red
esac

# Right-align role name
left_plain="◈ CAROL  ${model}  $(printf '%*s' $BAR_WIDTH '' | tr ' ' '█')  ${pct}%"
left_len=${#left_plain}
TERM_WIDTH=$(tput cols 2>/dev/null || echo 80)

if [ -n "$role_label" ]; then
    pad=$((TERM_WIDTH - left_len - ${#role_label} - 1))
    [ $pad -lt 1 ] && pad=1
    padding=$(printf '%*s' "$pad" '')
    printf "${dim}◈ CAROL${reset}  ${dim}${model}${reset}  ${bar}  ${color}${bold}${pct}%%${reset}${padding}${role_color}${bold}${role_label}${reset}\n"
else
    printf "${dim}◈ CAROL${reset}  ${dim}${model}${reset}  ${bar}  ${color}${bold}${pct}%%${reset}\n"
fi
