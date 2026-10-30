---
name: doxygen-protocol
description: Symbol lookup for C++ work on every framework in the Index locations table. Doxygen XML gives what exists. The LSP tool (clangd) gives definitions, references, implementations, and call hierarchy from the compiler AST. Use at the start of any task touching these codebases, before any text search. Provides the question-to-source table, the reading order, index locations, and regeneration commands.
---

# Doxygen Protocol

Two sources answer every symbol question. Text search answers none.

## Sources

| Question | Source |
|----------|--------|
| What exists: modules, classes, members, API prose | Doxygen XML |
| Where a symbol is defined | LSP `goToDefinition` |
| Who uses a symbol: the blast radius | LSP `findReferences` |
| Who calls a function, and what it calls | LSP `prepareCallHierarchy`, then `incomingCalls` or `outgoingCalls` |
| Which classes implement a virtual function | LSP `goToImplementation` |
| Where a name is, when only the name is known | LSP `workspaceSymbol`, with `query` set to the name |
| The symbols of one file | LSP `documentSymbol` |
| The type at a position | LSP `hover` |

The LSP tool runs clangd from PATH. clangd reads the project's
`compile_commands.json`, so it reads the AST that the compiler reads. Doxygen parses
the source on its own and links calls by name. Doxygen gives no reference evidence and
no call evidence.

Doxygen prose can be stale. The code is the source of truth.

## Order

1. Read `index.xml` for each framework active in the task, and the project index.
2. Read the compound XML for the symbol: members, bases, API prose.
3. Ask the LSP tool every question about a definition, a use, or a call path.
4. Read the code at each file:line that steps 1 to 3 give.

## LSP tool use

- Positions are 1-based: line and character, as `documentSymbol` and Read show them.
- `workspaceSymbol` needs a `query` that is not empty.
- An absence claim cites an empty `findReferences` or `workspaceSymbol` result, and the
  call that gave it.
- The LSP tool is read-only. Diagnostics are off: CAROL.md Build Environment.
- A framework file (JAM, KANJUT, CIUM) has no compile database of its own. Its
  `.clangd` file, written by `~/.config/nvim/lua/core/clangd.lua`, points at the
  project that nvim loaded last. When an LSP result on a framework file is empty or
  wrong, report it under `Needs`: ARCHITECT loads the project in nvim.

## Text search

Text search (`grep`, `rg`) on C++ source has two uses only:

- A string literal: the search pattern includes the double quote (`"`). Write the
  pattern inside single quotes, or escape the quote.
- A preprocessor directive: the search pattern includes the `#`.

Text search never proves absence. Text search never gives the blast radius.

The `tool.call` hook in `~/.carol/hooks/register.js` denies a text search that names a
C++ file, glob, or type as its target, unless the pattern holds the double quote or
the `#`. The hook reads the command text, not intent. This protocol governs every
search the hook cannot read, such as an untyped search of a source directory.

## Index locations

| Library | Index |
|---------|-------|
| JAM | `~/Documents/Poems/dev/jam/docs/xml/index.xml` |
| KANJUT | `~/Documents/Poems/kuassa/user_modules/docs/xml/index.xml` |
| CIUM | `~/Documents/Poems/iqala/___cium___/docs/xml/index.xml` |
| JUCE | `~/Documents/Poems/JUCE/docs/xml/index.xml` |
| Project | `{project_root}/docs/xml/index.xml` |

Load the indexes for every framework active in the task AND the project index.

## Regeneration

- Library: `<leader>bd` in nvim
- Project: `ninja doxygen`

## Delegation rule

Every subagent prompt on these codebases carries this protocol explicitly. The
delegating agent writes into the prompt: the index paths, and the LSP operations for
the questions in scope.
