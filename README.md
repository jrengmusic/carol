# CAROL Framework

**C**ognitive **A**mplification **R**ole **O**rchestration with **LLM** agents

Version: 0.1.0

## What is CAROL?

CAROL is a role-based agent orchestration framework for collaborative software development. It defines specialized roles (ANALYST, SCAFFOLDER, CARETAKER, INSPECTOR, SURGEON, JOURNALIST) with explicit constraints, preventing scope creep and ensuring clear handoffs between agents.

**Born from real failures:** CAROL was created to prevent documented LLM failure patterns that cost $120+ in wasted API calls. See [LESSONS_LEARNED.md](#) for the full story.

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

```bash
# Clone CAROL framework
git clone https://github.com/jrengmusic/carol.git
cd carol

# Add to PATH
./install.sh

# Reload shell or start new terminal
source ~/.zshrc  # or ~/.bashrc
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
├── PATTERNS.md               # LLM meta-patterns (coming soon)
├── SCRIPTS.md                # Script documentation (coming soon)
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
│   ├── PATTERNS.md → ... (symlink)
│   ├── scripts/ → ... (symlink)
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
- [ ] `PATTERNS.md` - LLM meta-patterns for problem-solving
- [ ] `SCRIPTS.md` - Code editing automation
- [ ] Shell scripts (safe-edit.sh, etc.)
- [ ] Slash command integration (`/carol`)
- [ ] Test suite
- [ ] Examples directory
- [ ] Video tutorials

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

Created by JRENG to orchestrate free-tier LLM agents without burning budget on failures.

**Rock 'n Roll!**
**JRENG!**

---

## Documentation

- [CAROL.md](./CAROL.md) - Complete role definitions
- [SPEC-WRITER.md](./SPEC-WRITER.md) - How ANALYST writes specs
- [ARCHITECTURE-WRITER.md](./ARCHITECTURE-WRITER.md) - How agents document architecture
- [SESSION-LOG.md](./templates/SESSION-LOG.md) - Session tracking template

## Support

- Issues: https://github.com/jrengmusic/carol/issues
- Discussions: https://github.com/jrengmusic/carol/discussions
