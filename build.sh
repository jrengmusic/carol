#!/usr/bin/env bash
# CAROL build script — SSOT version renderer + sync.
#
# Usage:
#   ./build.sh              Re-render using current VERSION file
#   ./build.sh v0.0.8       Bump VERSION to 0.0.8, render templates, sync all hardcoded refs
#   ./build.sh 0.0.8        Same (leading 'v' is optional)
#
# Two passes:
#   1. Render every *.tmpl by substituting {{VERSION}} with VERSION file contents
#   2. Sync all hardcoded version strings (old → new) across the repo
#
# VERSION file is the single source of truth. No file may carry an older hardcoded version.
# Scope: text files only; .git/ and carol/ excluded.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Capture old version BEFORE any update
old_version=""
if [ -f VERSION ]; then
    old_version="$(tr -d '[:space:]' < VERSION)"
fi

if [ $# -gt 0 ]; then
    new_version="${1#v}"
    if ! [[ "$new_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "error: version must be X.Y.Z (got '$1')" >&2
        exit 1
    fi
    echo "$new_version" > VERSION
    echo "VERSION → $new_version"
fi

if [ ! -f VERSION ]; then
    echo "error: VERSION file missing" >&2
    exit 1
fi

version="$(tr -d '[:space:]' < VERSION)"
if [ -z "$version" ]; then
    echo "error: VERSION file is empty" >&2
    exit 1
fi

# Pass 1: render *.tmpl files
rendered=0
while IFS= read -r tmpl; do
    out="${tmpl%.tmpl}"
    sed "s/{{VERSION}}/$version/g" "$tmpl" > "$out"
    echo "  rendered $out"
    rendered=$((rendered + 1))
done < <(find . -name '*.tmpl' -not -path './.git/*' -not -path './carol/*')

# Pass 2: sync all hardcoded old_version → new_version (text files only)
synced=0
if [ -n "$old_version" ] && [ "$old_version" != "$version" ] \
   && [[ "$old_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
   && [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    while IFS= read -r f; do
        case "$f" in
            *.tmpl|VERSION) continue ;;
        esac
        perl -i -pe "s/\Q$old_version\E/$version/g" "$f"
        echo "  synced $f"
        synced=$((synced + 1))
    done < <(grep -rlF "$old_version" . --exclude-dir=.git --exclude-dir=carol 2>/dev/null)
fi

echo "built $rendered files at version $version, synced $synced files"
