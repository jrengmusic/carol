#!/bin/bash
# agy-statusline.sh - CAROL Context Rot Meter & Status Line for Antigravity CLI (agy)

SOURCE="${BASH_SOURCE[0]}"
if [ -h "$SOURCE" ]; then
    while [ -h "$SOURCE" ]; do
        DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
        SOURCE="$(readlink "$SOURCE")"
        [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
    done
    CAROL_ROOT="$( cd -P "$( dirname "$SOURCE" )/../.." >/dev/null 2>&1 && pwd )"
else
    CAROL_ROOT="${SOURCE%/*}/../.."
fi

SEGMENTS=10
DEFAULT_FILL_PERCENT=80
DEFAULT_TERMINAL_WIDTH=120

RESET=$'\033[0m'
BOLD=$'\033[1m'
BG_DARK=$'\033[48;5;236m'
DIM=$'\033[38;2;51;83;91m'
LABEL=$'\033[38;2;105;157;170m'
GIT=$'\033[38;2;140;100;180m'

COLOR_LOW=$'\033[38;2;51;83;91m'
COLOR_MED=$'\033[38;2;0;150;160m'
COLOR_HIGH=$'\033[38;2;200;120;50m'
COLOR_CRIT=$'\033[38;2;252;112;76m'

threshold_color() {
    local used=$1
    if [ "$used" -ge 75 ]; then _color="$COLOR_CRIT"
    elif [ "$used" -ge 50 ]; then _color="$COLOR_HIGH"
    elif [ "$used" -ge 25 ]; then _color="$COLOR_MED"
    else _color="$COLOR_LOW"
    fi
}

ctx_emoji_for() {
    local used=$1
    if [ "$used" -ge 75 ]; then _emoji='🥵'
    elif [ "$used" -ge 50 ]; then _emoji='😟'
    elif [ "$used" -ge 25 ]; then _emoji='😐'
    else _emoji='😊'
    fi
}

build_bar() {
    local used=$1 clr=$2
    local filled=$((used * SEGMENTS / 100))
    [ "$filled" -lt 0 ] && filled=0
    [ "$filled" -gt "$SEGMENTS" ] && filled=$SEGMENTS
    local cells="" i
    for ((i=0; i<SEGMENTS; i++)); do
        if [ "$i" -lt "$filled" ]; then
            cells="${cells}${clr}${BOLD}█"
        else
            cells="${cells} "
        fi
    done
    _bar="${BG_DARK}${cells}${RESET}"
}

fmt_eta() {
    local sec=$1
    _eta=""
    if [ "$sec" -le 0 ]; then
        return
    fi
    local days=$((sec / 86400))
    local rem=$((sec % 86400))
    local hours=$((rem / 3600))
    local mins=$(((rem % 3600) / 60))
    if [ "$days" -gt 0 ]; then
        printf -v _eta '%dd%02dh' "$days" "$hours"
    elif [ "$hours" -gt 0 ]; then
        printf -v _eta '%dh%02dm' "$hours" "$mins"
    else
        printf -v _eta '%dm' "$mins"
    fi
}

render_quota() {
    local icon=$1 used=$2 left=$3 sec=$4
    q_full="" q_full_w=0 q_short="" q_short_w=0
    if [ -z "$used" ]; then
        return
    fi
    local clr eta_part="" eta_w=0
    threshold_color "$used"
    clr="$_color"
    build_bar "$used" "$clr"
    fmt_eta "$sec"
    if [ -n "$_eta" ]; then
        eta_part=" ${DIM}${_eta}${RESET}"
        eta_w=$((1 + ${#_eta}))
    fi
    q_full="  ${DIM}${icon}${RESET}${_bar} ${clr}${left}%${RESET}${eta_part}"
    q_full_w=$((2 + 2 + SEGMENTS + 1 + ${#left} + 1 + eta_w))
    q_short="  ${DIM}${icon}${RESET}${clr}${left}%${RESET}"
    q_short_w=$((2 + 2 + ${#left} + 1))
}

IFS= read -r -d '' data || true
[ -d "$CAROL_ROOT/.tmp" ] || mkdir -p "$CAROL_ROOT/.tmp"

carol_version=""
if [ -f "$CAROL_ROOT/VERSION" ]; then
    IFS= read -r carol_version < "$CAROL_ROOT/VERSION" || true
    carol_version="${carol_version//[[:space:]]/}"
fi
carol_version=${carol_version:-"0.0.32"}

divisor="${CAROL_CONTEXT_DIVISOR:-0}"
[ -z "$divisor" ] && divisor=0
fill_percent="${CAROL_CONTEXT_FILL_PERCENT:-$DEFAULT_FILL_PERCENT}"
if [ -z "$fill_percent" ] || [ "$fill_percent" -eq 0 ]; then
    fill_percent=$DEFAULT_FILL_PERCENT
fi

parsed=$(saw json -r --argjson divisor "$divisor" --argjson fill_percent "$fill_percent" '
    def clean: tostring | gsub("[\r\n]"; "");
    def qinfo($q; $k):
        ($q[$k]) as $e |
        if ($e | type) == "object" and ($e | has("remaining_fraction")) then
            ([0, ([100, (($e.remaining_fraction // 1 | tonumber) * 100 | round)] | min)] | max) as $left |
            [(100 - $left), $left, ($e.reset_in_seconds // 0 | tonumber | floor)]
        else
            ["", "", ""]
        end;

    (.session_id // "" | if . == "" then "default" else clean end) as $sid |
    ((.model.display_name // "") | gsub(" \\(1M context\\)"; "") | gsub("^\\s+|\\s+$"; "") | clean) as $model |
    ($model | ascii_downcase) as $ml |
    (.context_window.used_percentage // 0 | tonumber) as $raw_pct |
    (.context_window.total_input_tokens // 0 | tonumber | floor) as $total_tokens |
    (if $divisor > 0 and $total_tokens > 0 then [($total_tokens * 100 / $divisor), 100] | min
     else [0, ([$raw_pct, 100] | min)] | max end) as $pct_f |
    ($pct_f | round) as $pct |
    ([($pct_f * 100 / $fill_percent | round), 100] | min) as $scaled |
    ((.agent.name // "") | gsub("^\\s+|\\s+$"; "") | ascii_upcase | clean) as $agent |
    (.quota // {}) as $quota |
    (if ($ml | contains("claude")) or ($ml | contains("gpt")) then ["3p-5h", "3p-weekly"]
     elif ($ml | contains("argon")) then ["gemini-5h", "gemini-argon-wtu-weekly"]
     else ["gemini-5h", "gemini-weekly"] end) as $keys |
    qinfo($quota; $keys[0]) as $rl |
    qinfo($quota; $keys[1]) as $wk |
    (.vcs.branch // "" | clean) as $branch |
    (if .vcs.dirty then "*" else "" end) as $dirty |
    (.agent_state // "" | clean) as $state |
    (.terminal_width // 0 | tonumber | floor) as $cols |
    [$sid, $model, $pct, $scaled, $agent, $rl[0], $rl[1], $rl[2], $wk[0], $wk[1], $wk[2], $branch, $dirty, $state, $cols][]
' <<< "$data" 2>/dev/null)
parsed="${parsed//$'\r'/}"

session_id="" model="" pct="" scaled="" agent=""
rl_used="" rl_left="" rl_sec=""
wk_used="" wk_left="" wk_sec=""
branch="" dirty="" state="" cols=""

{
    IFS= read -r session_id
    IFS= read -r model
    IFS= read -r pct
    IFS= read -r scaled
    IFS= read -r agent
    IFS= read -r rl_used
    IFS= read -r rl_left
    IFS= read -r rl_sec
    IFS= read -r wk_used
    IFS= read -r wk_left
    IFS= read -r wk_sec
    IFS= read -r branch
    IFS= read -r dirty
    IFS= read -r state
    IFS= read -r cols
} <<< "$parsed"

session_id=${session_id:-default}
pct=${pct:-0}
scaled=${scaled:-0}
cols=${cols:-0}
[ "$cols" -le 0 ] && cols=$DEFAULT_TERMINAL_WIDTH

printf '%s' "$data" > "$CAROL_ROOT/.tmp/statusline_agy_${session_id}.json"

if [ -z "$agent" ]; then
    agent="${CAROL_ROLE:-}"
fi
if [ -z "$agent" ] && [ -f "$CAROL_ROOT/.carol-role" ]; then
    IFS= read -r agent < "$CAROL_ROOT/.carol-role" || true
    agent="${agent//[[:space:]]/}"
fi
if [ -z "$agent" ]; then
    agent="COUNSELOR"
fi
case "$agent" in
    *[a-z]*) agent=$(printf '%s' "$agent" | tr '[:lower:]' '[:upper:]') ;;
esac

case "$agent" in
    ORACLE)    role_bg=$'\033[48;2;217;119;41m\033[38;2;9;13;18m' ;;
    COUNSELOR) role_bg=$'\033[48;2;0;200;216m\033[38;2;9;13;18m' ;;
    MACHINIST) role_bg=$'\033[48;2;160;160;160m\033[38;2;9;13;18m' ;;
    ENGINEER)  role_bg=$'\033[48;2;40;120;220m\033[38;2;9;13;18m' ;;
    *)         role_bg=$'\033[48;2;78;140;147m\033[38;2;9;13;18m' ;;
esac
role_str="${role_bg}${BOLD} ${agent} ${RESET}"
role_w=$((${#agent} + 2))

threshold_color "$scaled"
ctx_emoji_for "$scaled"
build_bar "$scaled" "$_color"
ctx_str="${_emoji}${_bar} ${DIM}${pct}%${RESET}"
ctx_w=$((2 + SEGMENTS + 1 + ${#pct} + 1))

render_quota "🕔" "$rl_used" "$rl_left" "$rl_sec"
rl_full=$q_full rl_full_w=$q_full_w rl_short=$q_short rl_short_w=$q_short_w

render_quota "📅" "$wk_used" "$wk_left" "$wk_sec"
wk_full=$q_full wk_full_w=$q_full_w wk_short=$q_short wk_short_w=$q_short_w

git_str="" git_w=0
if [ -n "$branch" ]; then
    git_str="  ${GIT} ${branch}${dirty}${RESET}"
    git_w=$((4 + ${#branch} + ${#dirty}))
fi

state_str="" state_w=0
if [ -n "$state" ] && [ "$state" != "idle" ]; then
    state_str="  ${DIM}[${state}]${RESET}"
    state_w=$((4 + ${#state}))
fi

ver_str="${LABEL}◈ CAROL v${carol_version}${RESET}"
ver_w=$((9 + ${#carol_version}))

model_str="" model_w=0
if [ -n "$model" ]; then
    model_str="  ${DIM}${model}${RESET}"
    model_w=$((2 + ${#model}))
fi

t1_w=$((role_w + 2 + ctx_w))
t2_w=$((t1_w + rl_short_w + wk_short_w))
t3_w=$((t1_w + rl_full_w + wk_full_w))
t4_w=$((ver_w + 2 + role_w + model_w + git_w + state_w + 2 + ctx_w + rl_full_w + wk_full_w))

if [ "$cols" -ge "$t4_w" ]; then
    out="${ver_str}  ${role_str}${model_str}${git_str}${state_str}  ${ctx_str}${rl_full}${wk_full}"
elif [ "$cols" -ge "$t3_w" ]; then
    out="${role_str}  ${ctx_str}${rl_full}${wk_full}"
elif [ "$cols" -ge "$t2_w" ]; then
    out="${role_str}  ${ctx_str}${rl_short}${wk_short}"
else
    out="${role_str}  ${ctx_str}"
fi

printf '%s\n' "$out"
