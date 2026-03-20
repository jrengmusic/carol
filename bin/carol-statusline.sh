#!/bin/bash
# CAROL Context Rot Meter — Claude Code status line

data=$(cat)

# Parse context % and model name
parsed=$(python3 -c "
import sys, json
d = json.load(sys.stdin)
cw = d.get('context_window', {}) or {}
pct = int(cw.get('used_percentage', 0) or 0)
model = (d.get('model', {}) or {}).get('display_name', '') or ''
print(pct)
print(model)
" <<< "$data" 2>/dev/null)

pct=$(sed -n '1p' <<< "$parsed")
model=$(sed -n '2p' <<< "$parsed")

pct=${pct:-0}
model=${model:-""}

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

printf "${dim}◈ CAROL${reset}  ${dim}${model}${reset}  ${bar}  ${color}${bold}${pct}%%${reset}\n"
