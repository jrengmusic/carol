#!/bin/bash
# agy-statusline.sh - CAROL Context Rot Meter & Status Line for Antigravity CLI (agy)

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
    DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
CAROL_ROOT="$( cd -P "$( dirname "$SOURCE" )/../.." >/dev/null 2>&1 && pwd )"

data=$(cat)
mkdir -p "$CAROL_ROOT/.tmp"

carol_version=$(tr -d '[:space:]' < "$CAROL_ROOT/VERSION" 2>/dev/null)
carol_version=${carol_version:-"0.0.31"}

python3 -c '
import sys, json, os

SEGMENTS = 10
DEFAULT_FILL_PERCENT = 80
DEFAULT_TERMINAL_WIDTH = 120

RESET = "\033[0m"
BOLD = "\033[1m"
BG_DARK = "\033[48;5;236m"
DIM = "\033[38;2;51;83;91m"
LABEL = "\033[38;2;105;157;170m"
GIT = "\033[38;2;140;100;180m"

COLOR_LOW = "\033[38;2;51;83;91m"
COLOR_MED = "\033[38;2;0;150;160m"
COLOR_HIGH = "\033[38;2;200;120;50m"
COLOR_CRIT = "\033[38;2;252;112;76m"

ROLE_STYLES = {
    "ORACLE": "\033[48;2;217;119;41m\033[38;2;9;13;18m",
    "COUNSELOR": "\033[48;2;0;200;216m\033[38;2;9;13;18m",
    "MACHINIST": "\033[48;2;160;160;160m\033[38;2;9;13;18m",
    "ENGINEER": "\033[48;2;40;120;220m\033[38;2;9;13;18m",
}
DEFAULT_ROLE_STYLE = "\033[48;2;78;140;147m\033[38;2;9;13;18m"


def threshold_color(used_pct):
    if used_pct >= 75:
        return COLOR_CRIT
    if used_pct >= 50:
        return COLOR_HIGH
    if used_pct >= 25:
        return COLOR_MED
    return COLOR_LOW


def ctx_emoji_for(used_pct):
    if used_pct >= 75:
        return "🥵"
    if used_pct >= 50:
        return "😟"
    if used_pct >= 25:
        return "😐"
    return "😊"


def build_bar(used_pct, color):
    filled = max(0, min(SEGMENTS, int(used_pct * SEGMENTS // 100)))
    cells = "".join(f"{color}{BOLD}█" if i < filled else " " for i in range(SEGMENTS))
    return f"{BG_DARK}{cells}{RESET}"


def fmt_eta(seconds):
    if seconds <= 0:
        return ""
    days, rem = divmod(seconds, 86400)
    hours, rem = divmod(rem, 3600)
    mins = rem // 60
    if days:
        return f"{days}d{hours:02d}h"
    if hours:
        return f"{hours}h{mins:02d}m"
    return f"{mins}m"


def parse_quota(quota, key):
    entry = quota.get(key)
    if not isinstance(entry, dict) or "remaining_fraction" not in entry:
        return None
    rem_frac = float(entry.get("remaining_fraction", 1.0))
    left_pct = max(0, min(100, int(round(rem_frac * 100.0))))
    used_pct = 100 - left_pct
    eta = fmt_eta(int(entry.get("reset_in_seconds", 0) or 0))
    return used_pct, left_pct, eta


data = {}
try:
    data = json.load(sys.stdin)
except Exception:
    pass

session_id = data.get("session_id", "") or "default"
try:
    tmp_dir = os.path.expanduser("~/.carol/.tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    with open(f"{tmp_dir}/statusline_agy_{session_id}.json", "w") as f:
        json.dump(data, f)
except Exception:
    pass

model = ((data.get("model") or {}).get("display_name") or "").replace(" (1M context)", "").strip()

cw = data.get("context_window") or {}
raw_pct = float(cw.get("used_percentage", 0) or 0)
total_tokens = int(cw.get("total_input_tokens", 0) or 0)
divisor = int(os.environ.get("CAROL_CONTEXT_DIVISOR", "0") or 0)
fill_percent = int(os.environ.get("CAROL_CONTEXT_FILL_PERCENT", str(DEFAULT_FILL_PERCENT)) or DEFAULT_FILL_PERCENT) or DEFAULT_FILL_PERCENT

if divisor > 0 and total_tokens > 0:
    pct_f = min(total_tokens * 100.0 / divisor, 100.0)
else:
    pct_f = max(0.0, min(raw_pct, 100.0))

pct = int(round(pct_f))
scaled = min(int(round(pct_f * 100.0 / fill_percent)), 100)

agent = ((data.get("agent") or {}).get("name") or "").strip()
if not agent:
    agent = os.environ.get("CAROL_ROLE", "").strip()
if not agent:
    try:
        with open(os.path.expanduser("~/.carol/.carol-role"), "r") as rf:
            agent = rf.read().strip()
    except Exception:
        pass
if not agent:
    agent = "COUNSELOR"
agent = agent.upper()

role_bg = ROLE_STYLES.get(agent, DEFAULT_ROLE_STYLE)
role_str = f"{role_bg}{BOLD} {agent} {RESET}"
role_w = len(agent) + 2

ctx_color = threshold_color(scaled)
ctx_emoji = ctx_emoji_for(scaled)
ctx_bar = build_bar(scaled, ctx_color)
ctx_str = f"{ctx_emoji}{ctx_bar} {DIM}{pct}%{RESET}"
ctx_w = 2 + SEGMENTS + 1 + len(str(pct)) + 1

quota = data.get("quota") or {}
model_lower = model.lower()
if "claude" in model_lower or "gpt" in model_lower:
    rl_key, wk_key = "3p-5h", "3p-weekly"
elif "argon" in model_lower:
    rl_key, wk_key = "gemini-5h", "gemini-argon-wtu-weekly"
else:
    rl_key, wk_key = "gemini-5h", "gemini-weekly"

rl = parse_quota(quota, rl_key)
wk = parse_quota(quota, wk_key)


def render_quota(icon, q):
    if q is None:
        return "", 0, "", 0
    used_pct, left_pct, eta = q
    clr = threshold_color(used_pct)
    qbar = build_bar(used_pct, clr)
    eta_part = f" {DIM}{eta}{RESET}" if eta else ""
    full = f"  {DIM}{icon}{RESET}{qbar} {clr}{left_pct}%{RESET}{eta_part}"
    full_w = 2 + 2 + SEGMENTS + 1 + len(str(left_pct)) + 1 + (1 + len(eta) if eta else 0)
    short = f"  {DIM}{icon}{RESET}{clr}{left_pct}%{RESET}"
    short_w = 2 + 2 + len(str(left_pct)) + 1
    return full, full_w, short, short_w


rl_full, rl_full_w, rl_short, rl_short_w = render_quota("🕔", rl)
wk_full, wk_full_w, wk_short, wk_short_w = render_quota("📅", wk)

vcs = data.get("vcs") or {}
branch = vcs.get("branch", "") or ""
dirty = "*" if vcs.get("dirty") else ""
git_str = f"  {GIT} {branch}{dirty}{RESET}" if branch else ""
git_w = (4 + len(branch) + len(dirty)) if branch else 0

state = data.get("agent_state", "") or ""
state_str = f"  {DIM}[{state}]{RESET}" if state and state != "idle" else ""
state_w = (4 + len(state)) if state_str else 0

carol_version = sys.argv[1] if len(sys.argv) > 1 else "0.0.31"
ver_str = f"{LABEL}◈ CAROL v{carol_version}{RESET}"
ver_w = 9 + len(carol_version)
model_str = f"  {DIM}{model}{RESET}" if model else ""
model_w = (2 + len(model)) if model else 0

cols = int(data.get("terminal_width", 0) or DEFAULT_TERMINAL_WIDTH)

t1_w = role_w + 2 + ctx_w
t2_w = t1_w + rl_short_w + wk_short_w
t3_w = t1_w + rl_full_w + wk_full_w
t4_w = ver_w + 2 + role_w + model_w + git_w + state_w + 2 + ctx_w + rl_full_w + wk_full_w

if cols >= t4_w:
    out = f"{ver_str}  {role_str}{model_str}{git_str}{state_str}  {ctx_str}{rl_full}{wk_full}"
elif cols >= t3_w:
    out = f"{role_str}  {ctx_str}{rl_full}{wk_full}"
elif cols >= t2_w:
    out = f"{role_str}  {ctx_str}{rl_short}{wk_short}"
else:
    out = f"{role_str}  {ctx_str}"

sys.stdout.write(out + "\n")
' "$carol_version" <<< "$data"
