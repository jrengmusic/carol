# CAROL Framework

**C**ognitive **A**mplification **R**ole **O**rchestration with **LLM** agents

Version: 1.0.0

## What is CAROL?

CAROL is a role-based agent orchestration framework for collaborative software development. It defines specialized roles with explicit constraints, preventing scope creep and ensuring clear handoffs between agents.

### Specialized Roles

- **ANALYST** - Requirements analyst and planning specialist. Asks clarifying questions, gathers requirements, writes specifications in SPEC.md, and creates architecture documentation. Never writes code directly.

- **SCAFFOLDER** - Literal code generator. Implements features exactly as specified in kickoff documents. Generates boilerplate, structures, and straightforward implementations. Does not add features, optimize, or make architectural decisions.

- **CARETAKER** - Code polisher and reviewer. Adds error handling, validation, and defensive programming. Improves existing code without changing behavior. Focuses on robustness, not cleverness.

- **INSPECTOR** - Pre-commit auditor. Performs systematic code review before commits. Validates against SPEC.md, checks architectural constraints, verifies style compliance. Reports findings, does not fix code.

- **SURGEON** - Complex fix specialist. Handles bugs, performance issues, and architectural corrections. Reads RESET context, identifies root cause, implements minimal surgical fixes. Does not refactor unless required.

- **JOURNALIST** - Documentation synthesizer. Compiles session summaries from SESSION-[N]-*.md files into SESSION-LOG.md. Maintains project timeline, tracks decisions, creates audit trail.

## Key Features

- **Role-Based Constraints:** 6 specialized roles with explicit behavioral rules
- **Agent-Agnostic:** Works with any LLM CLI tool (Claude Code, Amp, Copilot, Gemini, etc.)
- **Language-Agnostic:** Supports any programming language/framework
- **TDD-Friendly:** Built-in testing patterns and scripts
- **Git-Tracked:** Framework evolution tracked, projects reference SSOT
- **Flexible Distribution:**
  - **Symlink mode (default):** Update SSOT once → all projects update
  - **Portable mode:** Full copy, works offline, project self-contained

## Quick Start

### Installation

**One-Line Install (Recommended):**
```bash
curl -fsSL https://raw.githubusercontent.com/jrengmusic/carol/main/install.sh | bash
```

This will:
- Clone CAROL to `~/.carol`
- Add `carol` command to your PATH
- Work on macOS and Linux with bash/zsh

Then reload your shell:
```bash
source ~/.zshrc   # zsh
# OR
source ~/.bashrc  # bash
```

**Manual Install:**
```bash
git clone https://github.com/jrengmusic/carol.git ~/.carol
~/.carol/install.sh
source ~/.zshrc  # or ~/.bashrc
```

**Custom Install Location:**
```bash
CAROL_INSTALL_DIR=~/my/custom/path bash <(curl -fsSL https://raw.githubusercontent.com/jrengmusic/carol/main/install.sh)
```

### Initialize in Project

```bash
# In your project directory
cd /path/to/your/project

# Initialize CAROL (symlink mode - recommended)
carol init

# OR: Initialize in portable mode
carol init --portable
```

### Usage

```bash
# Check version
carol version

# Show help
carol help

# Update framework (symlink mode)
carol update
```

### Activate an Agent

After `carol init`, activate an agent by reading role definitions:

```
Read .carol/CAROL.md. You are assigned as ANALYST, register yourself in .carol/SESSION-LOG.md
```

### Uninstall

**One-Line Uninstall:**
```bash
curl -fsSL https://raw.githubusercontent.com/jrengmusic/carol/main/uninstall.sh | bash
```

This will:
- Remove `~/.carol` directory (with confirmation)
- Clean up PATH from shell configuration files
- Create backups of modified files
- Warn about projects still using CAROL

Then reload your shell:
```bash
source ~/.zshrc   # zsh
# OR
source ~/.bashrc  # bash
```

## Available Roles

| Role | Purpose | When to Use |
|------|---------|-------------|
| **ANALYST** | Requirements analyst | "Plan this feature" |
| **SCAFFOLDER** | Literal code generator | "Scaffold this module" |
| **CARETAKER** | Code polisher/reviewer | "Add error handling" |
| **INSPECTOR** | Pre-commit auditor | "Audit phase N" |
| **SURGEON** | Complex fix specialist | "Fix this bug" |
| **JOURNALIST** | Documentation synthesizer | "Log this session" |

## How It Works

1. **Initialize:** `carol init` creates `.carol/` directory with framework
2. **Assign Role:** Agent reads `CAROL.md` and registers in `SESSION-LOG.md`
3. **Execute:** Agent follows role constraints (e.g., SCAFFOLDER generates code literally)
4. **Document:** Agent writes `SESSION-[N]-[TASK]-*.md` after task
5. **Compile:** JOURNALIST compiles all summaries into `SESSION-LOG.md`

## Architecture

**CAROL SSOT (This Repository):**
```
___CAROL___/
├── CAROL.md                  # Role definitions (immutable)
├── AGENTS.md                 # Agent self-assessments & recommendations
├── PATTERNS.md               # LLM meta-patterns
├── SCRIPTS.md                # Script documentation
├── PATTERNS-WRITER.md        # Pattern discovery guide
├── SPEC-WRITER.md            # Analyst conversation guide
├── ARCHITECTURE-WRITER.md    # Architecture documentation guide
├── templates/                # Project templates
│   ├── SESSION-LOG.md
│   ├── ARCHITECTURE.md
│   └── config.yml
├── scripts/                  # Code editing scripts (coming soon)
├── bin/carol                 # CLI tool
└── install.sh                # Installation script
```

**Project After `carol init`:**
```
your-project/
├── .carol/
│   ├── CAROL.md → ___CAROL___/CAROL.md (symlink)
│   ├── AGENTS.md → ___CAROL___/AGENTS.md (symlink)
│   ├── PATTERNS.md → ___CAROL___/PATTERNS.md (symlink)
│   ├── SCRIPTS.md → ___CAROL___/SCRIPTS.md (symlink)
│   ├── PATTERNS-WRITER.md → ___CAROL___/PATTERNS-WRITER.md (symlink)
│   ├── SPEC-WRITER.md → ___CAROL___/SPEC-WRITER.md (symlink)
│   ├── ARCHITECTURE-WRITER.md → ___CAROL___/ARCHITECTURE-WRITER.md (symlink)
│   ├── scripts/ → ___CAROL___/scripts/ (symlink)
│   ├── SESSION-LOG.md (copied, customized)
│   ├── ARCHITECTURE.md (copied, customized)
│   ├── SPEC.md (you create)
│   └── SESSION-[N]-*.md (temp files)
├── src/                      # Your code
└── .gitignore
```

## Principles

CAROL aligns with **LIFE STAR + LOVE** principles:

**LIFE STAR:**
- **L**ean - Simple, focused roles
- **I**mmutable - Deterministic behavior
- **F**indable - Clear documentation
- **E**xplicit - No hidden state
- **S**SOT - Single source of truth
- **T**estable - TDD approach
- **A**ccessible - Works with any agent
- **R**eviewable - Clear attribution

**LOVE:**
- **L**istens - Fail fast, user feedback
- **O**ptimizes - Prevents wasted cycles
- **V**alidates - Enforces correctness
- **E**mpathizes - Human-centric design

## Roadmap

- [x] CLI tool (`carol init`, `update`, `version`)
- [x] Symlink + portable modes
- [x] Template system
- [x] `PATTERNS.md` - LLM meta-patterns for problem-solving
- [x] `SCRIPTS.md` - Code editing automation (documentation)
- [x] `PATTERNS-WRITER.md` - Pattern discovery guide
- [x] Shell scripts - safe-edit.sh, safe-insert.sh, generate-error-handler.sh, generate-validation.sh, validate-code.sh, rename-symbol.sh
- [ ] Slash command integration (`/carol`)
- [ ] Test suite (partial - safe-edit.sh, safe-insert.sh, generate-error-handler.sh, generate-validation.sh have full TDD coverage)

## Why CAROL?

### The Problem

LLMs suffer from:
- **Scope creep:** Adding features not requested
- **Cognitive overload:** Reading entire codebase, hitting session limits
- **Autonomous mistakes:** Making changes without asking
- **Inconsistent patterns:** Each agent invents new approaches

### The Solution

CAROL provides:
- **Role constraints:** Can't add features if you're SCAFFOLDER
- **Context isolation:** Each role reads only what they need
- **Registration guardrail:** Must check role before acting
- **Systematic patterns:** Problem decomposition, debug methodology, self-validation

**Result:** Reduced failures, lower costs, faster development.

## Contributing

Contributions welcome! This framework is:
- **Agent-agnostic** - Works with any LLM CLI
- **Language-agnostic** - Supports any tech stack
- **Battle-tested** - Born from real production failures

## License

MIT License - See LICENSE file

## Author

Created by JRENG to orchestrate LLM agents.

For collaborative software development.

Rock 'n Roll!

**JRENG!** 🎸

---

## Documentation

- [CAROL.md](./CAROL.md) - Complete role definitions
- [AGENTS.md](./AGENTS.md) - Agent self-assessments and assignment recommendations
- [PATTERNS.md](./PATTERNS.md) - LLM meta-patterns for problem-solving
- [SCRIPTS.md](./SCRIPTS.md) - Code editing automation catalog
- [PATTERNS-WRITER.md](./PATTERNS-WRITER.md) - Pattern discovery guide
- [SPEC-WRITER.md](./SPEC-WRITER.md) - How ANALYST writes specs
- [ARCHITECTURE-WRITER.md](./ARCHITECTURE-WRITER.md) - How agents document architecture
- [SESSION-LOG.md](./templates/SESSION-LOG.md) - Session tracking template

## Support

- Issues: https://github.com/jrengmusic/carol/issues
- Discussions: https://github.com/jrengmusic/carol/discussions
