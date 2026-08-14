# Philosophical Framework for Naming in Code

## Preamble

These rules set boundaries to reduce cognitive load, improve readability, lower debugging complexity, and prevent unnecessary technical debt.

They form a holistic approach to naming—meant to guide consistent reasoning, not to cover every edge case or be applied selectively for convenience.

They are tools, not laws: reliable in most situations, but not universally applicable. When a rare case genuinely requires breaking a rule, it should be a deliberate exception, not an accident.

---

## Rule -1 — No Improvisation

**Principle:**
All new names are gated. No agent introduces a new name, type, method, or pattern without explicit ARCHITECT approval.

**Rationale:**
Naming is architecture. A new name creates a new concept in the system's vocabulary — it shapes how every future reader understands the domain. Improvised names during implementation drift from the architectural intent and create inconsistency that compounds. CAROL.md gates the behavior; this document defines what correct naming looks like once approved.

---

## Rule 0 — Use English

**Principle:**  
All names in code must be written in English.

**Rationale:**  
Using a single language removes unnecessary context-switching. Almost all programming tools, libraries, and documentation are written in English, so using English names keeps the codebase uniform and easier to read. It also ensures that everyone reading the code interprets the same meaning without translation effort.

---

## Rule 1 — Word classes must match their role

**Principle:**  
Use nouns for things, verbs for actions. The grammatical form of the name must reflect what the construct does in the program.

**Rationale:**  
Developers write code, and every line of code becomes a potential liability: it may break, it may hide bugs, and someone will eventually need to understand it. The only protection we have against that future uncertainty is readability. If you cannot read a piece of code clearly, you will not understand it. If you cannot understand it, you will not be able to fix it.

Using nouns for classes, structs, and variables—and verbs for functions—is aligned with the way we naturally think and communicate. It makes code read more like a structured sentence rather than a puzzle. This reduces mental effort and makes the intent of each construct immediately obvious.

**Examples:**

Classes and variables use nouns:
```cpp
class Manager;
class ProcessorChain;
struct Descriptor;
int panelHeight;
juce::File presetDirectory;
```

Functions use verbs:
```cpp
void buildInterface();
void applyImages();
bool isValidParameterID();
juce::String getProductName();
```

Booleans prefix verbs before nouns or use adjectives:
```cpp
bool isUsingWhitespace;
bool isPresetDirty;
bool shouldPromptLicense;
bool isEvaluating;
```

**Singular vs Plural:**
```cpp
struct Descriptor;
// Singular. An object structure that contains information describing data,
// used at compile-time or runtime.

using Descriptors = std::unordered_map<juce::String, Descriptor>;
// Plural. A container that holds multiple Descriptor objects indexed by ID.
```

**Verb Contract:**

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

## Rule 2 — Construct expression without data type statement

**Principle:**  
A name must express its role without explicitly using the data type itself.

**Rationale:**  
Type information is already enforced by the compiler and visible in modern IDEs. Encoding types into names adds noise without adding meaning. The name should describe *what* the construct represents in the domain, not *how* it's stored in memory. This keeps names focused on intent and prevents names from becoming outdated when types change during refactoring.

**Examples:**

**Bad:**
```cpp
int filesInt;
// filesInt tells the reader the type, not the meaning.

class FileMgrClass;
// FileMgrClass redundantly names the construct instead of expressing its purpose.

juce::StringArray choicesArray;
// "Array" suffix duplicates type information already visible in IDE.

std::unique_ptr<juce::XmlElement> xmlPtr;
// "Ptr" suffix is redundant—the type already indicates it's a pointer.
```

**Good:**
```cpp
int panelHeight;
// panelHeight clearly communicates it represents a vertical measurement—
// readers naturally expect this to be an integer without being told.

class Manager;
// Manager conveys the idea of a class responsible for coordinating operations,
// without needing to append "Class" or encode its type.

juce::StringArray choices;
// "choices" describes the semantic content, not the container type.

std::unique_ptr<juce::XmlElement> layout;
// "layout" describes what the data represents in the domain.
```

---

## Rule 3 — Semantic over literal

**Principle:**  
Semantic naming involves choosing names that clearly and accurately convey the purpose and meaning of the data they hold, rather than just their type or how they were obtained.

**Rationale:**  
Code is an expression of ideas. A name should clearly communicate its purpose, intention, or role within its specific context and scope. Semantic names prevent bugs by revealing intent—literal names hide meaning and force readers to reverse-engineer what code does. When you name things by what they *mean* rather than what they *are*, you make the invisible visible.

**Examples:**

**Bad:**
```cpp
juce::File getUserSettings(juce::XmlElement* defaultSettings = nullptr);
// "getUserSettings" suggests retrieval only, but the function actually 
// creates the file if missing and writes default values.

const juce::File getFactoryDefaultPresetsDirectory(const juce::String& versionString);
// Function creates directories if they don't exist—"get" implies pure retrieval.

std::unique_ptr<juce::XmlElement> xml;
// "xml" describes the format/container, not what the data represents.
```

**Good:**
```cpp
juce::File getOrCreateUserSettings(juce::XmlElement* defaultSettings = nullptr);
// Name reveals the function creates the file when needed, not just retrieves it.

const juce::File getOrCreateFactoryPresetsDirectory(const juce::String& versionString);
// "getOrCreate" accurately describes the side effect of directory creation.

std::unique_ptr<juce::XmlElement> layout;
// "layout" describes the semantic meaning—a UI layout structure.

std::unique_ptr<juce::XmlElement> presetData;
// "presetData" tells you what the content represents, not just that it's XML.
```

**Key practices:**

- **Describe the content, not the container:** A variable named `layout` is more semantic than `xmlElement` or `xmlData`, as it tells you what the XML represents.

- **Be specific and precise:** Instead of `getUserSettings()`, use `getOrCreateUserSettings()` when the function has side effects. This prevents bugs where callers assume the function is read-only.

- **Boolean variables:** Name boolean variables to reflect the condition they represent, such as `isPresetDirty`, `shouldPromptLicense`, or `isEvaluating`.

---

## Rule 4 — Clarity over brevity

**Principle:**  
Longer descriptive names are unambiguous and self-documented, potentially reducing unnecessary comments.

**Rationale:**  
Compilers don't care how long or short your variables and functions are named. If everything is legal and sane, it will work. But when it doesn't, humans need to read, review, and debug. Short names might be easier to type, but adding extra comments to explain them just adds noise and pollutes the codebase.

**Examples:**

**Bad:**
```cpp
// Unclear scope and purpose
void build(juce::Component* view, 
           Descriptors& descriptors,
           Registry& registry);

// Vague about what's being set
void setValue(const juce::String& newValue);

// Hidden side effect—function also validates and may throw
juce::File getSettings();
```

**Good:**
```cpp
// Explicit about the complete operation
void buildAndAttachComponents(juce::Component* parentView,
                              Descriptors& componentDescriptors,
                              Registry& componentRegistry,
                              Model& dataModel);

// Clear about which scale value
void setUIscale(const juce::String& newScaleValue);

// Reveals the side effect in the name
juce::File getOrCreateUserSettings(juce::XmlElement* defaultSettings = nullptr);

// Parameters clarify their domain context
const juce::File getFactoryDefaultPresetsDirectory(const juce::String& versionString) const noexcept;
const juce::File getUserPresetsDirectory() const noexcept;
```

**Real consequence:**
```cpp
// BAD: Hides critical behavior
void loadPreset(const juce::File& file);
// Reader assumes this is safe to call anytime.
// Actually silently fails if preset is dirty!

// GOOD: Name reveals the precondition
void loadPresetIfNotDirty(const juce::File& file);
// Or better, be explicit in implementation:
if (isPresetDirty()) return; // Now readers see the guard
```

---

## When to Bend the Rules

These rules are tools, not laws. There are legitimate cases where bending them produces clearer code:

**Domain-specific context:**
```cpp
class Model : public juce::AudioProcessorValueTreeState
{
    // "Model" bends Rule 2 (it's technically an APVTS wrapper)
    // BUT: Within an MVC architecture, "Model" is semantically correct
    // for its role, even though the type is 40+ characters long.
    // Context matters—inside your namespace and architecture,
    // this name is more meaningful than "AudioProcessorValueTreeState".
};
```

**Established conventions:**
```cpp
// Loop counters in small scopes
for (int i = 0; i < items.size(); ++i)
{
    process(items[i]);
}

// Standard abbreviations when universally understood
juce::XmlElement* xml;  // Not "xmlDocument"—context is clear
juce::String id;        // Not "identifier"—too verbose for ubiquitous use
const juce::String& url; // Domain abbreviation, widely understood
```

**Scope-dependent brevity:**
```cpp
// Short scope: brevity acceptable
auto isValid = [&](const auto& x) { return x.isNotEmpty(); };

// Class member: clarity required
class Manager
{
    bool isUsingWhitespace;  // Not "flag" or "b"
};
```

**When bending a rule, ask:**
- Does this name's meaning remain clear within its scope?
- Would a longer name add noise without adding clarity?
- Is this convention universally understood by the team?

If you can't answer "yes" to all three, follow the rules.

---

## Rule 5 — Consistency

**Principle:**  
Applying the above rules holistically across the codebase will guarantee identical self-documented patterns linguistically and semantically. When the same concept appears in different parts of the code, it should use the same naming convention. If you use `get` for retrieval in one place, don't switch to `fetch` or `retrieve` elsewhere. If collections are plural, keep them plural throughout.

**Rationale:**  
A consistent codebase is easier to read, understand, and maintain. Consistency creates predictability—developers can form reliable mental models about how the code works. When patterns repeat uniformly, new team members onboard faster, bugs become easier to spot, and refactoring becomes safer. Inconsistency forces readers to question whether differences in naming indicate differences in behavior, adding unnecessary cognitive load. Consistency transforms a collection of files into a cohesive system.

**Examples:**

**Inconsistent patterns:**
```cpp
// Mixing verb forms for similar operations
juce::String getProductName() const noexcept;
juce::String fetchVersionString() const noexcept;
juce::String retrieveProductWebsite() const noexcept;

// Inconsistent parameter naming
void applyImages(juce::Component* view, Descriptors& descriptors);
void applyRules(juce::Component* comp, Descriptors& desc);
void attachTo(juce::Component* parent, Descriptors& componentDescriptors);

// Mixed naming for boolean checks
bool isPresetDirty() const noexcept;
bool shouldPromptLicense() const noexcept;
bool checkIfEvaluating() const noexcept;  // Inconsistent with is/should pattern
```

**Consistent patterns:**
```cpp
// Uniform verb form for getters
juce::String getProductName() const noexcept;
juce::String getVersionString() const noexcept;
juce::String getProductWebsite() const noexcept;

// Consistent parameter naming throughout Manager
void applyImages(juce::Component* view, Descriptors& descriptors);
void applyRules(juce::Component* view, Descriptors& descriptors);
void attachTo(juce::Component* view, Descriptors& descriptors);

// Consistent boolean naming pattern
bool isPresetDirty() const noexcept;
bool isEvaluating() const noexcept;
bool shouldPromptLicense() const noexcept;
```

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

## Rule 6 — Forbidden Terms

Certain names are banned because they are vague, borrowed from the wrong domain,
or carry no semantic content. Use the exact semantic purpose instead.

| Banned | Use instead | Rationale |
|--------|-------------|-----------|
| `graft` | `attach` | Botanical metaphor — not a software concept |
| `node` | the actual tree type name | Exposes implementation detail, not domain meaning |
| `seed` | *(banned outright)* | No defined meaning in this codebase |
| `handler` | `callbacks`, `events`, `parameters`, or the exact dispatch purpose | Says nothing about *what* is handled — name the contract, not the mechanism |
| `kind` | `Type` | `Type` is canonical throughout the codebase — `kind` creates ambiguity with no semantic distinction |
| `resolve` | `get`, `set`, `find`, `isSomething`, `hasSomething`, or the exact direct action | Indirect/ambiguous — signals an obfuscated mental model or unclear design, not a real operation |
| `ensure` | `get`, `getOrCreate`, `cache`, or the exact unconditional action | Concedes the precondition might not hold — pessimistic by construction; the invariant belongs at the owner, asserted once, not re-doubted at every call site |
| `emitter` | the produced thing (plain noun), or the real operation | Names the mechanism, not the contract — `handler`'s twin |

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

---

## Rule 7 — Boundary Naming: name the output domain

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

## Rule 8 — Dispatch Tables Are Nouns

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

## Rule 9 — CAST Canon Files

**Principle:**
Every CAST-driven project declares its generation inputs in the canon files:

| File | Role |
|------|------|
| `CAST.md` | Codegen Annotated Source of Truth — the manifest: relation table → fragment template → output |
| `lexicon.md` | Every entity declared ONCE — `\| name \| value \|`. Name carries its authoritative casing; value is the verbatim literal (empty for pure names) |
| `relations.md` | m:n mappings between lexicon entities — every cell is a reference, never a fresh string |
| `chars.md` | Single characters only — the full printable ASCII set (0x20–0x7E) plus named control characters. Framework-owned: only the framework declares chars; projects consume `chars::` directly and declare zero chars of their own |
| `files.md` | Filenames with extensions, nothing else — generates `namespace files` |
| `extensions.md` | File-extension / info-string tokens, one per row — generates `namespace extensions`. Framework-owned: only the framework declares extensions; projects consume `extensions::` directly |
| `localisation-lang.md` | The only long-text home — one file per language, identical table shape, key-set equality enforced by `parity`. Generates `namespace text::lang` |

**Generated namespaces are lowercase** — the namespace convention is always lowercase:
`chars`, `files`, `text::lang`. Exception: `Id` keeps its capital because
`id` is an Objective-C reserved keyword (the generic object pointer type),
making `namespace id` illegal in `.mm` translation units.

**Framework-first SSOT:** a value the framework already declares is never re-declared
downstream — no project re-wraps, aliases, or re-types a framework constant. Call
sites reference the framework's generated name directly.

**Declaration type follows dominant consumption, and type is data.** An entity
consumed as an Identifier (tree keys, property keys, table lookups) declares an
Identifier-type token; an entity consumed as a string (delimiters, map keys, emitted
text, cell comparisons) declares a String-type token. The mechanism is the lexicon
`type` column — explicit on every row, holding an opaque token (`Identifier`,
`String`, or whatever a target language names its types). CAST is language-agnostic:
the engine never knows any type name — it delivers the cell to the `type` jack like
any other column, and the project-owned template composes the declaration around it
(`inline const juce:::::type::: …` is template knowledge, never engine knowledge).
No engine default exists — a default would smuggle one language's type into the
engine. A `.toString()` projection at nearly every call site is the violation
signature — the declared type is wrong, not the call sites.

**Entity rules:**
- An entity is unique, whole, and opaque. `UI`, `scale`, and `UI scale` are three independent declarations — CAST never decomposes or derives one entity from another.
- Uniqueness is global and case-insensitive. First declaration wins and fixes the casing.
- **Case is not identity.** A differently-cased spelling of an existing token is never a second entity. The token is declared once; each domain projects the casing its own wire format demands, at the point of use, through jam::Format's case family. Python's `True` is `jam::Format::toPascalCase (Id::tokenTrue)` — not a declaration. The sole exception is a spelling no case-family projection can produce from the declared token; only then does it earn its own declaration, and the reason is the projection's impossibility, never convenience.
- Word boundaries (spaces) are stored data — the declaration is the single source of every projected form. The declared casing is what `@entry@` emits verbatim.
- Casing at emission belongs to the template, via transform tags backed by jam::Format's case family. An all-uppercase declared word is an abbreviation and is case-invariant in every projection, every position; all other words normalize strictly per each projection's own rule: `UI scale` → `UIScale` (Pascal and camel), `fail hazard URI` → `failHazardURI` (camel), `fail-hazard-URI` (kebab), `scale_X` (snake). A wire format demanding a lowercased abbreviation authors the literal value. No transform consults anything beyond the entity itself.
- The case family is consistent and lives in jam::Format only: `toTitleCase`, `toPascalCase`, `toCamelCase`, `toKebabCase`, `toSnakeCase`, `toScreamingSnakeCase`. Consumers register these directly — no pass-through wrappers (SSOT).
- Every use outside the declaration — relation cells, template tags — is a reference, resolved byte-exactly against the declared canonical form (case-insensitivity applies only to the uniqueness constraint, never to lookup). Referencing an undeclared entity — including a declared word in the wrong casing — is a generation error.

**Golden Rules — how to write a CAST table:**

*Form (engine-enforced, FATAL):*
1. A name is one or more English words, space-separated, lowercase — except ALL-CAPS abbreviations (`URI`, `SGR`, `CSI`).
2. No plain-number names, no leading digit, no special characters.
3. Name ≤ 40 characters — longer is a symptom of a bad name, not a formatting problem.
4. A row whose name cell is all dashes (`|---|`) is a visual separator — ignored by the engine everywhere.
5. Ordinals are arbitrary data. Map-type tables are `key|value` and declare every ordinal explicitly — no value is ever derived from row position. The lexicon still stores no ordinals; map and relation tables do.
6. A stored value that byte-equals any case-family projection of its own name is redundant data — FATAL; declare the words, let the template project.

*Word choice (the standard that replaces per-name approval):*
7. **Free lexicon first.** A word that belongs to no single domain is declared once, free and unqualified — `h1`, `source`, `const`, `break`, `div`. Every domain references that exact token; no domain re-declares it. A domain declares only what does not already exist in the free lexicon, and qualifies a name only when the unqualified word would be a genuinely different concept — never to carry a second spelling of the same one. There is no `markdown h1` and no `html h1`; there is `h1`. There is no `vulkan source` and no `html source`; there is `source`.

   **The caller formats.** The declaration stores the token; each domain projects it into the form its own wire format demands — case, joining, prefixing — at the point of use, through jam::Format's case family. Vulkan needs `Source` and calls `jam::Format::toPascalCase (Id::source)`; HTML needs `source` and calls `Id::source.toString()`. One declaration, two projections. A second declaration created to hold a second spelling is a duplicate token — FATAL.
8. **Name the meaning, never the container or type.** `html end tag`, never `html token type end tag` — the relation table already carries the classification (Rules 2, 3).
9. **Nouns for things** — entities are data, noun phrases only (Rule 1).
10. **Clarity over brevity, then stop.** Every word earns its place; ~5 words is a smell threshold — investigate the chosen words, don't cap mechanically (Rule 4).
11. **One concept, one word, everywhere.** `end tag` in html and xml both; never `open`/`close` mixed with `begin`/`end` (Rule 5).
12. **Forbidden terms apply** (Rule 6).
13. **Resolution corollary:** two entities that still spell identically after rules 7-12 are the same concept — ONE declaration. A remaining genuine difference means a wrong domain word was chosen, never a case for suffixing.

*Structure:*
- The lexicon registry is the union of the canon tables — `## lexicon` (lexicon.md), `## chars` (chars.md), `## files` (files.md), `## extensions` (extensions.md); satellite files carry their own heading so dispatch addresses them unambiguously, and dispatch sources the declaration tables directly (column `name`). Emission follows declaration: a reference emits its entity's own generated symbol (`Id::x.toString()` for lexicon, `extensions::x` for extensions), never a second copy. Entry tables in `relations.md` exist only for genuine selections, never as full duplicates of a canon table. Each file is organized as separator-delimited, alphabetically sorted domain blocks.
- Vocabulary vs content: referenced-by-many → lexicon; owned-by-one-output prose (localisation, legal text, display copy) → its own dedicated key-style table, outside the lexicon and exempt from its length/redundancy checks by construction.
- Localisation is the only long-text home: one file per language, every language the identical table shape, key-set equality enforced by the `parity` predicate.

**Manifest contract — how tables reach templates:**
1. **`## index` declares every input file once** — `| name | path |`, mandatory in CAST.md. It is the file index: the engine parses exactly what `## index` declares — no directory scanning, no glob. Referencing an undeclared name is FATAL.
2. **Output-shaped tables drive generation** — `| <body> | <wrapper>... | file |` are the mandatory bones; `file` is the only reserved column name. The body cell names the innermost fragment; each subsequent wrapper cell layers left→right through its `:::code:::` jack. `## output` is mandatory; further output-shaped tables follow the same bones with their own truthful column sets — a `struct` wrapper never sits under a column named `namespace`, so different nests are different tables, never folded.
3. **Junctions are named jacks.** A table column is an output jack; a template placeholder is an input jack. Same name = same circuit — `:::value:::` draws from column `value`; region `:::list:begin:::` draws its rows from the column named `list`. No mapping syntax exists.
4. **Table references are `name:table` qualified** — a list cell names its source as `<index name>:<heading>` (`lexicon:lexicon`, `template:template token type`, `CAST:output`). The colon is the syntax; resolution failure is FATAL — never a silent passthrough.
5. **Separators wire by suffix** — the column `<region> lineBreak` names the fragment joining that region's rows. One reserved suffix word.
6. **Selection is emergent.** A source row expands only when every jack its region references carries a signal (non-empty cell); an empty referenced cell drops the row. No filter grammar, no selection tables as a patch mechanism.
7. **Parity is enforced.** Per output row, the placeholder union of its resolved fragments must equal its non-reserved columns; list-region interiors validate against their source table's columns. No match, no cigar — FATAL.
8. **Extending is a cell or a column.** A new circuit is one column on the output-shaped table matched by one placeholder in its fragments — never a new mechanism, never a duplicated row.

Transform tags project a jack's signal at emission — `:::column:transform:::` — through jam::Format's registered transforms; the jack name is always the column name, the suffix is always a registered transform, nothing else appears between delimiters.

**Format ops project declarations, never references.** A transform tag is legal at exactly
one boundary: the emission site of a declaration table (lexicon, chars, files, extensions,
localisation), where the declared token is projected into the wire spelling that table's own
output demands. Everything above the canon is reference, not projection: a cell in a grammar,
relation, or manifest table writes the entity's name as a byte-exact literal, and emission
derives the entity's own generated symbol (`chars::colon`, `Id::begin`,
`map::Byte::regionOpen`) from its declaration. That derivation is exactly why the canon
registries are globally UNIQUE — one declaration, one symbol, every reference emits it.
Derivable data — generated files above all — never carries a format op; a transform tag
applied to a reference is a conflation error, not a convenience.

**The master include header is second-order.** Every scope's master
(`(prefix)Generated.h`) is generated, never authored, by the optional
`## output index` table — an output-shaped table whose list source is `## output`
itself (`CAST:output`). The `file` column of `## output` IS the header list; no
separate headers table exists (SSOT). The master is not an `## output` row — it is
emitted after them, beside them, from them.

**Division of labor:**
Table is mapping. Template is cookie cutter — placeholder substitution only. Logic belongs at the engine.

**Generation pipeline — documents build and write themselves.** The Model parses once
(operational chain); each template parses once into a shared immutable grammar tree; each
output row builds its own output document — a state tree resolved from the grammar tree
against the Model at build, never at emission; each output document writes its own target
file. Build and write are the only two operations. An engine component that scans a
document's internals node-by-node to produce output is the violation signature — the
document was asked, not told. No emission vocabulary exists beside the codebase's own
verbs: a document is built, then written.

**Rationale:**
One declaration site per string makes collisions (`hash`/`cssHash`), container-encoded names (`UIScaleMap`), and case-only variants impossible by construction. The data structure dictates the logic — never the other way around.