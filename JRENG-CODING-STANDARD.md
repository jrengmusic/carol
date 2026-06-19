# JRENG! CODING STANDARDS

**Purpose:** This document defines coding standards for LLM agents to follow when generating C++ code. These rules ensure consistency, readability, and maintainability.

---

## CORE PRINCIPLE: DRY (Don't Repeat Yourself)
**Never duplicate code.** Extract common logic into functions, use inheritance, templates, or other abstractions to eliminate repetition.

---

## FORMATTING

### Braces
Always place opening braces on a new line:
```cpp
// WRONG
if (x == 0) {
    foobar();
}

// CORRECT
if (x == 0)
{
    foobar();
}
```

### Spacing

**Operators:**
```cpp
x = 1 + y - 2 * z / 3;  // Space around binary operators
```

**Special operators:**
- Use C++ alternative tokens: `not`, `and`, `or` — NEVER `!`, `&&`, `||`
- `~` preceded by space, not followed: `foo = ~ bar`
- `++` and `--` no spaces: `++i`, `i++`

**Function calls:**
```cpp
foo (x, y);     // Space after comma only
foo (123);      // Space after function name
foo();          // Space after function name
foo[1];         // No space before brackets
```

**Control statements:**
- Blank line before `if`, `for`, `while`, `do` when preceded by another statement
- Blank line after closing brace (unless next line is also a closing brace)

**One-line statements allowed:**
```cpp
if (x == 1) return "one";
if (x == 2) return "two";
```

**Lambdas:**
```cpp
auto myLambda = [] { return 123; };
auto myLambda = [this, &x] (int z) -> float { return x + z; };

auto longerLambda = [] (int x, int y) -> int
{
    // multiple lines
};
```

---

## POINTERS AND REFERENCES

**Asterisk/ampersand placement:**
```cpp
SomeObject* myObject = getAPointer();   // Correct: sticks to type
SomeObject& myObject = getAReference(); // Correct: sticks to type
```

**Multiple pointers:**
```cpp
// WRONG
SomeObject* p1, *p2;

// CORRECT
SomeObject* p1;
SomeObject* p2;
```

**Const placement:**
```cpp
const Thing& t;  // CORRECT: const before type
Thing const& t;  // WRONG
```

---

## TYPE DECLARATIONS

**Templates:**
```cpp
vector<int>
template <typename Type1, typename Type2>  // Use "typename", descriptive names
```

**Line continuation:**
```cpp
// CORRECT: operator at start of continuation line
auto xyz = foo + bar
         + func (123)
         - def + 4321;

// CORRECT: method chaining
auto t = AffineTransform::translation (x, y)
                         .scaled (2.0f)
                         .rotated (0.5f);
```

---

## COMMENTS

**Prefer `//` over `/* */`** for easier block commenting during debugging.

**Alignment:**
```cpp
// CORRECT
/* This is correct
 */

/** This is also correct
 */

// WRONG
/* This is wrong!
*/
```

**Spacing:**
```cpp
// yes!
//no!
```

---

## LITERALS AND CONSTANTS

**Numeric literals:**
```cpp
0xabcdef  // Hex lowercase
0.0       // Double
0.0f      // Float

// AVOID
0.        // No
.1        // No
.1f       // No
```

**Variable initialization:**
Prefer brace initialization over `=`:
```cpp
// CORRECT
int myInteger { 9 };
double sampleRate { 48000.0 };
float gain { 0.5f };

// AVOID
int myInteger = 9;
double sampleRate = 48000.0;
```

**String construction:**
```cpp
String w ("World");              // Best
auto w = "Hello " + w;           // Use implicit conversion
```

---

## NAMING CONVENTIONS

- **Variables:** `myVariableName` (camelCase)
- **Classes:** `MyClassName` (PascalCase)
- **Use descriptive names,** not type-based names
- **Avoid `JUCE_` prefix** (reserved for JUCE library)
- **Enums:** Prefer `enum class`; plain `enum` permitted when required
```cpp
enum class MyEnum
{
    enumValue1 = 0,
    enumValue2 = 1
};
```
- **Template parameters:** Use descriptive names, not `T`
- **No underscores in any variable name.** This includes trailing-underscore constructor
  parameters in member initializer lists. Use a distinct camelCase name.

```cpp
// WRONG
class Object (int parameter_) : parameter (parameter_) {}

// CORRECT
class Object (int newParameter) : parameter (newParameter) {}
```

---

## CONST AND CONSTEXPR

- **Make everything `const` that can be `const`**
- **Use `constexpr` wherever possible** for compile-time evaluation
- **Local variables:** Only mark `const` if it improves readability in longer blocks
- **Function parameters:** Default to `const` for references

---

## OVERRIDE AND VIRTUAL

```cpp
void myFunction() override;        // CORRECT: use override
void myFunction() virtual;         // WRONG: never with override
```

**Always use `noexcept`** where applicable (can improve performance up to 10x).

---

## POINTERS AND NULLPTR

**Null checks:**
```cpp
if (myPointer != nullptr)  // CORRECT: explicit
if (myPointer)             // WRONG: implicit cast

if (myPointer == nullptr)  // CORRECT: explicit
if (! myPointer)           // WRONG: implicit
```

**Use modern casts:**
```cpp
static_cast<float> (x)     // For trivial casts
reinterpret_cast           // For data reinterpretation (see below)
```

**`reinterpret_cast` — legitimate, well-defined use cases:**

| Use case | Standard status |
|---|---|
| `T* → unsigned char* / std::byte*` | Defined by the standard — legal object representation inspection |
| `uintptr_t ↔ pointer round-trips` | Defined when type is sufficiently wide — required for hardware addresses, MMIO, JIT |
| Function pointer ↔ `void*` | `static_cast` cannot do this — implementation-defined but universally supported |

Outside these three cases, `reinterpret_cast` is a red flag. Every other use must be justified at the call site.

**Integer types:**
```cpp
int64_t      // Prefer standard or juce::int64
long long    // Avoid
```

---

## MEMORY MANAGEMENT

**NEVER use raw `new` or `delete`** unless absolutely necessary.

**Prefer:**
1. Stack allocation
2. `std::unique_ptr` or `juce::ScopedPointer`
3. `juce::HeapBlock` for arrays
4. Reference passing over pointer passing

**NEVER:**
- Use `new[]` or `malloc` for C++ arrays
- Use `malloc` or `calloc` at all

**Zero initialization:**
```cpp
MyStruct s = {};           // First choice
zerostruct (s);            // If needed
zeromem (&s, sizeof (s));  // Last resort
memset (&s, 0, sizeof (s)) // AVOID
```

---

## OWNERSHIP

**Pass ownership with `std::unique_ptr`**

**Smart pointers:**
- Prefer `std::unique_ptr` over `juce::ScopedPointer` (newer code)
- JUCE codebase may still use `juce::ScopedPointer` (legacy)

---

## STRING PASSING

Choose based on use case:

```cpp
void foo (const String&);  // General purpose, read-only
void foo (String);         // Will copy anyway
void foo (String&&);       // Move semantics, modify/store
void foo (StringRef);      // Only need basic string operations
```

**Rules:**
- If function will store or move: `String` or `String&&`
- If only basic operations needed: `StringRef` (avoids String object creation)
- Otherwise: `const String&`

---

## CLASS DESIGN

**Use `struct` for data-only types** (saves `public:` line)

**Inheritance format:**
```cpp
class Thing : public Foo,
              private Bar
{
```

**Non-copyable classes:**
```cpp
Foo (const Foo&) = delete;
Foo& operator= (const Foo&) = delete;

// Or use macro
JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (MyClass)
```

**Constructors:**
- Mark single-argument constructors `explicit` unless implicit conversion is intended
- Consider what implicit conversions you allow

---

## NAMESPACES

**NO anonymous namespaces allowed:**
```cpp
// WRONG
namespace
{
    void helperFunction();
    constexpr int kSomeConstant { 42 };
}

// CORRECT: use named namespace or static linkage
static void helperFunction();
static constexpr int kSomeConstant { 42 };
```

**Rationale:**
- Anonymous namespaces hide symbols from tooling, debuggers, and grep-based searches
- They create implicit "private" scopes that fragment the reader's mental model
- Translation-unit-local symbols should be explicit — use `static` linkage, which is visible and greppable
- Named entities survive refactoring across files; anonymous ones silently die or collide

**NO `namespace detail` (or equivalent implementation-hiding namespaces) allowed:**
```cpp
// WRONG
namespace myLibrary
{
    namespace detail
    {
        template <typename T>
        struct HelperImpl { ... };
    }

    template <typename T>
    using Helper = detail::HelperImpl<T>;
}

// CORRECT: place implementation at proper encapsulation boundary
namespace myLibrary
{
    template <typename T>
    struct Helper { ... };
}
```

**Rationale:**
- `namespace detail` is a convention borrowed from header-only libraries to fake private members. It signals "I know this should be encapsulated but I couldn't figure out where" — a design smell, not a tool.
- Real encapsulation belongs in class `private:` sections, separate translation units, or `static` file-local symbols. Use those.
- `detail` namespaces fragment ownership: readers must chase nested namespaces to find what a type actually does, and tooling loses its grip on intent
- BLESSED principle — **Encapsulation**: one responsibility, explicit boundaries, tell don't ask. `detail` violates all three.

If something truly needs to be "hidden" from the public API, it belongs in:
1. A class `private:` section
2. A separate `.cpp` file with `static` linkage
3. A PIMPL idiom with forward-declared implementation class

None of those require `namespace detail`.

---

## CONTROL FLOW

**No bail-out guards — use positive nesting and assert. Result returns are correct and preferred.**
```cpp
// WRONG: bail-out guard — skips work, hides precondition
if (not foobar())
    return;
doSomething();

// CORRECT: assert precondition, positive nesting
assert(foobar() and "precondition: foobar must be valid");
doSomething();

// CORRECT: positive nested check
if (foobar())
{
    doSomething();
}

// CORRECT: result returns — answer determined at that point
int findFirst (const Array<Item>& items, const Query& q)
{
    for (int i = 0; i < items.size(); ++i)
        if (items.at (i).matches (q)) return i;   // answer found — done

    return -1;
}

float applyScale (float x, float threshold, float high, float low)
{
    if (x > threshold) return x * high;   // branch result — done
    return x * low;
}
```

**Narrow pointer scope:**
```cpp
// WRONG: wide scope increases null-pointer risk
auto* f = getFoo();
if (f != nullptr)
    f->doSomething();
// ...lots of code...
f->doSomething();  // Potential null dereference

// CORRECT: narrow scope
if (auto* f = getFoo())
    f->doSomething();
// f out of scope, impossible to misuse
```

---

## MISCELLANEOUS

**NULL:**
```cpp
nullptr  // CORRECT
NULL     // WRONG
0        // WRONG
0L       // VERY WRONG
```

**String literals:**
- Use plain C++ string literals: `"Hello"`
- For Unicode: use `CharPointer_UTF8` or Projucer tool

**Macros:**
- `#undef` after use when possible

**Increment operators:**
```cpp
for (int i = 0; i < 10; ++i)  // Pre-increment preferred
```

---

## HEADER DISCIPLINE (MANDATORY)

### No Forward Declarations

```cpp
// WRONG — forward declarations are symptoms of bad design, strictly forbidden
class SomeComponent;

class MyComponent : public juce::Component
{
    SomeComponent* owner;  // avoid
};
```

**Rationale:** Forward declarations hide dependencies, obscure ownership, and mask include cycles. If you need the type — include the header. If the header is expensive, the design is wrong, not the include.

---

### No Redundant STL Includes

Project-level headers must not explicitly include STL types — `JuceHeader.h` already includes them transitively.

```cpp
// WRONG — JuceHeader.h already provides all STL types
#include "MyProcessor.h"
#include <vector>
#include <string>

class MyComponent : public juce::Component
{
    std::vector<float> data;  // available via JuceHeader.h transitively
};

// CORRECT — trust the transitive include
#include "MyProcessor.h"

class MyComponent : public juce::Component
{
    std::vector<float> data;
};
```

**Rationale:** Explicit STL re-inclusion is redundant, masks include depth, and slows compilation.

---

### No Includes in Submodule Headers or Source Files

A submodule's `.h` and `.cpp` files must include **nothing** — zero includes. Platform-specific headers are the only exception.

```cpp
// WRONG — jam_graphics.h includes its own detail files
#include "detail/jam_cell.h"             // forbidden
#include <cstdint>                       // forbidden
#include "fonts/font/glyph/jam_atlas.h"   // forbidden
```

**Correct pattern — all includes at topmost module header:**

```cpp
// jam_graphics.h — TOPMOST, includes only here
#pragma once
#include <juce_gui_basics/juce_gui_basics.h>
#include <jam_core/jam_core.h>           // jam_core's topmost header only
#include "detail/jam_cell.h"             // detail files included HERE
#include "detail/jam_cell_point.h"       // — not in the detail files themselves
// no other includes in this file

// jam_cell.h — SUBMODULE, zero includes
#pragma once
// — no includes, no forward declares, no STL

// jam_cell.cpp — SUBMODULE, zero includes
// — no includes
```

**Platform-specific exception (.mm / .m files):**

```cpp
// jam_background_blur.mm — platform-specific submodule
#if JUCE_MAC
#include <dlfcn.h>              // platform header — allowed
#import <Cocoa/Cocoa.h>         // Obj-C framework — allowed
// — no other includes
#endif
```

**Rationale:** Single inclusion point at the module definition header enforces clear dependency chains. Submodules are atomic units with no coupling to their containing module's internals. Platform/OS headers are the only exception — required for native API access in `.mm`/`.m` files.

---

### No Redundant TU Includes

A translation unit (`.cpp`) should include only what its declarations require.

```cpp
// WRONG — TU includes headers it does not use
#include "MyHeader.h"
#include "UnusedHeader.h"
```

**Rationale:** Unnecessary includes extend build graphs, slow compiles, and create fragile coupling.

---

## PASS BY VALUE VS REFERENCE

**Pass by value for small types:**
- `Point`, `Time`, `RelativeTime`, `Colour`
- `Identifier`, `ModifierKeys`, `JustificationType`
- `Range`, `PixelRGB`, `PixelARGB`, `Rectangle`

**Pass by `const` reference for:**
- Large objects (`Array`, `String`, complex types)
- When copy constructor is expensive

**Reason:** Pass-by-value enables better compiler optimizations for small types.

---

## STANDARD LIBRARY

**Math functions:**
```cpp
std::abs, std::sqrt, std::sin, std::cos, std::pow  // CORRECT
fabs, sqrtf, powf                                  // WRONG
```

**Integer types:**
```cpp
int8, uint8, int16, uint16, int32, uint32, int64, uint64  // JUCE types
std::uint32_t, std::int64_t                               // Also acceptable
unsigned int                                              // Explicit
unsigned                                                  // AVOID alone
```

**Indexes:**
- JUCE uses `int` for array indices (not `size_t`)
- Aware of mismatch with STL conventions

---

## CONTAINERS AND ARRAY ACCESS

**Use `.at()` for indexed access on containers that provide it (STL containers). For containers without `.at()`, use the container's own bounds-checked accessor.**

```cpp
// CORRECT: Bounds-checked access (Fail Fast principle)
std::array<int, 4> arr {1, 2, 3, 4};
auto value = arr.at (2);           // Throws std::out_of_range if invalid

std::vector<int> vec {1, 2, 3};
auto value = vec.at (1);           // Bounds-checked

// WRONG: Unchecked access (Undefined Behavior risk)
auto value = arr[2];               // UB if index invalid
auto value = vec[1];               // UB if index invalid
```

**Rationale:**
- ✅ **Fail Fast:** Invalid index throws immediately with stack trace
- ✅ **Semantic Correctness:** Signals "runtime index, validate it"
- ✅ **Zero UB Risk:** Prevents silent memory corruption
- ✅ **Debuggability:** Exception provides exact location of error
- ✅ **Performance:** Negligible cost (~1 branch, perfect prediction for small containers)

**Exception:** Only use `[]` when:
- Index is a compile-time constant AND you've verified it's in bounds
- You're in a proven hot path where profiling shows `.at()` is the bottleneck (rare!)
- In such cases, add a comment justifying the choice

**Range-based loops:**
Prefer range-for when you don't need the index:
```cpp
// BEST: No index needed, inherently safe
for (auto& element : container)
    element.process();

// ACCEPTABLE: Need index, use .at()
for (size_t i = 0; i < container.size(); ++i)
    container.at (i).process();

// AVOID: Unchecked access
for (size_t i = 0; i < container.size(); ++i)
    container[i].process();  // UB risk if size changes
```

---

## AUTO KEYWORD

**Use `auto` when type is obvious from RHS:**
```cpp
auto x = 0.0f;                    // OK: clearly float
auto x = 0.0;                     // OK: clearly double
auto x = thisReturnsABool();      // OK: function name indicates type
auto someResult = getResult();    // OK: expression

// AVOID when ambiguous:
auto x = 0;                       // Bad: could be int, unsigned, int64, etc.

// Explicit when helpful:
for (int i = 0; i < someNumber; ++i)  // Clear: signed int
bool someCondition = false;           // Clear: bool
```

---

## STRUCTURED BINDINGS

Never access pair results via `.first` / `.second` at any level — including dereferenced
map iterators. Chain structured bindings all the way through.
All binding names must be descriptive. `_` and `it` are forbidden.

```cpp
// WRONG
validators.try_emplace (treeType).first->second.insert_or_assign (...);
auto [it, _] = validators.try_emplace (treeType);  // it and _ forbidden
it->second.insert_or_assign (...);

// CORRECT
auto [treeEntry, inserted] = validators.try_emplace (treeType);
auto& [treeKey, treeValidators] = *treeEntry;
treeValidators.insert_or_assign (propertyName, std::move (validator));
```

---

## CRITICAL RULES (MANDATORY)

- **Aggregate (brace) initialization is ALWAYS preferred** over copy assignment: `int x { 0 };` not `int x = 0;`
- **No bail-out guards.** Preconditions use an assert (STL, JUCE, or project-specific) — NEVER `if (not valid) return;`. Result returns (value determined at that point) are correct and preferred.
- **ALWAYS use nested positive checks:** `if (valid) { if (ready) { doWork(); } }` — NEVER `if (not valid) return;`
- **Use `.at()` for container access where the container provides it** — NEVER raw `[]` when a bounds-checked accessor exists. Fail Fast principle: invalid index throws immediately.
- **Use C++ alternative tokens:** `not`, `and`, `or` — NEVER `!`, `&&`, `||`
- **NO anonymous namespaces.** Use `static` linkage for translation-unit-local symbols.
- **NO `namespace detail` (or equivalent implementation-hiding namespaces).** Use class `private:`, separate `.cpp` with `static`, or PIMPL.
- **No underscores in any variable name** — including trailing-underscore constructor parameters.
- **Structured bindings for all pair/tuple results** — chain through dereferences, all names descriptive, `_` and `it` forbidden.

---

## DOXYGEN DISCIPLINE (MANDATORY)

### Zero-warning policy
Doxygen must produce zero warnings. Warnings are treated as build failures.

### Single source of truth
Document in the **header only**. Implementation files (.cpp/.mm) must NOT
have doxygen blocks for member functions — the header is the canonical doc.

### Every @param must match the signature
If a parameter is renamed, the @param MUST be updated in the same edit.
No stale parameter names. No undocumented parameters.

### No @file mismatches
`@file` must match the actual filename. No copy-paste leftovers.

### Escape markup in prose
HTML-like tokens in doxygen prose (`<path>`, `<uuid>`, `\x1b`) must be
escaped: `\<path\>`, `\\x1b`. Backtick fences inside `/** */` blocks
must use `@code` / `@endcode`, not triple backticks.

### No @copydoc to external targets
Do not use `@copydoc`, `@copybrief`, or `@copydetails` referencing
JUCE or other external library symbols — they are not in the doxygen
tag scope. Write inline docs instead.

---

## SUMMARY CHECKLIST

✓ DRY: Never repeat code
✓ Braces on new line
✓ Space around operators
✓ `*` and `&` stick to type
✓ `const` before type
✓ Use `override`, never with `virtual`
✓ Add `noexcept` where possible
✓ Explicit null checks with `nullptr`
✓ Avoid raw `new`/`delete`
✓ Use smart pointers
✓ Pre-increment in loops
✓ No `else` after `return`
✓ Narrow pointer scope with if-init
✓ Prefer `enum class` over plain `enum` when applicable
✓ `explicit` single-arg constructors
✓ Pass small types by value
✓ Use `std::` math functions
✓ Aggregate (brace) initialization always
✓ No bail-out guards — assert (project-appropriate) for preconditions, nested positive checks for conditional execution, result returns correct and preferred
✓ **Use `.at()` where the container provides it** — bounds-checked accessor always preferred over raw `[]`
✓ **ALWAYS use `not`, `and`, `or`** alternative tokens
✓ **NO anonymous namespaces** — use `static` linkage instead
✓ **NO `namespace detail`** — use class `private:`, static file-local symbols, or PIMPL
✓ **Doxygen:** zero warnings, header-only docs, @param matches signature, escaped markup, no @copydoc to external targets
✓ **No underscores in variable names** — including constructor parameter names in member initializer lists
✓ **Structured bindings for pair/tuple results** — chain through dereferences, all names descriptive, `_` and `it` forbidden

---

**Note:** These standards prioritize readability and safety. When in doubt, prefer explicitness over brevity.
