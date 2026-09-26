# CAST
## Codegen Annotated Source of Truth — The Static-Table Protocol

**For:** ARCHITECT and CAROL agents.
**Version:** 0.2 — September 2026 (supersedes LEXICON.md 0.1)

---

## 0. The Tool

`cast` is the tool. It is the canon code generator for every ARCHITECT project.

- **Binary:** `~/.local/bin/cast` (macOS), `~/.local/bin/cast.exe` (Windows).
- **Source of truth:** `~/Documents/Poems/dev/cast`. `SPEC.md` is the authority.
  `cast --help` prints the guide (`Source/HELP.md`), which follows SPEC.
- **Language agnostic.** From `cast --help`: *"It knows nothing about any
  programming language. It resolves references, iterates rows, and replaces
  tokens — nothing else."* C++, CMake, Lua, shell, XML, markdown — any text
  output. One tool for every stack.
- **No per-stack generator.** Do not write a generator in the stack's own
  language. Do not write a second parser. A project that needs generated
  declarations gets a `cast/` directory and a manifest.

**Ground truth, in this order:**

1. `cast --help` — the guide. Read the sections that the task touches before any
   design.
2. The reference manifests (read these, not this document's paraphrase):
   - `~/Documents/Poems/dev/cast/cast/` — cast generates its own sources
     (self-hosting).
   - `~/Documents/Poems/dev/jam/cast/` — the JAM framework: identifiers, bimaps,
     lookup tables, colours, syntax, and more.
   - `~/Documents/Poems/kuassa/user_modules/cast/` — the KANJUT framework.
   - `~/Documents/Poems/dev/whatdbg/cast/` — an application project.
3. `SPEC.md` in the cast repository, when the guide does not answer.

---

## 1. The Mental Model

Every system contains exactly two kinds of content:

- **Behavior** — algorithms, function bodies, control flow. Irreducibly code.
- **Declarative residue** — mechanically regular declarations that must exist in
  code *and* must be documented: vocabularies, enum↔string mappings, keybindings,
  registrations, parameter layouts, menu items, error catalogs, build settings.

The residue is always written at least twice — once as code, once as
documentation — and two copies of one truth **will** drift. Drift is not a
discipline failure. It is the structural consequence of duplicated truth
(MANIFESTO **S**: a second copy of any truth is a bug waiting to happen).

**CAST collapses the copies.** The residue is declared once, as markdown tables.
The code is generated from the tables. The documentation *is* the tables. Nothing
is left to drift.

> **Bindings are vocabulary. Bodies are behavior.**
> The table holds vocabulary. Code holds behavior. `cast` is the bridge. Its
> validation is the drift-killer.

**What CAST converts — and what it does not.** The goal is to turn error-prone
*imperative repetition* into data-driven *declarative rows*. A hundred
`vim.keymap.set (...)` calls, or a hundred `inline const juce::Identifier` lines,
are the same statement with different data. Typos, drift, and missed updates
concentrate there, because humans are bad at mechanical repetition and good at
reviewing tables. That code becomes rows. Behavior stays imperative **by design**:
logic is what imperative code is *for*. Declarative where the content is data;
imperative where the content is logic. A table that tries to make behavior
declarative has inverted the pattern.

**The table alone prevents nothing.** What kills drift is validation: a
divergence between table and code becomes a *generation failure* — loud,
line-numbered, blocking — instead of silent rot. `cast` has no warnings. Every
failure is fatal (§7).

---

## 2. What Can Be Tabled

Litmus tests. All must pass:

1. **Mechanically regular** — every entry shares one shape. The rows of a table are
   instances of one schema.
2. **Documentation-worthy** — you would write this list in a reference document
   anyway. Then the table is the document and the source at the same time.
3. **Declaration, not computation** — expressible without control flow. A cell can
   carry an expression *as data* (an argument string, a literal). A cell never
   carries logic.
4. **Additive** — to extend the system is to add one more row, not new logic. This
   is MANIFESTO **L**'s 3-branch rule at system scale: a new case is data, not a
   code change.

**Counter-test — the escape hatch.** If an entry needs a function body, branching,
or runtime parameterization, it is behavior. It gets a *name* in the table and a
hand-written body in a behavior module. The generated code references the name.

Proven tabled: identifier vocabularies, enum↔string bimaps, lookup tables,
character sets, colour sets, keybindings, platform-conditional constants, build
settings, file lists, help text. Candidates anywhere: command registrations,
routing tables, parameter descriptors, error catalogs, palette definitions,
feature registries.

---

## 3. How to Design the Table

1. **Start from the generated artifact you wish existed.** Write the ideal output by
   hand for three representative entries. Work backwards. Every axis on which those
   entries *differ* becomes a column. Everything they share becomes template text
   in a `.cast` shape.
2. **Columns are variance, not completeness.** A value that is identical across all
   rows is not a column. It is literal text in the template, or a column in a
   parent table.
3. **Cell values form a small closed set.** Use the `format` column and the
   operations that `cast --help` lists (§ Operations). Never add an open-ended
   "anything" cell — that is code leaking into the table.
4. **Token columns get fixed vocabularies.** A value outside the vocabulary is an
   error, never a passthrough. Extending a vocabulary is a design decision, gated
   (NAMES.md Rule -1).
5. **The documentation columns are first-class.** `comment` and `brief` exist
   because the table is the documentation. `cast` renders them as comments in the
   output, in the output language's own comment syntax. A table that humans cannot
   read has failed its second purpose.
6. **Custom schema, stock syntax.** The schema — table names, column meanings,
   vocabularies — is yours to design per domain. The syntax is not: every data file
   is valid markdown (headings, pipe tables, grid tables, prose, fences). `cast`
   formats it to canonical markdown.

---

## 4. Think Relational — M:N, Never Linear 1:1

The beginner's error is "one table → one output block, one row → one line." A
CAST data set is a **relational schema**, not a list:

- **Registry and detail tables, joined by address.** A manifest wires tables by
  `@file:table:column` addresses. A filtered address
  (`@file:table:column=value`) selects one row set of a table.
- **One row → many artifacts.** One bimap row fans out into an enum entry, a string
  constant, a forward map, a reverse map.
- **Many tables → one artifact.** Rows that declare the same `file` merge into one
  output file.
- **Shapes nest.** A wrapper shape takes another shape in a named token. Nesting
  gives hierarchy from flat tables.

Compose these freely. A finite set of table shapes gives unbounded system shapes.
Design the schema that the domain needs. Do not force the domain into one flat
table.

---

## 5. The Boundary

Four rules, all hard:

1. **Bodies never enter tables.** No function bodies, no control flow, no
   multi-statement logic in any cell. When a cell wants an `if`, it wants a name.
2. **Tables never hide in bodies.** Behavior modules contain zero hand-written
   declarations of a kind that a table owns. Such declarations appear only in
   generated output.
3. **The escape hatch is constitutive, not a concession.** A name in a table that
   references hand-written behavior is correct design. To remove it does not purify
   the design — it forces behavior into cells.
   **The overengineering failure mode:** when the schema "cannot express X", the
   answer is a name that references a hand-written body — never a new schema
   feature that lets cells carry logic. The schema grows only for new *declaration*
   shapes, never for computation.
4. **Static only.** Instances created at run time belong to the behavior module that
   creates them. CAST covers static declarations.

Flow is strictly unidirectional (MANIFESTO **E**, layer topology):

```
tables → cast → generated code → references → behavior modules
```

Never backwards. Behavior never reads the tables.

---

## 6. Relation to Knuth's Literate Programming

**Shared:** the human-readable document is the source artifact. Code is extracted
("tangled") from it. Documentation and source cannot diverge, because they are one
file.

**Fundamentally different:**

| | Literate Programming | CAST |
|---|---|---|
| Scope | ALL code lives in the document | only declarative residue |
| Relation to code | replaces source | complements source |
| Debugging surface | generated code — you debug what you did not write | generated code is plain declarations you never debug; behavior stays first-class hand-written code |
| Authoring change | a new mode for everything | changes authoring only for declarations |
| Adoption cost | team-wide buy-in | one tool, one manifest per project |

Literate programming failed to spread because tools — debuggers, grep, stack
traces — point at the tangled output. CAST avoids this: the generated artifact is
regular, transparent, bannered, and nothing you would step through lives there.

---

## 7. Contract — What `cast` Guarantees

`cast` gives these guarantees. An agent does not re-implement them.

1. **One source of truth.** The data files and templates are the source. The
   manifest's index declares each input file one time. `cast` never scans a
   directory.
2. **Deterministic output.** From `cast --help`: *"Your tables, your templates, your
   manifest, and the binary determine the output bytes. No timestamps, no paths, no
   host state. Files use LF."* Write-if-different: a second run makes an empty diff.
3. **Fatal, line-numbered failure.** From `cast --help`: *"No warnings exist. Every
   failure is fatal, exits non-zero, and writes no output file."* Each diagnostic
   names the file, the physical line, and the column. The last good output stays on
   disk.
4. **Bannered output.** Each generated file carries the CAST banner in its own
   comment syntax. Generated outputs are build artifacts. Never edit them. Edit the
   table or the template.
5. **Canonical markdown.** `cast` formats each declared markdown file before it
   generates. The data files stay in one canonical form.
6. **Build integration.** For CMake projects: *"Invocation is `codegen.cmake`,
   included before `project()`"*, and the configure dependencies come from the
   manifest. For other hosts, the staleness gate is a `cast` run on the host's own
   trigger — for example, on save of a data file.

---

## 8. Procedure (CAROL Agents)

When ARCHITECT directs generation for a new domain or a new stack:

1. **Read the tool first** (PP-6: the pattern lives in the codebase, not the
   corpus). Run `cast --help`. @Pathfinder at least one reference manifest (§0):
   `spell.md`, its data files, its `.cast` templates, and the generated output.
2. **Identify the declarative residue** in the target system and its current drift
   surfaces. Count the copies: code, docs, comments.
3. **Extract behavior first.** Move bodies into behavior modules with named entry
   points. Hand-wire them and verify equivalence. This step has value by itself and
   lowers the risk of generation.
4. **Design the schema** — tables, columns, vocabularies — and the `.cast` shapes.
   Every new name and vocabulary token is gated (NAMES.md Rule -1).
5. **Surface boundary decisions to ARCHITECT** one at a time: escape-hatch homes,
   and anything the schema cannot express. The answer is usually "it is behavior —
   it goes in a module", not "extend the schema".
6. **Write the manifest** (`spell.md`): the index, the output wiring, and the
   toolchain rows if the project needs them. Use the existing `cast` features. If
   `cast` cannot express a *declaration* shape, stop and report it to ARCHITECT.
   Do not work around the tool, and do not write a local generator.
7. **Prove equivalence.** Diff the hand-written artifact against the generated one
   before the switch-over.
8. **Wire the staleness gate** on the host's own trigger (§7, item 6). Test three
   paths: in-sync no-op (zero changes), stale regeneration, broken input (fatal, the
   last good output stays).
9. **Audit:** SSOT (no stray declarations outside generated output), the boundary
   rules, determinism (a second run is an empty diff), cross-platform identity.

---

*The table is the vocabulary. The code is the behavior. `cast` is the bridge. Its
validation is the drift-killer.*

*Rock 'n Roll!*
**JRENG!**

---
*Version 0.2 — September 2026*
