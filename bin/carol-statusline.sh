#!/bin/bash
# CAROL Context Rot Meter — Claude Code status line

data=$(cat)

# Parse context %, model name, and agent role
parsed=$(python3 -c "
import sys, json
d = json.load(sys.stdin)
cw = d.get('context_window', {}) or {}
pct = int(cw.get('used_percentage', 0) or 0)
model = (d.get('model', {}) or {}).get('display_name', '') or ''
agent = (d.get('agent', {}) or {}).get('name', '') or ''
print(pct)
print(model)
print(agent.upper())
" <<< "$data" 2>/dev/null)

pct=$(sed -n '1p' <<< "$parsed")
model=$(sed -n '2p' <<< "$parsed")
agent=$(sed -n '3p' <<< "$parsed")

pct=${pct:-0}
model=${model:-""}
agent=${agent:-""}

# Scale to 0-80% range (CC compacts at ~80%, so 80% = full bar)
# Clamp at 100 to handle any edge cases
[ "$pct" -gt 100 ] && pct=100
scaled=$((pct * 100 / 80))
[ "$scaled" -gt 100 ] && scaled=100

# Color gradient: green → yellow → orange → red (smooth 24-bit)
# 0-50%: green to yellow (R ramps up, G stays)
# 50-100%: yellow to red (R stays, G ramps down)
if [ "$scaled" -le 50 ]; then
    r=$((scaled * 255 / 50))
    g=255
else
    r=255
    g=$(((100 - scaled) * 255 / 50))
fi
color="\033[38;2;${r};${g};0m"
reset="\033[0m"
dim="\033[2m"
bold="\033[1m"
bg_dark="\033[48;5;236m"   # dark grey background (always)

# Block bar — 20 chars wide
BAR_WIDTH=20
filled=$((scaled * BAR_WIDTH / 100))
empty=$((BAR_WIDTH - filled))

bar="${bg_dark}"
for ((i=0; i<filled; i++)); do bar="${bar}${color}${bold}█"; done
for ((i=0; i<empty; i++)); do bar="${bar} "; done
bar="${bar}${reset}"

# Role badge: block bg color with contrast fg
role_label=""
if [ -n "$agent" ]; then
    case "$agent" in
        COUNSELOR) role_bg="\033[46m\033[30m" ;;   # cyan bg, black fg
        SURGEON)   role_bg="\033[45m\033[30m" ;;   # magenta bg, black fg
        *)         role_bg="\033[47m\033[30m" ;;   # white bg, black fg
    esac
    role_label="  ${role_bg}${bold} ${agent} ${reset}"
fi

printf "${dim}◈ CAROL${reset}${role_label}  ${dim}${model}${reset}  ${bar}\n"
