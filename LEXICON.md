# LEXICON
## Domain-Specific Lexicon Tables — The Meta-Pattern

**For:** ARCHITECT and CAROL agents.
**Version:** 0.1 — July 2026

**Reference implementations (ground truth — read these, not this document's
paraphrase, when implementing):**
- **KANJUT** (C++/JUCE/CMake): `~/Documents/Poems/kuassa/___lib___/kuassa_lexicon/`
  — `cmake/lexicon.cmake` (generator), per-module `lexicon.md` (sources),
  `generated/kuassa_Lexicon.h/.cpp` (output), `bimap/kuassa_Action.h`,
  `bimap/kuassa_Page.h` (escape hatch)
- **nvim keymaps** (Lua/Neovim): `~/.config/nvim/doc/KEYMAPS.md` (source + doc),
  `~/.config/nvim/lua/core/keymaps-generator.lua` (generator),
  `~/.config/nvim/lua/core/keymaps.lua` (output), `core/actions.lua`,
  `core/build.lua` (escape hatch)

Two stacks, zero shared code, identical logic. The pattern transfers by
pointing an agent at a reference implementation — it is not in any training
corpus, and does not need to be.

---

## 1. The Fundamental Mental Model

Every system contains exactly two kinds of content:

- **Behavior** — algorithms, function bodies, control flow. Irreducibly code.
- **Declarative residue** — mechanically regular declarations that must exist
  in code *and* must be documented: vocabularies, enum↔string mappings,
  keybindings, registrations, parameter layouts, menu items, error catalogs.

The residue is always written at least twice — once as code, once as
documentation — and two copies of one truth **will** drift. Drift is not a
discipline failure; it is the structural consequence of duplicated truth
(MANIFESTO **S**: a second copy of any truth is a bug waiting to happen).

**The lexicon resolves this by collapsing the copies:** the residue is
declared once, as human-readable markdown tables. The code is derived from
the tables. The documentation *is* the tables. There is nothing left to
drift.

> **Bindings are vocabulary. Bodies are behavior.**
> The table holds vocabulary. Code holds behavior. The generator is the
> bridge. The validator is the drift-killer.

**What the lexicon converts — and what it deliberately does not:** the goal
is turning error-prone *imperative repetition* into data-driven *declarative
rows*. Repetitive declaration code — a hundred `vim.keymap.set(...)` calls, a
hundred `extern const juce::Identifier` lines, each the same statement with
different data — is where typos, drift, and missed updates concentrate,
because humans are bad at mechanical repetition and good at reviewing tables.
That code becomes rows. Behavior remains imperative **by design**: logic is
what imperative code is *for*. Declarative where the content is data;
imperative where the content is logic. A lexicon that tries to make behavior
declarative has inverted the pattern.

The last point is the one most easily missed: **the table alone prevents
nothing.** What kills drift is the validation gate — divergence between
table and code becomes a *generation failure* (loud, line-numbered, blocking)
instead of silent rot. A lexicon without validation is just a third copy.

---

## 2. What Can Be Table-ised

Litmus tests. All must pass:

1. **Mechanically regular** — every entry shares one shape; the rows of a
   table are instances of one schema.
2. **Documentation-worthy** — you would write this list in a reference doc
   anyway. (If yes, the table is doc and source simultaneously — double win.)
3. **Declaration, not computation** — expressible without control flow. A
   cell may carry an expression *as data* (an argument string, a literal),
   never logic the generator must understand.
4. **Additive** — extending the system means "one more row", not "new logic".
   (This is MANIFESTO **L**'s 3-branch rule at system scale: adding a case is
   data, not a code change.)

**Counter-test (the escape hatch trigger):** if an entry needs a function
body, branching, or runtime parameterization — it is behavior. It gets a
*name* in the table (a validated reference) and a hand-written body in a
behavior module. KANJUT: `Action.h` (license-gated menu actions), `Page.h`
(runtime-parameterized count) stay hand-written. nvim: `@actions.*`,
`@build.*` rows reference `core/actions.lua` / `core/build.lua`.

Proven table-isable: identifier vocabularies, enum↔string bimaps,
keybindings, platform-conditional constants, tag/view transforms.
Candidates anywhere: command registrations, routing tables, parameter
descriptors, error catalogs, palette definitions, feature registries.

---

## 3. How to Design the Table

1. **Start from the generated artifact you wish existed.** Write the ideal
   output by hand for three representative entries. Work backwards: every
   axis on which those entries *differ* becomes a column; everything they
   share becomes generator emission logic or a group-level attribute.
2. **Columns are variance, not completeness.** A value identical across all
   rows is not a column — it is a constant in the generator or a column in a
   parent (registry) table.
3. **Cell value kinds form a small closed set**, each with one deterministic
   emission rule. nvim uses four: backtick literal, bare dotted reference,
   call syntax, `@ref` escape hatch. KANJUT uses words, values, view flags,
   platform tags. Never allow an open-ended "anything" cell — that is code
   leaking into the table.
4. **Token columns get fixed vocabularies** (nvim: `opts` = `sync·expr·silent`,
   `guard` = `client=·supports=`; KANJUT: platform = `mac·win`). A token
   outside the vocabulary is a validation error, never a passthrough. The
   vocabulary is itself lexicon: extending it is a design decision, gated.
5. **The doc columns are first-class.** `desc`, doc-strings under headers —
   these exist because the table is the documentation. A lexicon whose tables
   are unreadable to humans has failed its second purpose.
6. **Custom schema, stock syntax.** The schema — section headers, column
   meanings, cell value kinds, vocabularies — is fully yours to invent per
   domain. The *syntax* is not: every lexicon file must be valid markdown
   per the spec, using only stock constructs (ATX headings, pipe tables,
   prose). No custom markup, no extensions. This keeps the file rendering
   correctly in every viewer (the documentation half of the contract), and
   keeps the parser trivial — headers and pipe rows, nothing more.

---

## 4. Think Relational — M:N, Never Linear 1:1

The beginner's error is "one table → one output block, one row → one line."
The lexicon is a **relational schema**, not a list:

- **Registry + detail tables joined by keys.** nvim: `## groups` is the
  registry; each `## keys: <group>` section is a detail table whose header is
  a foreign key. Group attributes (prefix, requires, invocation) join onto
  every row at emission time.
- **Self-referential keys produce nesting.** nvim's `parent` + `guard`
  columns make a group emit *inside* another group's function, wrapped in a
  condition — hierarchy from flat tables.
- **Joins change row semantics.** nvim's `requires` column determines how a
  row's action root resolves (required local vs lazy require vs global) — a
  per-group join that rewrites per-row emission.
- **One row → many artifacts.** A KANJUT bimap row fans out into enum entry,
  string constant, forward map, reverse map, platform conditional.
- **Many tables → one artifact.** KANJUT merges seven `lexicon.md` files —
  with cross-file key resolution (a cross-table join) — into one generated
  pair.

Foreign keys can live in section headers, in columns, or in file identity.
Compose them freely: registry→detail, self-reference, cross-file — a finite
set of table shapes yields unbounded system shapes. Design the schema the
domain needs; do not force the domain into one flat table.

---

## 5. The Boundary

Four rules, all hard:

1. **Bodies never enter tables.** No function bodies, no control flow, no
   multi-statement logic in any cell. The moment a cell wants an `if`, it
   wants a name instead.
2. **Tables never hide in bodies.** Behavior modules contain zero static
   declarations of the lexicon's kind. (nvim: `vim.keymap.set` appears only
   in generated output — audited.)
3. **The escape hatch is constitutive, not a concession.** Named references
   to hand-written behavior, statically validated for existence at
   generation time. Removing the escape hatch does not purify the design —
   it destroys it, by forcing behavior into cells.
   **The overengineering failure mode:** when the schema "cannot express X",
   the answer is a name referencing a hand-written body — never a schema
   extension that lets cells carry logic. Every conditional column, mini-DSL,
   or "smart" cell kind added to avoid writing a function moves the lexicon
   toward being a worse programming language. The schema grows only for new
   *declaration* shapes, never for computation.
4. **Static only.** Runtime-spawned instances of the declaration kind
   (nvim: the build terminal's transient buffer-local maps) belong to the
   behavior module that spawns them. The lexicon covers static declarations.

Flow is strictly unidirectional (MANIFESTO **E**, layer topology):

```
tables → generator → generated code → references → behavior modules
```

Never backwards. The generator never reads behavior (except to validate that
referenced names exist). Behavior never reads the tables.

---

## 6. Relation to Knuth's Literate Programming

**Shared:** the human-readable document is the source artifact; code is
extracted ("tangled") from it; documentation and source cannot diverge
because they are one file.

**Fundamentally different:**

| | Literate Programming | Lexicon |
|---|---|---|
| Scope | ALL code lives in the doc | only declarative residue |
| Relation to code | replaces source | complements source |
| Debugging surface | generated code — you debug what you didn't write | generated code is boring declarations you never debug; behavior stays first-class hand-written code |
| Authoring change | whole new mode for everything | changes authoring only for declarations |
| Adoption cost | team-wide buy-in | one custodian, one generator |

LP failed to spread because tools (debuggers, grep, stack traces) point at
the tangled output. The lexicon sidesteps this: the generated artifact is
regular, transparent, committed, and bannered — and nothing you would ever
step through lives there.

---

## 7. Implementation Contract (Invariants)

Every lexicon implementation, any stack, satisfies all of these:

1. **SSOT file(s):** valid markdown. Contract sections are explicitly
   marked (`## groups`, `## keys:`, `## bimap` — whatever the schema
   defines); all other prose is ignored by the parser and free for human
   documentation. One artifact serves both audiences.
2. **Generator:** parse → validate → emit, written in the stack's own
   language (CMake for a CMake build, Lua for nvim). No new toolchain.
3. **Validation, two-pass:** registries/keys first, then reference
   resolution (FKs, `@refs`, cross-file keys, token vocabularies). Every
   error names the source file and line.
4. **Deterministic emission:** identical input → byte-identical output
   (MANIFESTO **D**). This is what makes the output committable and
   cross-machine sync trivial.
5. **Committed, bannered output:** the generated file is in version control,
   opens with the LEXICON banner (`FOR YOUR EYES ONLY` / `GENERATED CODE —
   READ ONLY` / generator path / source list / "Edit the lexicon file, never
   this file"). It is derived truth, like an object file — not a second
   source.
6. **Staleness gate native to the stack:** configure-time execution for
   build systems (KANJUT: `cmake -P`); content-hash comparison at launch +
   regenerate-on-save for runtime configs (nvim: sha256 in the banner,
   `verify()` at startup, `BufWritePost`). Mtime is not a gate — content
   hash or build-graph dependency is.
7. **Failure contract:** validation failure is loud, line-numbered, and
   preserves the last-good output. The system always starts/builds on known-
   good declarations. A lexicon that can brick its host on a typo is
   misdesigned.

---

## 8. Procedure (CAROL Agents)

When ARCHITECT directs a lexicon for a new stack:

1. **@Pathfinder the reference implementations first** (PP-6: the pattern
   lives in the codebase, not the corpus). Read the generator, sources,
   output, and escape-hatch modules of at least one existing lexicon.
2. **Identify the declarative residue** in the target system and its current
   drift surfaces (count the copies: code, docs, comments).
3. **Extract behavior first** — move bodies into behavior modules with named
   entry points, hand-wire, verify equivalence. This step has standalone
   value and de-risks generation.
4. **Design the schema** — registry + detail tables, cell value kinds, token
   vocabularies. Every new name and vocabulary token is gated (NAMES.md
   Rule -1).
5. **Surface boundary decisions to ARCHITECT** one at a time: escape-hatch
   homes, anything the schema cannot express (the answer is usually "it's
   behavior — it goes in a module", not "extend the schema").
6. **Write the generator** in the stack's language, validation before
   emission, banner verbatim from the reference implementation.
7. **Prove equivalence** — mechanical set-diff between the hand-written
   artifact and the generated one before switching over.
8. **Wire the staleness gate + failure contract. Test all three paths:**
   in-sync no-op, stale regen, broken-input fallback to last-good.
9. **Audit:** SSOT (no stray declarations outside generated output),
   boundary rules, determinism, cross-platform identity.

---

*The table is the vocabulary. The code is the behavior. The generator is the
bridge. The validator is the drift-killer.*

*Rock 'n Roll!*
**JRENG!**

---
*Version 0.1 — July 2026*
