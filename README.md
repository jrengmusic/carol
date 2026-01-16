# CAROL
**C**ognitive **A**mplification **R**ole **O**rchestration with **LLM** agents

Version: 1.0.0

CAROL never meant to be used for 100% vibing, you could if you want. But it helps agents drifting from the course of development while maintaining human still responsible for every lines of code.

CAROL also works effectively as a rapid prototyping methodology for experienced architects exploring unfamiliar stacks.

## Why

Just like all other softwares, one day inevitably this framework might be obsolete. But as today at its infancy, LLM agents are unreliable assistance for development. Objectively, whatever commercial agentic models available today it always produce deterministic binary results. Either they could populate super fast thousands of lines of codes that might work or it will just give you piles of garbage that will exhaust your tokens, credits, time, patient and eventually your sanity to debug.

### Solution
**1. You maintain architectural coherence:** No agent can fuck up the big picture because you're the one holding it. You're validating intent at each handoff.

**2. Domain transfer without syntax debt:** Fuck MCP. You are the living experience of Human Context Protocol. You control the flow. You are the architect. The agents translate your architectural intent into the programming language syntax.

## What

CAROL is a role-based agent orchestration framework for collaborative software development. It defines specialized roles with explicit constraints, preventing scope creep and ensuring clear handoffs between agents.

### Specialized Roles

- **ANALYST** - Requirements analyst and planning specialist. Asks clarifying questions, gathers requirements, writes specifications in SPEC.md, and creates architecture documentation. Never writes code directly. Hand over SPEC-WRITER.md and ARCHITECTURE-WRITER.md as your instructions, ANALYST will clarify your intent from vague ideas into formalized development documents. 

- **SCAFFOLDER** - Literal code generator. Implements features exactly as specified in kickoff documents. Generates boilerplate, structures, and straightforward implementations. Does not add features, optimize, or make architectural decisions.

- **CARETAKER** - Code polisher and reviewer. Adds error handling, validation, and defensive programming. Improves existing code without changing behavior. Focuses on robustness, not cleverness.

- **INSPECTOR** - Pre-commit auditor. Performs systematic code review before commits. Validates against SPEC.md, checks architectural constraints, verifies style compliance. Reports findings, does not fix code.

- **SURGEON** - Complex fix specialist. Handles bugs, performance issues, and architectural corrections. Reads RESET context, identifies root cause, implements minimal surgical fixes. Does not refactor unless required.

- **JOURNALIST** - Documentation synthesizer. Compiles session summaries from SESSION-[N]-*.md files into SESSION-LOG.md. Maintains project timeline, tracks decisions, creates audit trail.

### The cognitive load distribution:
**Old model (single agent handles everything):**
```
Single agent's context:
├─ Your project architecture (10k tokens)
├─ All previous decisions (20k tokens)
├─ Current feature requirements (5k tokens)
├─ Implementation details (15k tokens)
├─ All the code it wrote (30k tokens)
├─ Your feedback on what's wrong (10k tokens)
└─ Trying to fix while remembering all above (failing)

Total cognitive load: 90k+ tokens
Result: Single agent makes mistakes, over-engineers, loses track
```

**CAROL (distributed roles):**
```
ANALYST's context:
└─ Feature requirements + asking clarifying questions
   (5k tokens, laser-focused on planning)

SCAFFOLDER's context:
└─ SESSION-N-TASK.md + scaffold these files
   (3k tokens, literal execution)

CARETAKER's context:
└─ Scaffolding to working implementation
   (8k tokens, focused on structural review)

SURGEON's context (when escalated):
└─ Specific complex problem + what failed + fix this one thing
   (8k tokens, surgical fix)
   
INSPECTOR's context :
└─ review, refactoring opportunity, audit SPEC.md and ARCHITECTURE.md compliance
   (5k tokens)

JOURNALIST's context:
└─ SESSION-LOG.mc + ARCHITECTURE.md + inline docs 
   (5k tokens, focused on structural review)

Your context:
└─ SPEC.md + test each flow
   (Human brain, validating intent)

Total: Each agent has SMALL, FOCUSED context
Result: Each performs optimally within their specialization
```
## How

Document-driven development pipeline where each artifact serves a specific purpose in the workflow.

## Task: Implement commit flow

```
┌─────────────────────────────────────────────────────┐
│ FEATURE REQUEST (from you)                          │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│ ANALYST: Comprehensive Planning                     │
├─────────────────────────────────────────────────────┤
│ - SPEC.md (design contract, all flows)              │
│ - SESSION-N-ROLE-TASK.md (atomic tasks)             │
│                                                     │
│ Quality: Every agent can execute from this          │
└────────────────┬────────────────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
┌──────▼──────┐    ┌───────▼──────┐
│ SCAFFOLDER  │    │ CARETAKER    │
│ implement   │    │ Polish       │
└──────┬──────┘    └───────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │
┌────────────────▼───────────────┐
│ YOU: Test against SPEC.md      │              
└────────────────┬───────────────┘
                 │
           ┌─────┴─────┐
           │ Pass?     │
           ├───────────┤
      [No] │      │[Yes]
           │      │
┌──────────▼──┐   │   ┌───────────────────────────────────┐
│ SURGEON     │   │   │ INSPECTOR: Audit, Refactor, Clean │
│ Fix         │   │   └────────────────┬──────────────────┘
└──────┬──────┘   │                    │
       │          │   ┌────────────────▼──────────────────┐
       └──────────┘   │ YOU: Approve                      │        
                      │ ANALYST: write ARCHITECTURE.md    │                  
                      └────────────────┬──────────────────┘
                                       │
                      ┌────────────────▼─────────────────┐
                      │ JOURNALIST:                      │
                      │  - update SESSION-LOG.md         │
                      │  - update ARCHITECTURE.md        │
                      │  - write inline documentations   │
                      │  - update SPEC.md == TDD         │
                      └──────────────────────────────────┘

```

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
~/.carol
├── CAROL.md                  # Role definitions (immutable)
├── INTERVIEW.md              # Agent self-assessments & recommendations
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
│   ├── INTERVIEW.md → ___CAROL___/INTERVIEW.md (symlink)
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

Rock 'n Roll!

**JRENG!** 🎸

---

## Documentation

- [CAROL.md](./CAROL.md) - Complete role definitions
- [INTERVIEW.md](./INTERVIEW.md) - Agent self-assessments and assignment recommendations
- [PATTERNS.md](./PATTERNS.md) - LLM meta-patterns for problem-solving
- [SCRIPTS.md](./SCRIPTS.md) - Code editing automation catalog
- [PATTERNS-WRITER.md](./PATTERNS-WRITER.md) - Pattern discovery guide
- [SPEC-WRITER.md](./SPEC-WRITER.md) - How ANALYST writes specs
- [ARCHITECTURE-WRITER.md](./ARCHITECTURE-WRITER.md) - How agents document architecture
- [SESSION-LOG.md](./templates/SESSION-LOG.md) - Session tracking template

## Support

- Issues: https://github.com/jrengmusic/carol/issues
- Discussions: https://github.com/jrengmusic/carol/discussions
