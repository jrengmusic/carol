---
name: doxygen-protocol
description: Doxygen-first symbol lookup for C++/JUCE/JAM/KANJUT/CIUM work. Use at the start of any task touching these codebases, before any grep or file search, to resolve symbols, classes, and APIs from doxygen XML indexes. Provides index locations, reading order, and regeneration commands.
---

# Doxygen Protocol

Read doxygen XML before any Grep/Glob symbol hunt.

**Order:** index.xml → compound XML for the symbol → Grep/Glob only if the symbol is
absent from the index.

## Index locations

| Library | Index |
|---------|-------|
| JAM | `~/Documents/Poems/dev/jam/docs/xml/index.xml` |
| KANJUT | `~/Documents/Poems/kuassa/___lib___/docs/xml/index.xml` |
| CIUM | `~/Documents/Poems/iqala/___cium___/docs/xml/index.xml` |
| JUCE | `~/Documents/Poems/JUCE/docs/xml/index.xml` |
| Project | `{project_root}/docs/xml/index.xml` |

Load the indexes for every framework active in the task AND the project index.

## Regeneration

- Library: `<leader>bd` in nvim
- Project: `ninja doxygen`

## Delegation rule

Every subagent prompt on these codebases carries the doxygen-first instruction
explicitly — the delegating agent writes it into the prompt, with the relevant index
paths.
