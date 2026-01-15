#!/bin/bash
# install.sh - CAROL Framework Installation Script
#
# Purpose: Add CAROL CLI tool to PATH
# Usage: ./install.sh

set -e

CAROL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAROL_BIN="$CAROL_ROOT/bin"

echo "Installing CAROL Framework..."
echo "CAROL root: $CAROL_ROOT"

# Detect shell
SHELL_NAME=$(basename "$SHELL")
case "$SHELL_NAME" in
    bash)
        RC_FILE="$HOME/.bashrc"
        PROFILE_FILE="$HOME/.bash_profile"
        ;;
    zsh)
        RC_FILE="$HOME/.zshrc"
        PROFILE_FILE="$HOME/.zprofile"
        ;;
    *)
        echo "Unsupported shell: $SHELL_NAME"
        echo "Please manually add to your PATH:"
        echo "  export PATH=\"\$PATH:$CAROL_BIN\""
        exit 1
        ;;
esac

# Check if already in PATH
if echo "$PATH" | grep -q "$CAROL_BIN"; then
    echo "✓ CAROL bin already in PATH"
else
    echo "Adding CAROL bin to PATH in $RC_FILE"
    echo "" >> "$RC_FILE"
    echo "# CAROL Framework" >> "$RC_FILE"
    echo "export PATH=\"\$PATH:$CAROL_BIN\"" >> "$RC_FILE"
    echo "✓ Added to $RC_FILE"
fi

# Make carol executable
chmod +x "$CAROL_BIN/carol"

echo ""
echo "✓ Installation complete!"
echo ""
echo "To use CAROL, either:"
echo "  1. Reload your shell: source $RC_FILE"
echo "  2. Start a new terminal session"
echo ""
echo "Then run: carol version"
