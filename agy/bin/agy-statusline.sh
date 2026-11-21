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

# Read version
carol_version=$(tr -d '[:space:]' < "$CAROL_ROOT/VERSION" 2>/dev/null)
carol_version=${carol_version:-"0.0.31"}

python3 -c '
import sys, json, os

data = {}
try:
    data = json.load(sys.stdin)
except Exception:
    pass

session_id = data.get("session_id", "") or "default"
if session_id:
    try:
        tmp_dir = os.path.expanduser("~/.carol/.tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        with open(f"{tmp_dir}/statusline_agy_{session_id}.json", "w") as f:
            json.dump(data, f)
    except Exception:
        pass

# Palette
reset = "\033[0m"
bold = "\033[1m"
bg_dark = "\033[48;5;236m"
dim_color = "\033[38;2;51;83;91m"
label_color = "\033[38;2;105;157;170m"
git_color = "\033[38;2;140;100;180m"

# Extract fields
model = (data.get("model", {}) or {}).get("display_name", "") or ""
model = model.replace(" (1M context)", "").strip()

cw = data.get("context_window", {}) or {}
raw_pct = cw.get("used_percentage", 0) or 0
try:
    pct = int(float(raw_pct))
except Exception:
    pct = 0
pct = max(0, min(100, pct))

agent = (data.get("agent", {}) or {}).get("name", "") or ""
if not agent:
    agent = os.environ.get("CAROL_ROLE", "")
    if not agent:
        try:
            with open(os.path.expanduser("~/.carol/.carol-role"), "r") as rf:
                agent = rf.read().strip()
        except Exception:
            pass
    if not agent:
        agent = "COUNSELOR"
agent = agent.upper()

# Context threshold color & emoji
if pct >= 75:
    bar_color = "\033[38;2;252;112;76m"; ctx_emoji = "🥵"
elif pct >= 50:
    bar_color = "\033[38;2;200;120;50m"; ctx_emoji = "😟"
elif pct >= 25:
    bar_color = "\033[38;2;0;150;160m"; ctx_emoji = "😐"
else:
    bar_color = "\033[38;2;51;83;91m"; ctx_emoji = "😊"

# Bar (10 segments)
segments = 10
filled = int(round(pct * segments / 100.0))
bar_chars = "".join([f"{bar_color}{bold}█" if i < filled else " " for i in range(segments)])
bar = f"{bg_dark}{bar_chars}{reset}"

# Role badge
role_bg = "\033[48;2;78;140;147m\033[38;2;9;13;18m"
if agent == "ORACLE":
    role_bg = "\033[48;2;217;119;41m\033[38;2;9;13;18m"
elif agent == "COUNSELOR":
    role_bg = "\033[48;2;0;200;216m\033[38;2;9;13;18m"
elif agent == "MACHINIST":
    role_bg = "\033[48;2;160;160;160m\033[38;2;9;13;18m"
elif agent == "ENGINEER":
    role_bg = "\033[48;2;40;120;220m\033[38;2;9;13;18m"

role_label = f"{role_bg}{bold} {agent} {reset}"

# VCS / Git
vcs = data.get("vcs", {}) or {}
branch = vcs.get("branch", "")
dirty = "*" if vcs.get("dirty") else ""
git_str = f"  {git_color} {branch}{dirty}{reset}" if branch else ""

# State
state = data.get("agent_state", "")
state_str = f"  {dim_color}[{state}]{reset}" if state and state not in ("idle", "") else ""

carol_version = sys.argv[1] if len(sys.argv) > 1 else "0.0.31"

cols = data.get("terminal_width", 0) or 120

# Assemble
ver_str = f"{label_color}◈ CAROL v{carol_version}{reset}"
ctx_str = f"{ctx_emoji}{bar} {dim_color}{pct}%{reset}"

if cols >= 100:
    out = f"{ver_str}  {role_label}  {dim_color}{model}{reset}{git_str}{state_str}  {ctx_str}"
elif cols >= 70:
    out = f"{role_label}  {dim_color}{model}{reset}{git_str}  {ctx_str}"
else:
    out = f"{role_label}  {ctx_str}"

sys.stdout.write(out + "\n")
' "$carol_version" <<< "$data"
