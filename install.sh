#!/bin/bash
# install.sh - CAROL Framework One-Line Installer
#
# Usage:
#   Direct:  ./install.sh
#   Curl:    curl -fsSL https://raw.githubusercontent.com/jrengmusic/carol/main/install.sh | bash
#
# Custom install location:
#   CAROL_INSTALL_DIR=~/my/custom/path bash <(curl -fsSL ...)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default installation location
CAROL_INSTALL_DIR="${CAROL_INSTALL_DIR:-$HOME/.carol}"
CAROL_REPO="${CAROL_REPO:-https://github.com/jrengmusic/carol.git}"

error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

info() {
    echo -e "${YELLOW}→ $1${NC}"
}

notice() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Detect if running from cloned repo or curl-piped
detect_install_mode() {
    if [ -f "$(dirname "$0")/bin/carol" ]; then
        # Running from cloned repo
        CAROL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        INSTALL_MODE="local"
    else
        # Running from curl pipe
        CAROL_ROOT="$CAROL_INSTALL_DIR"
        INSTALL_MODE="remote"
    fi
}

# Clone CAROL repository
clone_carol() {
    if [ "$INSTALL_MODE" != "remote" ]; then
        return 0
    fi

    info "Installing CAROL to $CAROL_ROOT"

    # Check if already exists
    if [ -d "$CAROL_ROOT" ]; then
        info "CAROL already installed at $CAROL_ROOT"
        read -p "Reinstall? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
        rm -rf "$CAROL_ROOT"
    fi

    # Clone repository
    info "Cloning CAROL repository..."
    if ! git clone "$CAROL_REPO" "$CAROL_ROOT"; then
        error "Failed to clone repository"
    fi

    success "CAROL cloned to $CAROL_ROOT"
}

# Add to PATH
setup_path() {
    local CAROL_BIN="$CAROL_ROOT/bin"

    # Detect shell and RC file
    local SHELL_NAME=$(basename "$SHELL")
    local RC_FILE=""

    case "$SHELL_NAME" in
        bash)
            # macOS uses .bash_profile, Linux uses .bashrc
            if [[ "$OSTYPE" == "darwin"* ]]; then
                RC_FILE="$HOME/.bash_profile"
            else
                RC_FILE="$HOME/.bashrc"
            fi
            ;;
        zsh)
            RC_FILE="$HOME/.zshrc"
            ;;
        *)
            info "Unsupported shell: $SHELL_NAME"
            info "Please manually add to your PATH:"
            echo "  export PATH=\"$CAROL_BIN:\$PATH\""
            return 0
            ;;
    esac

    # Create RC file if it doesn't exist
    touch "$RC_FILE"

    # Check if already in PATH
    if grep -q "CAROL Framework" "$RC_FILE" 2>/dev/null; then
        success "CAROL already in PATH ($RC_FILE)"
    else
        info "Adding CAROL to PATH in $RC_FILE"
        cat >> "$RC_FILE" << 'EOF'

# CAROL Framework
export PATH="$HOME/.carol/bin:$PATH"
EOF
        success "Added to $RC_FILE"
    fi

    # Make carol executable
    chmod +x "$CAROL_BIN/carol"
}

# Verify installation
verify_install() {
    local CAROL_BIN="$CAROL_ROOT/bin"

    if [ ! -f "$CAROL_BIN/carol" ]; then
        error "Installation failed: carol command not found"
    fi

    # Verify required directories exist
    if [ ! -d "$CAROL_ROOT/roles" ]; then
        error "Installation failed: roles directory not found"
    fi

    if [ ! -d "$CAROL_ROOT/templates" ]; then
        error "Installation failed: templates directory not found"
    fi

    # Test carol command
    if "$CAROL_BIN/carol" version > /dev/null 2>&1; then
        success "Installation verified"
    else
        error "Installation failed: carol command not working"
    fi
}

# Main installation
main() {
    echo ""
    info "Cognitive Amplification Role Orchestration with LLM agents"
    echo ""

    detect_install_mode

    info "Install mode: $INSTALL_MODE"
    info "Install location: $CAROL_ROOT"
    echo ""

    clone_carol
    setup_path
    verify_install

    echo ""
    success "Installation complete!"
    echo ""
    info "To use CAROL, either:"
    echo "  1. Reload your shell:"
    if [ -n "$(command -v bash)" ]; then
        echo "     source ~/.bashrc  (bash on Linux)"
        echo "     source ~/.bash_profile  (bash on macOS)"
    fi
    if [ -n "$(command -v zsh)" ]; then
        echo "     source ~/.zshrc   (zsh)"
    fi
    echo "  2. Open a new terminal"
    echo ""
    info "Then run:"
    echo "  carol version"
    echo "  carol init              # symlink mode (default)"
    echo "  carol init --portable   # portable mode (full copy)"
    echo ""
    notice "OpenCode integration: carol init creates .opencode/agents/ with role definitions"
    echo ""
}

main "$@"
