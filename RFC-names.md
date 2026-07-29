# RFC: NAMES.md — Verb Contract, Sibling Precedence, Boundary Naming

**Author:** COUNSELOR (KANJUT session, Document SSOT wave)
**Date:** 2026-07-29
**Target:** `~/.carol/NAMES.md` (MACHINIST surface) and its project mirror `codebase-for-dummies/docs/NAMES.md` (KANJUT)
**Status:** proposal — ARCHITECT-gated, no file mutated by this RFC

---

## Motivation

Five naming decisions in one sprint each required an ARCHITECT ruling because NAMES.md
does not state the rule that produced them. In every case ARCHITECT's answer was
derivable from existing codebase evidence — the rule existed in practice but not in
writing, so the gate (Rule -1) was hit repeatedly for questions that had a determinate
answer.

These additions do not open Rule -1. They reduce how often it is hit by making the
existing, already-enforced conventions explicit.

Session evidence, verbatim decisions:

| Decision | ARCHITECT ruling | Rule that produced it |
|---|---|---|
| svg span extraction | *"get should return the object, add should add to container"* | (1) Verb contract |
| `addToken` over `getToken` overload / `tokenize` | `addToken` | (1) Verb contract |
| `getPropertyType` over `getType` / `getTokenType` | `getPropertyType` | (2) Sibling precedence |
| `styleAttributes` over `attributeSerializers` / `attributeEmitters` | `styleAttributes` | (3) Boundary naming, (4) agent nouns |
| rejection of `valueEmitters` | *"no emitter NAMES.md"* | (4) Agent nouns |

---

## Rule 7 — Verb Contract

**Principle:**
A verb prefix is a contract about what the call does to the world, not a decoration.
The codebase's verb set is fixed and each verb means exactly one thing:

| Verb | Contract |
|---|---|
| `get` | Returns the object. Does not store, does not mutate a container. |
| `add` | Inserts into a container. The container is the subject. |
| `set` | Replaces an existing value in place. |
| `is` / `has` | Answers a question. Returns bool, changes nothing. |
| `apply` | Pushes a computed result onto a target the caller supplies. |
| `getOrCreate` | Returns the object, creating it when absent — the side effect is in the name. |

A unit that both computes and stores is two units. Split it: `get` returns, the caller
`add`s. When splitting produces a one-line call site, that is the correct shape — not a
reason to fuse the verbs.

**Rationale:**
Rule 1 fixes word class (nouns for things, verbs for actions) but leaves verb *semantics*
open, so every new member re-litigates whether `get` may have a side effect. It may not.
Rule 3 already forbids `getUserSettings` when the function creates the file; this rule is
the generalisation — the verb states the effect, always, and the vocabulary is closed.

**Examples:**

```cpp
// WRONG — get that stores
static juce::String getSvg (const Array<Token>&, Document& element, int& index);

// CORRECT — get returns, caller adds
static juce::String getSvg (const Array<Token>&, CharPointerType source, int& index, int& offset);
element.add<juce::String> (Id::svg, getSvg (tokens, source, index, offset));

// CORRECT — add is named for the container it feeds, returns what the caller needs to advance
static int addToken (kuassa::Array<Token>& tokens, CharPointerType cursor, Token::Type segmentType);
```

---

## Rule 5 — Consistency *(amendment, not a new rule)*

Append to the existing Rule 5:

**Nearest-sibling precedence.**
When a new member joins an existing family — a class's reader set, a module's `add*`
family, a file's dispatch tables — the family's established shape outranks any
independently better name. Consistency is measured against the nearest surrounding
set first, the module second, the framework third.

**Rationale:**
A name that is locally better but breaks its family costs every future reader a lookup
to confirm the two members really do differ. The family shape is itself documentation.

**Example:**

```cpp
// Existing family on Css::StyleDeclaration
juce::String getPropertyValue (juce::StringRef) const;
juce::String getPropertyPriority (juce::StringRef) const;

// CORRECT — joins the family
int getPropertyType (juce::StringRef) const;

// WRONG — locally defensible (it reads Token::type), breaks the family
int getType (juce::StringRef) const;
```

---

## Rule 8 — Boundary Naming: name the output domain

**Principle:**
A unit that consumes vocabulary from domain A to produce vocabulary in domain B is named
in **B's** terms — what it yields, never what it is keyed by or reads from.

**Rationale:**
Callers reach for a name by what they want out of it. Naming by the input or the key
forces the reader to know the implementation before they can find the symbol, which
inverts Rule 3 (semantic over literal): the key is an implementation fact, the output is
the meaning.

**Example:**

```cpp
// Css: keyed by Id::CssTokenType ordinal, named for the attribute it yields
static const auto attributeSerializers { ... };   // inside getStringAttribute

// Html: keyed by the same ordinal, yields element attributes on a style element
static const auto styleAttributes { ... };        // inside addStyleAttributes

// WRONG — names the key, not the product
static const auto tokenTypeMap { ... };
```

Corollary: where the two domains have competing words for the same slot — CSS calls it a
`property`, an element calls it an `attribute` — the containing function's own name
settles it. `addStyleAttributes` yields attributes, so its table is named for attributes.

---

## Rule 6 — Forbidden Terms *(amendment: the generative test)*

Rule 6 currently enumerates banned words. Add the test that generates the list, so new
candidates are decidable without an ARCHITECT round-trip:

**The agent-noun test.**
A name ending in `-er` / `-ers` is permitted only when it performs a **real, named
operation** that exists in the domain vocabulary. If the `-er` names a mechanism rather
than a contract — *the thing that does the thing* — it is banned by the same reasoning
that bans `handler`.

| Candidate | Verdict | Why |
|---|---|---|
| `serializers` | permitted | serialization is a real named operation |
| `fetchers` | permitted | fetching is a real named operation |
| `emitters` | **banned** | "emit" names no operation in this domain — mechanism, not contract |
| `handler` | **banned** *(already listed)* | says nothing about what is handled |
| `manager` | case-by-case | permitted only where the managed domain is in the name (`StyleManager`, `ParameterManager`) |

Add to the Rule 6 table:

| Banned | Use instead | Rationale |
|--------|-------------|-----------|
| `emitter` | the produced thing (plain noun), or the real operation | Names the mechanism, not the contract — `handler`'s twin |

---

## Rule 9 — Dispatch Tables Are Nouns

**Principle:**
A lookup table replacing a branch chain (`kuassa::Function::Map` and equivalents) is named
either as a plain noun for **what the table holds**, or as a verb-noun for **what it
drives**. Never as an agent plural.

**Rationale:**
MANIFESTO L's 3-branch rule makes these tables the standard replacement for decision
chains, so they now appear in every module — an unstated convention would drift within one
sprint. The table is data; data takes noun names (Rule 1).

**Examples:**

```cpp
// Plain noun — what the table holds
static const auto selectors { ... };
static const auto markupOperators { ... };
static const auto styleAttributes { ... };

// Verb-noun — what the table drives
static const auto treeConstruction { ... };

// WRONG — agent plural (Rule 6 agent-noun test)
static const auto valueEmitters { ... };
static const auto tokenHandlers { ... };
```

---

## Relationship to Rule -1

Rule -1 (No Improvisation) is unchanged and remains the gate: agents introduce zero names
without ARCHITECT approval. These rules narrow the *space of candidates* an agent may
propose, and let COUNSELOR reject a non-conforming name without a round-trip. They never
authorise an agent to introduce a name unasked.

---

## Open Questions for ARCHITECT

1. **Surface.** `~/.carol/NAMES.md` is CAROL framework (MACHINIST). `codebase-for-dummies/docs/NAMES.md`
   is KANJUT project surface (COUNSELOR). Both, or framework-only with the project copy
   re-synced from it?
2. **Rule numbering.** Proposal appends 7/8/9 and amends 5/6 in place. Alternative: fold
   the verb contract into Rule 1 (word classes) rather than standing it up separately.
3. **`manager` disposition** in the Rule 6 agent-noun table — currently written as
   case-by-case with the domain-in-the-name test. Confirm or make it absolute.
