#!/bin/bash
# CAROL Context Rot Meter — Claude Code status line

data=$(cat)

# CAROL version from SSOT (/VERSION file at repo root)
carol_version=$(tr -d '[:space:]' < "$(dirname "$0")/../VERSION" 2>/dev/null)
carol_version=${carol_version:-"?"}

# Parse context %, model name, agent role, and rate limit
parsed=$(python3 -c "
import sys, json, time, os
d = json.load(sys.stdin)
cw = d.get('context_window', {}) or {}
pct = int(cw.get('used_percentage', 0) or 0)
total_tokens = int(cw.get('total_input_tokens', 0) or 0)
model = (d.get('model', {}) or {}).get('display_name', '') or ''
model = model.replace(' (1M context)', '').strip()
agent = (d.get('agent', {}) or {}).get('name', '') or ''
rls = d.get('rate_limits', {}) or {}
divisor = int(os.environ.get('CAROL_CONTEXT_DIVISOR', '0') or 0)
fill_percent = int(os.environ.get('CAROL_CONTEXT_FILL_PERCENT', '80') or 80) or 80
pct_f = min(total_tokens * 100.0 / divisor, 100.0) if divisor > 0 and total_tokens > 0 else float(min(pct, 100))
scaled = min(int(round(pct_f * 100.0 / fill_percent)), 100)
def fmt(window):
    w = rls.get(window, {}) or {}
    p = int(w.get('used_percentage', 0) or 0)
    r = int(w.get('resets_at', 0) or 0)
    rem = ''
    if r > 0:
        delta = max(0, r - int(time.time()))
        days, rem_s = delta // 86400, delta % 86400
        h, m = rem_s // 3600, (rem_s % 3600) // 60
        if days: rem = f'{days}d{h:02d}h'
        elif h:  rem = f'{h}h{m:02d}m'
        else:    rem = f'{m}m'
    return p, rem
rl_pct, remaining = fmt('five_hour')
wk_pct, wk_remaining = fmt('seven_day')
print(pct)
print(total_tokens)
print(model)
print(agent.upper())
print(rl_pct)
print(remaining)
print(wk_pct)
print(wk_remaining)
print(scaled)
" <<< "$data" 2>/dev/null)

pct=$(sed -n '1p' <<< "$parsed")
total_tokens=$(sed -n '2p' <<< "$parsed")
model=$(sed -n '3p' <<< "$parsed")
agent=$(sed -n '4p' <<< "$parsed")
rl_pct=$(sed -n '5p' <<< "$parsed")
rl_remaining=$(sed -n '6p' <<< "$parsed")
wk_pct=$(sed -n '7p' <<< "$parsed")
wk_remaining=$(sed -n '8p' <<< "$parsed")
scaled=$(sed -n '9p' <<< "$parsed")

pct=${pct:-0}
total_tokens=${total_tokens:-0}
model=${model:-""}
agent=${agent:-""}
rl_pct=${rl_pct:-0}
rl_remaining=${rl_remaining:-""}
wk_pct=${wk_pct:-0}
wk_remaining=${wk_remaining:-""}
scaled=${scaled:-0}

# Palette from StyleSheet.xml
reset="\033[0m"
bold="\033[1m"
bg_dark="\033[48;5;236m"           # dark grey
bg_gap="\033[48;5;233m"            # darker gap
dim_color="\033[38;2;51;83;91m"   # mediterranea
label_color="\033[38;2;105;157;170m"  # tranquiliTeal

# Color: 4 hard thresholds
# 0-24%: deep teal | 25-49%: rich amber | 50-74%: warm orange | 75%+: preciousPersimmon
if   [ "$scaled" -ge 75 ]; then color="\033[38;2;252;112;76m"; ctx_emoji="🥵"
elif [ "$scaled" -ge 50 ]; then color="\033[38;2;200;120;50m"; ctx_emoji="😟"
elif [ "$scaled" -ge 25 ]; then color="\033[38;2;0;150;160m"; ctx_emoji="😐"
else                            color="\033[38;2;51;83;91m"; ctx_emoji="😊"
fi

# Continuous bar builder
# Usage: build_bar <segments> <filled_count> <color_escape>
build_bar() {
    local segments=$1 filled=$2 clr=$3
    local bar_out="${bg_dark}"
    for ((i=0; i<segments; i++)); do
        if [ "$i" -lt "$filled" ]; then
            bar_out="${bar_out}${clr}${bold}█"
        else
            bar_out="${bar_out} "
        fi
    done
    bar_out="${bar_out}${reset}"
    echo -n "$bar_out"
}

# Context bar — 20 segments
CTX_SEGMENTS=15
ctx_filled=$((scaled * CTX_SEGMENTS / 100))
bar=$(build_bar $CTX_SEGMENTS $ctx_filled "$color")

# Role badge: block bg color with contrast fg
role_label=""
if [ -n "$agent" ]; then
    case "$agent" in
        ORACLE)       role_bg="\033[48;2;217;119;41m\033[38;2;9;13;18m" ;;  # oracle orange bg, bunker fg
        COUNSELOR)    role_bg="\033[48;2;0;200;216m\033[38;2;9;13;18m" ;;   # blueBikini bg, bunker fg
        MACHINIST)    role_bg="\033[48;2;160;160;160m\033[38;2;9;13;18m" ;;  # grey bg, bunker fg
        *)            role_bg="\033[48;2;78;140;147m\033[38;2;9;13;18m" ;;  # paradiso bg, bunker fg
    esac
    role_label="  ${role_bg}${bold} ${agent} ${reset}"
fi

# Rate limit components (5-hour and weekly)
rl_color="$dim_color"
rl_left=0
if [ "$rl_pct" -gt 0 ]; then
    if   [ "$rl_pct" -ge 75 ]; then rl_color="\033[38;2;252;112;76m"
    elif [ "$rl_pct" -ge 50 ]; then rl_color="\033[38;2;200;120;50m"
    elif [ "$rl_pct" -ge 25 ]; then rl_color="\033[38;2;0;150;160m"
    else                            rl_color="\033[38;2;51;83;91m"
    fi
    rl_left=$((100 - rl_pct))
fi

wk_color="$dim_color"
wk_left=0
if [ "$wk_pct" -gt 0 ]; then
    if   [ "$wk_pct" -ge 75 ]; then wk_color="\033[38;2;252;112;76m"
    elif [ "$wk_pct" -ge 50 ]; then wk_color="\033[38;2;200;120;50m"
    elif [ "$wk_pct" -ge 25 ]; then wk_color="\033[38;2;0;150;160m"
    else                            wk_color="\033[38;2;51;83;91m"
    fi
    wk_left=$((100 - wk_pct))
fi

# Responsive tiers — measure actual component widths, pick highest that fits
# Tier 1: role + ctx bar
# Tier 2: + percent-only for session and weekly
# Tier 3: + bars + reset ETAs
# Tier 4: + CAROL version + model name
cols=${COLUMNS:-$(stty size < /dev/tty 2>/dev/null | cut -d' ' -f2)}
cols=${cols:-120}

# Pre-build rate limit bars (needed for tier 3+)
RL_SEGMENTS=15
WK_SEGMENTS=15
rl_bar=""
wk_bar=""
[ "$rl_pct" -gt 0 ] && rl_bar=$(build_bar $RL_SEGMENTS $((rl_pct * RL_SEGMENTS / 100)) "$rl_color")
[ "$wk_pct" -gt 0 ] && wk_bar=$(build_bar $WK_SEGMENTS $((wk_pct * WK_SEGMENTS / 100)) "$wk_color")

# Calculate visible cell widths per component (emoji = 2 cells)
role_w=0
[ -n "$agent" ] && role_w=$((2 + 1 + ${#agent} + 1))  # "  " + " ROLE "
ctx_w=$((2 + 2 + CTX_SEGMENTS))                         # "  " + emoji + bar

rl_pct_w=0; rl_full_w=0
if [ "$rl_pct" -gt 0 ]; then
    rl_pct_w=$((2 + 2 + ${#rl_left} + 1))               # "  " + emoji + digits + "%"
    rl_full_w=$((2 + 2 + RL_SEGMENTS + 1 + ${#rl_left} + 1))  # + bar + " " + digits + "%"
    [ -n "$rl_remaining" ] && rl_full_w=$((rl_full_w + 1 + ${#rl_remaining}))
fi

wk_pct_w=0; wk_full_w=0
if [ "$wk_pct" -gt 0 ]; then
    wk_pct_w=$((2 + 2 + ${#wk_left} + 1))
    wk_full_w=$((2 + 2 + WK_SEGMENTS + 1 + ${#wk_left} + 1))
    [ -n "$wk_remaining" ] && wk_full_w=$((wk_full_w + 1 + ${#wk_remaining}))
fi

ver_w=$((2 + ${#carol_version} + 9))                    # "◈ CAROL v" + version
model_w=$((2 + ${#model}))                               # "  " + model

t1=$((role_w + ctx_w))
t2=$((t1 + rl_pct_w + wk_pct_w))
t3=$((t1 + rl_full_w + wk_full_w))
t4=$((ver_w + role_w + model_w + ctx_w + rl_full_w + wk_full_w))

# Assemble: pick highest tier that fits
if [ "$cols" -ge "$t4" ]; then
    out="${label_color}◈ CAROL v${carol_version}${reset}"
    out="${out}${role_label}  ${dim_color}${model}${reset}  ${ctx_emoji}${bar}"
    [ "$rl_pct" -gt 0 ] && out="${out}  ${dim_color}🕔${reset}${rl_bar} ${rl_color}${rl_left}%%${reset}$([ -n "$rl_remaining" ] && printf " ${dim_color}${rl_remaining}${reset}")"
    [ "$wk_pct" -gt 0 ] && out="${out}  ${dim_color}📅${reset}${wk_bar} ${wk_color}${wk_left}%%${reset}$([ -n "$wk_remaining" ] && printf " ${dim_color}${wk_remaining}${reset}")"
elif [ "$cols" -ge "$t3" ]; then
    out="${role_label}  ${ctx_emoji}${bar}"
    [ "$rl_pct" -gt 0 ] && out="${out}  ${dim_color}🕔${reset}${rl_bar} ${rl_color}${rl_left}%%${reset}$([ -n "$rl_remaining" ] && printf " ${dim_color}${rl_remaining}${reset}")"
    [ "$wk_pct" -gt 0 ] && out="${out}  ${dim_color}📅${reset}${wk_bar} ${wk_color}${wk_left}%%${reset}$([ -n "$wk_remaining" ] && printf " ${dim_color}${wk_remaining}${reset}")"
elif [ "$cols" -ge "$t2" ]; then
    out="${role_label}  ${ctx_emoji}${bar}"
    [ "$rl_pct" -gt 0 ] && out="${out}  ${dim_color}🕔${reset}${rl_color}${rl_left}%%${reset}"
    [ "$wk_pct" -gt 0 ] && out="${out}  ${dim_color}📅${reset}${wk_color}${wk_left}%%${reset}"
else
    out="${role_label}  ${ctx_emoji}${bar}"
fi

printf "${out}\n"
