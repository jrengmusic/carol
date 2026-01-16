# CAROL

**C**ognitive **A**mplification **R**ole **O**rchestration with **LLM** agents

Version: 1.0.0

An opinionated ritualistic framework that enforces discipline to work with multiple agents simultaneously.

CAROL was never meant to be used for 100% vibing, you could if you want. But it helps agents from drifting from the course of development while maintaining human still responsible for every line of code.

CAROL also works effectively as a rapid prototyping methodology for experienced architects exploring unfamiliar stacks.

## Why

Just like all other software, one day inevitably this framework might be obsolete. But as today at its infancy, LLM agents are unreliable assistance for development. Objectively, whatever commercial agentic models available today it always produces deterministic binary results. Either they could populate super fast thousands of lines of code that might work or it will just give you piles of garbage that will exhaust your tokens, credits, time, patience and eventually your sanity to debug.

### Solution

**1. You maintain architectural coherence:** No agent can fuck up the big picture because you're the one holding it. You're validating intent at each handoff.

**2. Domain transfer without syntax debt:** Fuck MCP. You are the living embodiment of Human Context Protocol. You control the flow. You are the architect. The agents translate your architectural intent into the programming language syntax.

## What

CAROL is a role-based agent orchestration framework for collaborative software development. It's a cognitive load distribution system that prevents agent drift by enforcing specialized roles with explicit constraints and clear handoffs.

### Specialized Roles

* **ANALYST** - Requirements analyst and planning specialist. Asks clarifying questions, gathers requirements, writes specifications in SPEC.md, and creates architecture documentation. Never writes code directly. Handover SPEC-WRITER.md and ARCHITECTURE-WRITER.md as your instructions, ANALYST will clarify your intent from vague ideas into formalized development documents.
* **SCAFFOLDER** - Literal code generator. Implements features exactly as specified in kickoff documents. Generates boilerplate, structures, and straightforward implementations. Does not add features, optimize, or make architectural decisions.
* **CARETAKER** - Code polisher and reviewer. Adds error handling, validation, and defensive programming. Improves existing code without changing behavior. Focuses on robustness, not cleverness.
* **INSPECTOR** - Pre-commit auditor. Performs systematic code review before commits. Validates against SPEC.md, checks architectural constraints, verifies style compliance. Audits refactoring opportunities to mitigate technical debt.
* **SURGEON** - Complex fix specialist. Handles bugs, performance issues, and architectural corrections. Reads RESET context, identifies root cause, implements minimal surgical fixes. Does not refactor unless required.
* **JOURNALIST** - Documentation synthesizer. Compiles session summaries from SESSION-[N]-\*.md files into SESSION-LOG.md. Maintains project timeline, tracks decisions, creates audit trail.

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
   
INSPECTOR's context:
└─ review, refactoring opportunity, audit SPEC.md and ARCHITECTURE.md compliance
   (5k tokens)

JOURNALIST's context:
└─ SESSION-LOG.md + ARCHITECTURE.md + inline docs 
   (5k tokens, focused on documentation)

Your context:
└─ SPEC.md + test each flow
   (Human brain, validating intent)

Total distributed: ~34k tokens across 6 specialized roles
Result: Each agent performs optimally within their specialization
```

## How

Document-driven development pipeline with specialized artifacts:

### CAROL Workflow

```
┌─────────────────────────────────────────────┐
│ FEATURE REQUEST (from you)                  │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ ANALYST: Comprehensive Planning             │
├─────────────────────────────────────────────┤
│ - SPEC.md (design contract, all flows)      │
│ - SESSION-N-ROLE-TASK.md (atomic tasks)     │
│                                             │
│ Quality: Every agent can execute from this  │
└────────────────┬────────────────────────────┘
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

* **Role-Based Constraints:** 6 specialized roles with explicit behavioral rules
* **Agent-Agnostic:** Works with any LLM CLI tool (Claude Code, Opencode, Amp, Copilot, Gemini, whatever.)
* **Language-Agnostic:** Supports any programming language/framework
* **TDD-Friendly:** Built-in testing patterns and scripts
* **Git-Tracked:** Framework evolution tracked, projects reference SSOT
* **Flexible Distribution:**
  + **Symlink mode (default):** Update SSOT once → all projects update
  + **Portable mode:** Full copy, works offline, project self-contained

## Quick Start

### Installation

**One-Line Install (Recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/jrengmusic/carol/main/install.sh | bash
```

This will:

* Clone CAROL to `~/.carol`
* Add `carol` command to your PATH
* Work on macOS and Linux with bash/zsh

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

```bash
# Download and run uninstall script
curl -fsSL https://raw.githubusercontent.com/jrengmusic/carol/main/uninstall.sh -o /tmp/uninstall.sh
bash /tmp/uninstall.sh

# OR if CAROL is still installed
~/.carol/uninstall.sh
```

This will:

* Remove `~/.carol` directory (with confirmation)
* Clean up PATH from shell configuration files
* Create backups of modified files
* Warn about projects still using CAROL

Then reload your shell:

```bash
source ~/.zshrc   # zsh
# OR
source ~/.bashrc  # bash
```

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
│   ├── CAROL.md → ~/.carol/CAROL.md (symlink)
│   ├── INTERVIEW.md → ~/.carol/INTERVIEW.md (symlink)
│   ├── PATTERNS.md → ~/.carol/PATTERNS.md (symlink)
│   ├── SCRIPTS.md → ~/.carol/SCRIPTS.md (symlink)
│   ├── PATTERNS-WRITER.md → ~/.carol/PATTERNS-WRITER.md (symlink)
│   ├── SPEC-WRITER.md → ~/.carol/SPEC-WRITER.md (symlink)
│   ├── ARCHITECTURE-WRITER.md → ~/.carol/ARCHITECTURE-WRITER.md (symlink)
│   ├── scripts/ → ~/.carol/scripts/ (symlink)
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

* **L**ean - Simple, focused roles
* **I**mmutable - Deterministic behavior
* **F**indable - Clear documentation
* **E**xplicit - No hidden state
* **S**SOT - Single source of truth
* **T**estable - TDD approach
* **A**ccessible - Works with any agent
* **R**eviewable - Clear attribution

**LOVE:**

* **L**istens - Fail fast, user feedback
* **O**ptimizes - Prevents wasted cycles
* **V**alidates - Enforces correctness
* **E**mpathizes - Human-centric design

## Roadmap

* CLI tool (`carol init`, `update`, `version`)
* Symlink + portable modes
* Template system
* `PATTERNS.md` - LLM meta-patterns for problem-solving
* `SCRIPTS.md` - Code editing automation (documentation)
* `PATTERNS-WRITER.md` - Pattern discovery guide
* Shell scripts for safe code editing and validation
* Slash command integration (`/carol`)
* Test suite expansion

## Why CAROL?

### The Problem

LLMs suffer from:

* **Scope creep:** Adding features not requested
* **Cognitive overload:** Reading entire codebase, hitting session limits
* **Autonomous mistakes:** Making changes without asking
* **Inconsistent patterns:** Each agent invents new approaches

### The Solution

CAROL provides:

* **Role constraints:** Can't add features if you're SCAFFOLDER
* **Context isolation:** Each role reads only what they need
* **Registration guardrail:** Must check role before acting
* **Systematic patterns:** Problem decomposition, debug methodology, self-validation

**Result:** Reduced failures, lower costs, faster development.

## Contributing

Contributions welcome! This framework is:

* **Agent-agnostic** - Works with any LLM CLI
* **Language-agnostic** - Supports any tech stack
* **Battle-tested** - Born from real production failures

## License

MIT License - See LICENSE file

## Author

Rock 'n Roll!

**JRENG!** 🎸

---

## Documentation

* [CAROL.md](CAROL.md) - Complete role definitions
* [INTERVIEW.md](INTERVIEW.md) - Agent self-assessments and assignment recommendations
* [PATTERNS.md](PATTERNS.md) - LLM meta-patterns for problem-solving
* [SCRIPTS.md](SCRIPTS.md) - Code editing automation catalog
* [PATTERNS-WRITER.md](PATTERNS-WRITER.md) - Pattern discovery guide
* [SPEC-WRITER.md](SPEC-WRITER.md) - How ANALYST writes specs
* [ARCHITECTURE-WRITER.md](ARCHITECTURE-WRITER.md) - How agents document architecture
* [SESSION-LOG.md](templates/SESSION-LOG.md) - Session tracking template

## Support

* Issues: https://github.com/jrengmusic/carol/issues
* Discussions: https://github.com/jrengmusic/carol/discussions
