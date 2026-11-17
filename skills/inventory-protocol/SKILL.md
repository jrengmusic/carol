---
name: inventory-protocol
description: Builds the Framework Inventory of a JAM or KANJUT objective - the API, the pattern usage, the name families, the synthesis per CODING.md rule, and the proven absences. Load it before a PLAN is written (plan-writer step 4) and before an audit (Auditor). COUNSELOR records the inventory in the PLAN. The same inventory is the checklist for each step and the reference that the Auditor checks again.
---

# Inventory Protocol

This skill is the only source of the inventory protocol.

- The inventory comes before the plan, before the code, and before the audit.
- A plan, an implementation, or an audit without the inventory has no reference. It is not valid.
- Each row cites a read of this session. A row without a citation is not written.
- The writing language follows the Writing Standard in CAROL.md. This skill does not restate it.

## Why the inventory has five layers

The API tells what exists. The pattern usage tells how the codebase uses it. The names tell
the mental model. A name is not a style preference. A name states intent (NAMES.md Rule 3).
A name outside its family "is evidence of foreign semantics" (NAMES.md Rule -1). The
synthesis tells the established form of each CODING.md rule in this codebase. The absence
rows prove where no API exists.

MANIFESTO **E**: *"Find the established pattern. Extend it. A new pattern where one already
exists is always wrong."* An inventory that lists the API only cannot find the established
pattern.

## Scope

JAM and KANJUT. CIUM is deferred.

| Framework | Core module | Identifier vocabulary |
|---|---|---|
| JAM | `~/Documents/Poems/dev/jam/jam_core/` | `~/Documents/Poems/dev/jam/cast/<module>.md` |
| KANJUT | `~/Documents/Poems/kuassa/user_modules/kuassa_core/` | `~/Documents/Poems/kuassa/user_modules/cast/<module>.md` |

The doxygen index locations are in the doxygen-protocol skill. This skill does not restate
them.

The Identifier vocabulary in `cast/<module>.md` generates `generated/<prefix>_<Module>.h`.
The core module header includes it (`jam_core.h`, `kuassa_core.h`).

## Order

1. Read the CONTRACT: `~/.carol/MANIFESTO.md`, `~/.carol/CODING.md`, `~/.carol/NAMES.md`.
2. Read the core module of the project's framework: `jam_core` or `kuassa_core`.
   - Read the core module header. It lists every submodule that the core gives.
   - Read the core Identifier vocabulary: `cast/core.md`.
   - Every module and every project of the framework uses the core. Thus the core comes first.
3. Read each other module of the framework that the objective touches, in the same way.
4. Read JUCE, the building block below the framework (CODING.md "Use the framework API
   fully").
5. Read the project: its doxygen index, and the files that the objective touches.

Each read follows the doxygen-protocol skill: the index, then the compound XML, then the LSP
tool, then the code at file:line.

## Layers

Write one table for each layer.

### 1. API

What exists for each need of the objective.

| Need | Module | API | Source | Step |
|---|---|---|---|---|

- **Need:** what the objective does, in plain words.
- **API:** the exact class, function, or type.
- **Source:** the compound XML, or the header file:line.

### 2. Pattern usage

How the codebase uses each API in the API table.

| Pattern | Exemplar | Use sites | Step |
|---|---|---|---|

- Run LSP `findReferences` on each API row. The results are the use sites.
- **Exemplar:** the file:line of one use that follows the CONTRACT. Read it.
- Include the patterns of data flow and ownership: the listener, the Model channel, the
  owner that assigns identity, the orchestrator that tells.

### 3. Names

The name families that the objective joins.

| Family | Members | Intent | Step |
|---|---|---|---|

- **Family:** a verb family (NAMES.md Rule 1, Verb Contract), a class's reader set, a
  module's `add*` family, a set of dispatch tables (NAMES.md Rule 8), or the Identifier
  vocabulary in `cast/<module>.md`.
- **Members:** each member at file:line.
- **Intent:** the contract that the family states. For example, `get` returns and does not
  store. `add` inserts into a container.
- The nearest set comes first, then the module, then the framework (NAMES.md Rule 5,
  nearest-sibling precedence).
- A new domain term that no family covers goes to ARCHITECT (NAMES.md Rule -1).

### 4. Synthesis

The established form of each CODING.md CRITICAL RULE that the objective touches.

| Rule | Established form | Exemplar |
|---|---|---|

- **Rule:** the CODING.md CRITICAL RULE, quoted.
- **Established form:** how this codebase obeys the rule, in plain words.
- **Exemplar:** the file:line that shows it.

Examples:

- "No `==` / `!=` on strings" — the `Function::Map`, `HashMap`, or Identifier dispatch form
  at file:line.
- "Uniform signature in the type" — the `Function::Map<Key, ReturnType (Args...)>`
  declaration at file:line.
- "Consume the event payload" — the listener form at file:line.

### 5. Absence

A need with no API.

| Need | Query | Result |
|---|---|---|

- **Query:** the doxygen index read, the `workspaceSymbol` query, or the `findReferences`
  call.
- **Result:** the empty result, cited. The doxygen-protocol skill: *"An absence claim cites
  an empty `findReferences` or `workspaceSymbol` result, and the call that gave it."*
- A need without an absence row and without an API row is not inventoried. Hand-rolled code
  for that need has no justification.

## Users

- **COUNSELOR** builds the inventory before the PLAN, through @Pathfinder (plan-writer step
  4). The PLAN holds the five tables in its `## Framework Inventory` section.
- **COUNSELOR** quotes the rows of each step in its Engineer delegation. Step validation
  checks the code against those rows.
- **Auditor** builds its own inventory with this protocol, before it reads the PLAN
  inventory or the code. Then it compares the two (auditor.md, Framework Inventory).
