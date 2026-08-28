# ARCHITECT Profile

**Expert in C++17, JUCE, audio DSP, and KANJUT framework architecture.**

## User Profile
- 10+ years C++17/JUCE audio DSP
- Music producer, production-grade real-time audio architect
- Production code only — no pseudocode
- If uncertain: research first, don't assume
- Neovim user
- JRENG (Javanese) = bayar lunas / tunai — paid in full, no debt

## Domain
Audio software — DAW plugins (VST3, AU, AAX) built with C++ and JUCE framework.

## Projects (authored, developed, and maintained by ARCHITECT)

### END — Ephemeral Nexus Display
- GPU-accelerated terminal emulator, C++17/JUCE + JAM
- `~/Documents/Poems/dev/end/`

### TIT — Terminal Interface for git
- State-aware git TUI with zero-surprise guarantee, C++17/JUCE + JAM
- `~/Documents/Poems/dev/tit/`

### CAKE — CMake Project Manager TUI
- Context-aware cmake operations (generate/build/clean/open IDE), C++17/JUCE + JAM
- `~/Documents/Poems/dev/cake/`

### WHATDBG — DAP Debug Adapter
- Cross-platform DAP debug adapter for neovim — Windows (dbgeng/PDB) and macOS (liblldb/DWARF), one tool, identical DX; C++17/JUCE + JAM
- Headless-scriptable over DAP stdio; on macOS it debugs without the Developer-Tools permission dialog raw lldb triggers
- `~/Documents/Poems/dev/whatdbg/`

### Kuassa — Audio Plugin Framework
- Shared framework libraries and plugin projects, C++17/JUCE + KANJUT
- `~/Documents/Poems/kuassa/`

### CAROL — Cognitive Amplification Role Orchestration with LLM agents
- Multi-agent framework for cognitive amplification
- `~/.carol/`

### CAROLINE — CAROL Interface Native Environment
- Native C++/JUCE interface for CAROL, C++17/JUCE
- `~/Documents/Poems/dev/caroline/`

## Frameworks (authored, developed, and maintained by ARCHITECT)

Three independent frameworks under `~/Documents/Poems/`. Completely decoupled — no project mixes frameworks, no cross-framework module sharing.

- **JAM** — JRENG Architectural Modules (main framework) — `~/Documents/Poems/dev/jam/`
- **KANJUT** v2.0 — `~/Documents/Poems/kuassa/___lib___/`
- **CIUM** v1.0 — `~/Documents/Poems/iqala/___cium___/`

## Experience
- C++ (JUCE, real-time audio, plugin architecture)
- Cross-platform development: macOS (Intel + ARM) and Windows (MSYS2/zsh, MSVC, clang-cl)
- Build systems: CMake, Ninja, vcvarsall, clang toolchains
- Debugging: whatdbg on both platforms — liblldb/DWARF on macOS, dbgeng/PDB on Windows — DAP protocol; codelldb/LLDB as macOS fallback
- Terminal tooling: nvim, zsh, tmux, lazy.nvim, LSP, treesitter
- Infrastructure: monorepo ~/.config syncing 4 dev machines (2 macOS, 2 Windows) with identical DX
- LLM agent orchestration: multi-agent workflows, role separation, cognitive load distribution

## Stack
- C++17, JUCE, JAM / KANJUT / CIUM frameworks, CMake + Ninja
- Neovim (Lua config), zsh, tmux, END
- macOS (Xcode clang) + Windows (MSVC + clang-cl via MSYS2)
- Git, GitHub

Voice, terseness, and address rules: CAROL output style (`~/.carol/output-styles.md`).
