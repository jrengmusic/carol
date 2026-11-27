---
name: doxygen-protocol
description: Symbol lookup for C++ work on every framework in the Index locations table. Doxygen XML gives what exists. The ling MCP server (ling --mcp project-info.md) gives definitions, references, implementations, and call hierarchy from the compiler AST. Use at the start of any task touching these codebases, before any text search. Provides the question-to-source table, the reading order, index locations, and regeneration commands.
---

# Doxygen Protocol

Two sources answer every symbol question. Text search answers none.

## Sources

| Question | Source |
|----------|--------|
| What exists: modules, classes, members, API prose | Doxygen XML |
| Where a symbol is defined | `ling` MCP `goToDefinition` |
| Who uses a symbol: the blast radius | `ling` MCP `findReferences` |
| Who calls a function, and what it calls | `ling` MCP `prepareCallHierarchy`, then `incomingCalls` or `outgoingCalls` |
| Which classes implement a virtual function | `ling` MCP `goToImplementation` |
| Where a name is, when only the name is known | `ling` MCP `workspaceSymbol`, with `query` set to the name |
| The symbols of one file | `ling` MCP `documentSymbol` |
| The type at a position | `ling` MCP `hover` |
| Counterpart header or source file | `ling` MCP `switchSourceHeader` |

The `ling` MCP server runs `ling --mcp project-info.md` from PATH, in the session folder.
ling reads the build of that manifest, so it reads the AST that the compiler reads.
Doxygen parses the source on its own and links calls by name. Doxygen gives no reference
evidence and no call evidence.

Doxygen prose can be stale. The code is the source of truth.

## Order

1. Read `index.xml` for each framework active in the task, and the project index.
2. Read the compound XML for the symbol: members, bases, API prose.
3. Ask the `ling` MCP tools every question about a definition, a use, or a call path.
4. Read the code at each file:line that steps 1 to 3 give.

## `ling` MCP tool use

- Check each tool's schema (`ling --mcp` exposes 13 read-only AST tools: `goToDefinition`,
  `findReferences`, `hover`, `completion`, `goToImplementation`, `prepareCallHierarchy`,
  `incomingCalls`, `outgoingCalls`, `documentSymbol`, `switchSourceHeader`, `inlayHint`,
  `diagnostics`, `workspaceSymbol`).
- `workspaceSymbol` needs a `query` that is not empty.
- An absence claim cites an empty `findReferences` or `workspaceSymbol` result, and the
  call that gave it.
- The `ling` MCP server is read-only. Ignore compiler/LSP diagnostics: CAROL.md Build Environment.
- ling answers for the project whose `project-info.md` is in the session folder. A
  framework file (JAM, KANJUT, CIUM) gets an answer when a unit of that project
  compiles it. When a `ling` result on a framework file is empty or wrong, report it
  under `Needs`.

## Text search

Text search (`saw find`) on C++ source never proves absence. Text search never gives the blast radius.

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
