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

# Create symlink in ~/.local/bin
setup_path() {
    local CAROL_BIN="$CAROL_ROOT/bin"
    local LOCAL_BIN="$HOME/.local/bin"

    chmod +x "$CAROL_BIN/carol"

    mkdir -p "$LOCAL_BIN"
    ln -sf "$CAROL_BIN/carol" "$LOCAL_BIN/carol"
    success "Symlinked carol → $LOCAL_BIN/carol"

    if ! echo "$PATH" | tr ':' '\n' | grep -q "$LOCAL_BIN"; then
        notice "$LOCAL_BIN is not in your PATH"
        echo "  Add to your shell rc: export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
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

# Logo banner with gradient (cyan → magenta)
show_banner() {
    echo ""
    echo -e "\033[38;2;0;212;255m    ████████     ████     ██████████     ████████   ████        \033[0m"
    echo -e "\033[38;2;51;170;255m  ████░░░░░░   ████████   ████░░░░████ ████░░░░████ ████        \033[0m"
    echo -e "\033[38;2;102;128;255m████░░       ████░░░░████ ████    ████ ████    ████ ████        \033[0m"
    echo -e "\033[38;2;153;102;255m████         ████    ████ ██████████░░ ████    ████ ████        \033[0m"
    echo -e "\033[38;2;178;76;230m████         ████████████ ████░░████   ████    ████ ████        \033[0m"
    echo -e "\033[38;2;204;51;204m░░████       ████░░░░████ ████  ░░████ ████    ████ ████        \033[0m"
    echo -e "\033[38;2;230;25;179m  ░░████████ ████    ████ ████    ████ ░░████████░░ ████████████\033[0m"
    echo -e "\033[38;2;255;0;153m    ░░░░░░░░ ░░░░    ░░░░ ░░░░    ░░░░   ░░░░░░░░   ░░░░░░░░░░░░\033[0m"
    echo ""
    echo -e "\033[0;36mCognitive Amplification Role Orchestration for LLM agents\033[0m"
}

# Main installation
main() {
    show_banner
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
    info "Run:"
    echo "  carol version"
    echo "  carol init              # portable mode (default)"
    echo "  carol init --symlink    # symlink mode"
    echo ""
}

main "$@"
