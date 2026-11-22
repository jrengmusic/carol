#!/usr/bin/env bash
set -euo pipefail

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
    DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
AGY_ROOT="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
CAROL_ROOT="$( cd -P "$AGY_ROOT/.." >/dev/null 2>&1 && pwd )"
PLUGIN_DIR="$HOME/.gemini/config/plugins/carol"
GLOBAL_SKILLS_DIR="$HOME/.gemini/config/skills"
LOCAL_BIN="$HOME/.local/bin"

mkdir -p "$PLUGIN_DIR/agents" "$PLUGIN_DIR/hooks" "$PLUGIN_DIR/rules" "$PLUGIN_DIR/skills" "$LOCAL_BIN"

cp "$AGY_ROOT/plugin.json" "$PLUGIN_DIR/plugin.json"
cp "$AGY_ROOT/hooks.json" "$PLUGIN_DIR/hooks.json"
cp "$AGY_ROOT/mcp_config.json" "$PLUGIN_DIR/mcp_config.json"

rm -rf "$PLUGIN_DIR/agents" "$PLUGIN_DIR/mcp" "$PLUGIN_DIR/rules" "$PLUGIN_DIR/skills"
mkdir -p "$PLUGIN_DIR/agents" "$PLUGIN_DIR/rules" "$PLUGIN_DIR/skills"

cp -R "$AGY_ROOT/agents/." "$PLUGIN_DIR/agents/"
cp "$AGY_ROOT/hooks/agy-gate.mjs" "$PLUGIN_DIR/hooks/agy-gate.mjs"

# Refresh rules from SSOT in ~/.carol/
cp "$CAROL_ROOT/CAROL.md" "$PLUGIN_DIR/rules/AGENTS.md"
python3 -c '
import pathlib, sys
carol_root = pathlib.Path(sys.argv[1])
plugin_rules = pathlib.Path(sys.argv[2])
style = (carol_root / "output-styles.md").read_text()
if style.startswith("---\n"):
    style = style.split("---\n", 2)[2].lstrip("\n")
(plugin_rules / "output-styles.md").write_text("---\ntrigger: always_on\n---\n\n" + style)
arch = (carol_root / "ARCHITECT.md").read_text()
(plugin_rules / "architect.md").write_text("---\ntrigger: always_on\n---\n\n" + arch)
' "$CAROL_ROOT" "$PLUGIN_DIR/rules"

# Copy core skills to plugin and command skills to global skills for bare /<cmd> names
cp -R "$CAROL_ROOT/skills/." "$PLUGIN_DIR/skills/"
mkdir -p "$GLOBAL_SKILLS_DIR"
for cmd_dir in "$AGY_ROOT/skills"/*/; do
    cmd_name="$(basename "$cmd_dir")"
    rm -rf "$GLOBAL_SKILLS_DIR/$cmd_name"
    cp -R "${cmd_dir%/}" "$GLOBAL_SKILLS_DIR/$cmd_name"
done

chmod +x "$AGY_ROOT/bin/agycarol" "$AGY_ROOT/bin/agyoracle" "$AGY_ROOT/bin/agymachine" "$AGY_ROOT/bin/agy-statusline.sh" "$PLUGIN_DIR/hooks/agy-gate.mjs"

ln -sf "$AGY_ROOT/bin/agycarol" "$LOCAL_BIN/agycarol"
ln -sf "$AGY_ROOT/bin/agyoracle" "$LOCAL_BIN/agyoracle"
ln -sf "$AGY_ROOT/bin/agymachine" "$LOCAL_BIN/agymachine"

# Configure cross-platform statusLine in agy settings
python3 -c '
import json, pathlib
settings_path = pathlib.Path.home() / ".gemini" / "antigravity-cli" / "settings.json"
settings_path.parent.mkdir(parents=True, exist_ok=True)
data = json.loads(settings_path.read_text(encoding="utf-8")) if settings_path.exists() else {}
data["statusLine"] = {
    "type": "command",
    "command": "bash ~/.carol/agy/bin/agy-statusline.sh",
}
settings_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
'

agy plugin validate "$PLUGIN_DIR"
