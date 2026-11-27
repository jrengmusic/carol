#!/bin/bash
# CAROL Context Rot Meter — Claude Code status line

data=$(cat)
mkdir -p "$HOME/.carol/.tmp"

# CAROL version from SSOT (/VERSION file at repo root)
carol_version=$(tr -d '[:space:]' < "$(dirname "$0")/../VERSION" 2>/dev/null)
carol_version=${carol_version:-"?"}

DEFAULT_FILL_PERCENT=80
divisor="${CAROL_CONTEXT_DIVISOR:-0}"
[ -z "$divisor" ] && divisor=0
fill_percent="${CAROL_CONTEXT_FILL_PERCENT:-$DEFAULT_FILL_PERCENT}"
if [ -z "$fill_percent" ] || [ "$fill_percent" -eq 0 ]; then
    fill_percent=$DEFAULT_FILL_PERCENT
fi

# Parse context %, model name, agent role, rate limits, and transcript path
parsed=$(saw json -r --argjson divisor "$divisor" --argjson fill_percent "$fill_percent" '
    def clean: tostring | gsub("[\r\n]"; "");
    def fmt_window($rls; $name):
        ($rls[$name] // {}) as $w |
        ($w.used_percentage // 0 | tonumber | floor) as $p |
        ($w.resets_at // 0 | tonumber | floor) as $r |
        (if $r > 0 then
            ([0, ($r - (now | floor))] | max) as $delta |
            (($delta / 86400) | floor) as $days |
            ($delta % 86400) as $rem_s |
            (($rem_s / 3600) | floor) as $h |
            ((($rem_s % 3600) / 60) | floor) as $m |
            if $days > 0 then "\($days)d\(if $h < 10 then "0\($h)" else "\($h)" end)h"
            elif $h > 0 then "\($h)h\(if $m < 10 then "0\($m)" else "\($m)" end)m"
            else "\($m)m"
            end
        else "" end) as $rem |
        [$p, $rem];

    (.session_id // "" | clean) as $sid |
    (.context_window // {}) as $cw |
    ($cw.used_percentage // 0 | tonumber | floor) as $pct |
    ($cw.total_input_tokens // 0 | tonumber | floor) as $total_tokens |
    ((.model.display_name // "") | gsub(" \\(1M context\\)"; "") | gsub("^\\s+|\\s+$"; "") | clean) as $model |
    ((.agent.name // "") | gsub("^\\s+|\\s+$"; "") | clean) as $agent |
    (if $divisor > 0 and $total_tokens > 0 then [($total_tokens * 100 / $divisor), 100] | min
     else [$pct, 100] | min end) as $pct_f |
    ([($pct_f * 100 / $fill_percent | round), 100] | min) as $scaled |
    (.rate_limits // {}) as $rls |
    fmt_window($rls; "five_hour") as $rl |
    fmt_window($rls; "seven_day") as $wk |
    (.transcript_path // "" | clean) as $tp |
    [$sid, $pct, $total_tokens, $model, $agent, $rl[0], $rl[1], $wk[0], $wk[1], $scaled, $tp][]
' <<< "$data" 2>/dev/null | tr -d '\r')

session_id="" pct="" total_tokens="" model="" agent=""
rl_pct="" rl_remaining="" wk_pct="" wk_remaining="" scaled="" transcript_path=""

{
    IFS= read -r session_id
    IFS= read -r pct
    IFS= read -r total_tokens
    IFS= read -r model
    IFS= read -r agent
    IFS= read -r rl_pct
    IFS= read -r rl_remaining
    IFS= read -r wk_pct
    IFS= read -r wk_remaining
    IFS= read -r scaled
    IFS= read -r transcript_path
} <<< "$parsed"

printf "%s" "$data" > "$HOME/.carol/.tmp/statusline_input.${session_id}.json"

if [ -z "$agent" ]; then
    agent="${CAROL_ROLE:-}"
fi
if [ -z "$agent" ] && [ -f "$HOME/.carol/.carol-role" ]; then
    agent=$(tr -d '[:space:]' < "$HOME/.carol/.carol-role" 2>/dev/null)
fi
if [ -z "$agent" ]; then
    agent="COUNSELOR"
fi
agent=$(printf '%s' "$agent" | tr '[:lower:]' '[:upper:]')

cache_pct=0
cache_remaining=""
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
    cache_parsed=$(saw json -R -s -r '
        def CACHE_TTL_1H: 3600;
        def CACHE_TTL_5M: 300;
        split("\n") | reverse |
        reduce .[] as $line (
            {anchor: null, ttl: null, done: false};
            if .done then .
            else
                ($line | fromjson? // null) as $e |
                if ($e | type) != "object" then .
                else
                    ($e.message.usage // {}) as $u |
                    (($u.cache_creation_input_tokens // 0 | tonumber) > 0 or ($u.cache_read_input_tokens // 0 | tonumber) > 0) as $has_cache |
                    if $has_cache then
                        (if .anchor == null then ($e.timestamp // "") else .anchor end) as $a |
                        ($u.cache_creation // {}) as $b |
                        if ($b.ephemeral_1h_input_tokens // 0 | tonumber) > 0 then
                            {anchor: $a, ttl: CACHE_TTL_1H, done: true}
                        elif ($b.ephemeral_5m_input_tokens // 0 | tonumber) > 0 then
                            {anchor: $a, ttl: CACHE_TTL_5M, done: true}
                        else
                            .anchor = $a
                        end
                    else .
                    end
                end
            end
        ) |
        if (.anchor // "") != "" then
            (.ttl // CACHE_TTL_1H) as $ttl |
            (try (.anchor | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601) catch null) as $epoch |
            if $epoch != null then
                ([0, (now - $epoch)] | max) as $elapsed |
                ([100, (($elapsed * 100 / $ttl) | floor)] | min) as $cpct |
                ([0, (($ttl - $elapsed) | floor)] | max) as $left |
                (($left / 60) | floor) as $cm |
                ($left % 60) as $cs |
                (if $cpct < 100 then "\($cm)m\(if $cs < 10 then "0\($cs)" else "\($cs)" end)s" else "cold" end) as $crem |
                [$cpct, $crem][]
            else
                ["0", ""][]
            end
        else
            ["0", ""][]
        end
    ' "$transcript_path" 2>/dev/null | tr -d '\r')
    {
        IFS= read -r cache_pct
        IFS= read -r cache_remaining
    } <<< "$cache_parsed"
fi

pct=${pct:-0}
total_tokens=${total_tokens:-0}
model=${model:-""}
agent=${agent:-""}
rl_pct=${rl_pct:-0}
rl_remaining=${rl_remaining:-""}
wk_pct=${wk_pct:-0}
wk_remaining=${wk_remaining:-""}
scaled=${scaled:-0}
cache_pct=${cache_pct:-0}
cache_remaining=${cache_remaining:-""}

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
CTX_SEGMENTS=10
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

cache_color="$dim_color"
cache_left=0
if [ -n "$cache_remaining" ]; then
    if   [ "$cache_pct" -ge 75 ]; then cache_color="\033[38;2;51;83;91m"
    elif [ "$cache_pct" -ge 50 ]; then cache_color="\033[38;2;0;150;160m"
    elif [ "$cache_pct" -ge 25 ]; then cache_color="\033[38;2;200;120;50m"
    else                                cache_color="\033[38;2;252;112;76m"
    fi
    cache_left=$((100 - cache_pct))
fi

# Responsive tiers — measure actual component widths, pick highest that fits
# Tier 1: role + ctx bar
# Tier 2: + percent-only for session and weekly
# Tier 3: + bars + reset ETAs
# Tier 4: + CAROL version + model name
cols=${COLUMNS:-$(stty size < /dev/tty 2>/dev/null | cut -d' ' -f2)}
cols=${cols:-120}

# Pre-build rate limit bars (needed for tier 3+)
RL_SEGMENTS=10
WK_SEGMENTS=10
CACHE_SEGMENTS=10
rl_bar=""
wk_bar=""
cache_bar=""
[ "$rl_pct" -gt 0 ] && rl_bar=$(build_bar $RL_SEGMENTS $((rl_pct * RL_SEGMENTS / 100)) "$rl_color")
[ "$wk_pct" -gt 0 ] && wk_bar=$(build_bar $WK_SEGMENTS $((wk_pct * WK_SEGMENTS / 100)) "$wk_color")
[ -n "$cache_remaining" ] && cache_bar=$(build_bar $CACHE_SEGMENTS $((cache_pct * CACHE_SEGMENTS / 100)) "$cache_color")

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

cache_pct_w=0; cache_full_w=0
if [ -n "$cache_remaining" ]; then
    cache_pct_w=$((2 + 2 + ${#cache_left} + 1))
    cache_full_w=$((2 + 2 + CACHE_SEGMENTS + 1 + ${#cache_left} + 1 + 1 + ${#cache_remaining}))
fi

ver_w=$((2 + ${#carol_version} + 9))                    # "◈ CAROL v" + version
model_w=$((2 + ${#model}))                               # "  " + model

t1=$((role_w + ctx_w))
t2=$((t1 + rl_pct_w + wk_pct_w + cache_pct_w))
t3=$((t1 + rl_full_w + wk_full_w + cache_full_w))
t4=$((ver_w + role_w + model_w + ctx_w + rl_full_w + wk_full_w + cache_full_w))

# Assemble: pick highest tier that fits
if [ "$cols" -ge "$t4" ]; then
    out="${label_color}◈ CAROL v${carol_version}${reset}"
    out="${out}${role_label}  ${dim_color}${model}${reset}  ${ctx_emoji}${bar}"
    [ "$rl_pct" -gt 0 ] && out="${out}  ${dim_color}🕔${reset}${rl_bar} ${rl_color}${rl_left}%%${reset}$([ -n "$rl_remaining" ] && printf " ${dim_color}${rl_remaining}${reset}")"
    [ "$wk_pct" -gt 0 ] && out="${out}  ${dim_color}📅${reset}${wk_bar} ${wk_color}${wk_left}%%${reset}$([ -n "$wk_remaining" ] && printf " ${dim_color}${wk_remaining}${reset}")"
    [ -n "$cache_remaining" ] && out="${out}  ${dim_color}⏳${reset}${cache_bar} ${cache_color}${cache_left}%%${reset} ${dim_color}${cache_remaining}${reset}"
elif [ "$cols" -ge "$t3" ]; then
    out="${role_label}  ${ctx_emoji}${bar}"
    [ "$rl_pct" -gt 0 ] && out="${out}  ${dim_color}🕔${reset}${rl_bar} ${rl_color}${rl_left}%%${reset}$([ -n "$rl_remaining" ] && printf " ${dim_color}${rl_remaining}${reset}")"
    [ "$wk_pct" -gt 0 ] && out="${out}  ${dim_color}📅${reset}${wk_bar} ${wk_color}${wk_left}%%${reset}$([ -n "$wk_remaining" ] && printf " ${dim_color}${wk_remaining}${reset}")"
    [ -n "$cache_remaining" ] && out="${out}  ${dim_color}⏳${reset}${cache_bar} ${cache_color}${cache_left}%%${reset} ${dim_color}${cache_remaining}${reset}"
elif [ "$cols" -ge "$t2" ]; then
    out="${role_label}  ${ctx_emoji}${bar}"
    [ "$rl_pct" -gt 0 ] && out="${out}  ${dim_color}🕔${reset}${rl_color}${rl_left}%%${reset}"
    [ "$wk_pct" -gt 0 ] && out="${out}  ${dim_color}📅${reset}${wk_color}${wk_left}%%${reset}"
    [ -n "$cache_remaining" ] && out="${out}  ${dim_color}⏳${reset}${cache_color}${cache_left}%%${reset}"
else
    out="${role_label}  ${ctx_emoji}${bar}"
fi

printf "${out}\n"
