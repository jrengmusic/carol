# ARCHITECTURAL MANIFESTO
## BLESSED — The Contract

**For:** ARCHITECT and CAROL agents.
**Version:** 0.1 — August 2026

---

## Core Mantra

**NEVER OVERDO IT.**

This document is the single source of truth for architectural decisions, code design, and problem-solving. It is a contract — not a guideline. All code is evaluated against it.

**Language-specific compliance:** See `LANGUAGE.md` for per-language overrides and framework adaptations. LANGUAGE.md adapts how principles are enforced — it does not override what they mean.

---

## BLESSED

```
B — Bound
L — Lean
E — Explicit
S — Single Source of Truth
S — Stateless
E — Encapsulation
D — Deterministic
```

---

## B — Bound

**Clear ownership. Deterministic lifecycle. RAII enforced. Nothing floats free.**

Every resource, object, and dependency has exactly one owner. Lifetime is scoped and unambiguous. Acquisition is initialization, release is destruction. No raw owning pointers. No manual cleanup. No ambiguous destruction order.

If you need a `SafePointer` or a lifetime guard, ownership was wrong to begin with. Fix the ownership — the guard disappears.

**Contracts:**
- Every object has one clear owner
- Lifecycle is traceable from construction to destruction
- Threads are bound to their context — audio thread owns audio, UI thread owns UI, never crossed
- No object outlives its owner
- No resource exists without an owner

**Violation signature:** *"I'm not sure what outlives what here."* — that is a B violation. Clarify ownership, RAII handles the rest.

**The Guard Rule:** Every defensive guard must name its specific threat. If you cannot answer *"what specific scenario does this defend against?"* — the guard is garbage. Remove it and fix the ownership instead.

---

## L — Lean

**300/30/3. Quantity enforced. God objects forbidden.**

These are smell detectors, not arbitrary limits. Crossing them means stop and ask why. The answer is almost always wrong decomposition.

- **300 lines per file** — file is too large, too many responsibilities. Split the object. Inline documentation (doxygen, godoc, etc.) is excluded from the count.
- **30 lines per function** — function is doing more than one thing. Split the function.
  A split is compliance only when it separates responsibility — the extracted piece is
  independently meaningful, reusable, or testable. A helper carved out solely to move
  lines below the limit, called from exactly one site, with no responsibility boundary,
  is not decomposition — it is relocation, and does not satisfy L.
- **3 branches max** — more than 3 `if/else` or `switch` cases means you are encoding a decision table in imperative code. Replace with direct lookup.

The 3-branch rule is the sharpest. A lookup is clearer in intent, O(1), and adding a case becomes data — not a code change. This directly enforces **S** (SSOT).

Lean is about **quantity**. Balanced decomposition — distributing responsibilities correctly — is how you achieve Lean. Descriptor holds data. Manager holds logic. View holds composition. You decompose to keep each piece within bounds.

**File-size is a smell detector, not a portability constraint.** Splitting a file only to reduce a line count — with no reduction in responsibility — is wrong decomposition, not compliance. If a class has one responsibility and decomposing it would only relocate the same lines across more files, the split does not serve Lean; it defeats it. Some classes are legitimately large as a single unit when kept that way for portability or to avoid unnecessary compile-dependency surface — see LANGUAGE.md for per-language specifics.

**YAGNI — You Ain't Gonna Need It.** Do not build for a future that has not arrived. Speculative abstractions, "just in case" parameters, and future-proofing layers all add lines, branches, and complexity before they deliver any value. The cost is immediate; the benefit is hypothetical. When the need arrives, it rarely matches what was predicted — the speculative code becomes dead weight or, worse, a design constraint that fights the real requirement.

YAGNI is Lean's temporal dimension: 300/30/3 bounds what exists now. YAGNI bounds what gets created at all.

**Violation signature:** Anything a reasonable reader would call a god object. Any function that needs a scroll to read. Any chain of conditions that needs a mental truth table. An abstraction with one concrete implementation. A parameter nobody passes yet. Code defended with "we might need this later."

---

## E — Explicit

**No magic. Semantic names. Clarity over brevity. Fail fast. All parameters visible.**

Code is read far more than it is written. Every name, every parameter, every condition must declare its intent without requiring the reader to infer it.

**Contracts:**
- No magic values — every constant is named, intent lives in the name
- Semantic names — `gainReductionDb` not `gr`, `isProcessingActive` not `flag`
- Clarity over brevity — never sacrifice readability for a shorter name
- All parameters visible in the function signature — nothing pulled from implicit context, no hidden globals, explicit capture lists in lambdas (`[this, value]` not `[&]`)
- No bail-out guards — positive nesting, happy path visible top to bottom. Result returns are not bail-outs: returning the moment the answer is determined is the happy path completing.
- Prefer assert over silent fail — invalid state is loud, never swallowed
- Fail fast, debug early — catch violations at the entry point, never let corrupt state propagate

**On bail-out guards:** Apply this test at every return point: *does this return carry the value the function was called to produce?* Yes → result return, permitted and preferred. No → bail-out, forbidden.

**Bail-out (forbidden):** returns before doing work — the function had a job and the guard skipped it. Use positive nesting; the guard disappears into a condition.

**Result return (permitted):** returns the moment the answer is determined — the function's job is complete at that point. Forcing these into a sentinel accumulator to reach a single exit adds state and hides intent.

```cpp
// WRONG — hides conditions, silent exits
void process (const Sample& input)
{
    if (! input.isValid()) return;
    if (! isInitialized()) return;
    if (isBypassed()) return;
    doWork (input);
}

// CORRECT — bail-out guards replaced by positive nesting
void process (const Sample& input)
{
    jassert (input.isValid());

    if (input.isValid())
    {
        if (isInitialized())
        {
            if (! isBypassed())
                doWork (input);
        }
    }
}
```

```cpp
// Result returns — correct and preferred

// Loop: return the moment the answer is found
int findFirst (const Array<Item>& items, const Query& q)
{
    for (int i = 0; i < items.size(); ++i)
        if (items.at (i).matches (q)) return i;   // answer found — done

    return -1;
}

// Switch arm: each case delivers its own complete answer
String tokenName (TokenType t)
{
    switch (t)
    {
        case TokenType::keyword:    return "keyword";
        case TokenType::identifier: return "identifier";
        default:                    return "unknown";
    }
}

// Conditional branch: each branch returns its computed result
float applyScale (float x, float threshold, float high, float low)
{
    if (x > threshold) return x * high;   // result for this branch — done
    return x * low;
}
```

**Violation signature:** A name that requires context to understand. A function that exits somewhere you didn't expect. A value that appeared without being passed in. A failure that produced no signal.

---

## S — Single Source of Truth

**Declare once. Reference everywhere. DRY.**

Every concept, piece of logic, and data structure is defined in exactly one place. All other parts of the system reference that single definition. Duplication is not just inefficient — it creates divergence.

**The primary violation is shadow state** — the same truth existing in two places that can drift:

```cpp
bool isActive;       // mirrors what Model already knows
int currentIndex;    // duplicates what the container owns
float cachedGain;    // shadows the APVTS parameter
```

Shadow state feels helpful until the two copies disagree. It is almost always a symptom of not trusting the Model (**S2** violation) or ambiguous ownership (**B** violation).

**Contracts:**
- Check if functionality already exists before creating new implementations
- Extract repeated patterns into reusable functions, classes, or modules
- Use named constants, configuration, or schema — never hardcode values
- If the same logic appears more than twice, it must be abstracted
- A second copy of any truth is a bug waiting to happen

**Violation signature:** Two variables that represent the same thing. Logic duplicated across two files. A hardcoded value that appears more than once.

---

## S — Stateless

**Objects are dumb workers. Transient state only. Machinery holds nothing persistent.**

Objects execute what they are told. They do not hold opinions about the system, remember what they did last, or track their own history for the orchestrator's benefit.

**Contracts:**
- Transient state only — calculation buffers, intermediate values, anything that lives and dies within a single operation
- No machinery state — an object does not track its own history for the caller
- Almost never a getter — if the orchestrator needs to ask, the design is wrong
- Orchestrator tells, never tracks — Control says *"process this"*, not *"are you ready? what was your last state? ok now process"*
- State belongs exclusively to the Model. View and machinery are pure.

DSP processor parameters *look* like state but are not machinery state — they are **calculation inputs**, always a deterministic reflection of APVTS downward. APVTS is the one truth. Processor values are a synced working copy for performance.

**The violation pattern:**

```cpp
// WRONG — orchestrator tracking object state
if (processor.isReady() && ! processor.hasProcessed() && processor.inputValid())
    processor.process();

// CORRECT — object manages itself, orchestrator tells
processor.process (input);
```

The booleans are the smell. They mean the orchestrator is doing the object's thinking for it.

**Violation signature:** A boolean flag that tracks what a subordinate object is doing. A getter called by the orchestrator to make a decision. State that lives outside the Model.

---

## E — Encapsulation

**Clear single responsibility. No poking internals. Tell, don't ask. Unidirectional layer and data flow.**

Objects are ignorant by design. They know nothing about the world outside their one job. The orchestrator tells — it never inspects an object's state to make decisions on its behalf.

**The Four Rules:**

1. **One responsibility** — an object is either POD, pure functional, or both. It has one job and is ignorant of the system around it.
2. **Private by default** — expose only when there is a proven external caller. No getter without a proven need. Dead getters are dead code.
3. **Objects manage their own state** — callers do not track flags on behalf of objects. If the object knows whether it is initialized, the caller does not also track that.
4. **Tell, don't ask** — the caller says *"do this"*. The caller never says *"are you in state X? then I will do Y for you."*

**Layer topology is strictly unidirectional.** Lower layers never know about higher layers. No `#include "HigherLayer.h"` in a lower layer. No reverse dependencies. Communication flows through explicit APIs only.

**Data flow is strictly unidirectional.** The rule above applies at compile time. This rule applies at run time. Data moves one way through the topology. No object operates on the data during the movement. Dependency direction and data direction are the same law at two times.

### MVP — Model, View, Processor

The Model holds the state. The View composes. The Processor holds the business logic. This is the project-level architecture for deterministic applications with critical performance. The architecture applies to all application types. The chain below is one instance of the architecture. It is not the subject of the architecture.

**The Model is absolute.** There is one state machine at each scale. Almost no other object holds state.

**The orchestrator is a position. It is not a type.** The top layer of a subtree orchestrates that subtree. A layered View that controls its children holds this position. The position gives no state to the View. A View that orchestrates is still not a Model.

### Complete at Creation

A unit is complete when it comes into existence. A parse operation gives a complete AST. A view unit is complete when the owner builds it. Each consumer downstream receives complete data.

**Creation is not mutation.** Creation can be complex. Creation can use multiple passes, look-ahead, reverse steps, work buffers, and memory allocation. Creation does not change a complete object, because no complete object exists yet. The contract starts at the end of creation.

**A state update is not mutation.** A complete state replaces a complete state. Add and remove operations are state updates. The program builds and deletes view units as it runs. Each view unit is complete. Thus the creation and the deletion of a view unit are state updates.

**The law applies to data in transit.** Data is in transit between creation and use. These operations on data in transit are forbidden:

- **No copy** — read the data in its location
- **No allocation** — the data exists, so build nothing
- **No mutation** — do not change the data during the movement
- **No temporary container** — do not stage the data, because a stage makes shadow state (refer to **S — Single Source of Truth**)

These four rules are one rule: **do no operation on data in transit.** Each violation is a consumer that builds again what creation made.

**The diagnostic:** At each call site, ask this question. Is this operation a creation, a state update, or transit? Creation and state updates have no limit. The four rules apply to transit.

**The verdict:** If the data does not fit the implementation, the parse is wrong or the implementation is wrong. It is never both. It is never neither. To change the shape of the data in transit is the violation. It is not the correction.

**Transient state applies to creation.** **S — Stateless** permits transient state: *"Transient state only — calculation buffers, intermediate values, anything that lives and dies within a single operation"*. That permission applies to creation. The four rules apply to transit. The two scopes do not intersect. One scope does not relax the other.

### Materialisation of Concrete Objects

The Model contains value data. Value data is numbers, unions, `const char* const`, and strings. Value data holds a value and does no other operation. Value data can allocate memory one time, at creation. It does not allocate memory again.

**The Model must not contain a concrete object.** A concrete object is a type with a capability. Examples are `juce::Path`, `juce::Graphics`, `juce::Label`, and `juce::AttributedString`. These types draw, measure, or operate in the framework. The Model contains the string `"M 57 d 55 Z"`. The Model does not contain the `juce::Path`.

**Materialisation is the only permitted derivation.** The owner builds a concrete object from value data in the Model. The owner builds the concrete object only when it needs the capability. This operation is a creation, thus it can allocate memory. The owner builds the concrete object one time and the object is then complete. Do not build a concrete object in steps. Do not build it again. Do not change it. When the Model state updates, the owner replaces the full concrete object.

```cpp
// CORRECT — materialisation gives a capability that value data does not have
struct AttributeGraphics
{
    juce::Path path;
    juce::Rectangle<float> bounds;
};

// WRONG — fake carrier holds again what the Model holds
struct GlyphQuad
{
    float x, y, w, h;
};
```

**The test:** What operation can this type do that value data cannot do? If the answer is a capability, the type is a materialisation. Capabilities are draw, hit-test, transform, and measure. If the answer is *"it holds values together for transfer"*, the type is a fake carrier. Convenience is not a capability.

**The structural check:** If each field is already in the Model with the same type, the type materialises nothing. `"M 57 d 55 Z"` to `juce::Path` is a derivation. `x, y, w, h` to `x, y, w, h` is shadow state.

**A struct is a design decision. A struct is not a convenience.** Do not make a struct to move values between call sites. This always makes a fake carrier. A struct that only carries data is a failure.

**A materialisation is not a temporary container.** The four rules apply to data in transit. They do not prevent the owner from a materialisation of a capability. A concrete object that its owner builds one time is a unit. The unit is complete at creation. The owner replaces the unit at a state update. A struct that moves Model values between call sites is data in transit and is forbidden.

**Concrete instance — ProcessorChain (audio):**

```
PluginProcessor   →   owns ProcessorChain
ProcessorChain    →   owns DSP Processors, listens to parameterChanged, tells processors to calculate
DSP Processors    →   dumb, calculate on tell, store only calculation inputs
APVTS             →   the actual state machine — the Model
```

ProcessorChain listens to `parameterChanged`, tells each processor to recalculate, and replaces samples on `processBlock`. Each DSP processor is dumb — it stores parameter values as calculation inputs only, always synced top-down from APVTS. No processor ever asks ProcessorChain anything. No ProcessorChain ever asks PluginProcessor anything.

The same shape holds where nothing is audio: Model is whatever owns state, Processor whatever owns logic, View whatever composes.

**On established patterns — for agents and junior devs:**
If the architecture uses listeners, use listeners. If parameters flow through APVTS, do not invent a parallel channel. A manual boolean flag, a manual callback, or a helper invented where a listener pattern already exists is not a solution — it is a symptom of not reading the architecture. Find the established pattern. Extend it. A new pattern where one already exists is always wrong.

```cpp
// WRONG — invented state, parallel channel, orchestrator poking
class Component
{
    bool shuttingDown { false };

    ~Component()
    {
        shuttingDown = true;
        session.shutdown();
    }

    void resized()
    {
        if (! shuttingDown)
            if (session.isRunning())
                session.resize (cols, rows);
    }
};

// CORRECT — tell only, object manages itself
class Component
{
    ~Component() = default;

    void resized()
    {
        session.resized (cols, rows);
    }
};
```

**Violation signature:** A getter called by a caller to make a decision for the object. An object that knows about another object's domain. A layer that includes a header from a layer above it. A manual boolean where a listener already exists.

---

## D — Deterministic

**D is not a principle you implement. It is what you get when you follow BLESSE correctly.**

The same input must always yield the same output throughout the entire data flow and processing chain. If it does not — a principle above was violated. Find it.

Non-determinism is always a symptom, never a root cause.

**Pessimistic and defensive programming are the same violation from opposite sides.** Pessimistic programming re-verifies an invariant at every use site instead of trusting what the owner already established. Defensive programming answers that same doubt with more guards, more asserts, more branches — treating the symptom instead of removing the doubt. Neither is permitted. The only correct fix is establishing the invariant once, at the owner, and letting every downstream use trust it unconditionally — no re-check, no extra guard, no extra branch. An assert at that single ownership boundary is verification of the fix; an assert anywhere else, or more than one assert for the same invariant, is the violation re-appearing in a different disguise.

| Symptom | Likely violation |
|---|---|
| Hidden state producing different results | **S** (Stateless) |
| Shadow state that drifted | **S** (SSOT) |
| Something mutated outside its owner | **B** (Bound) |
| Implicit dependency not visible | **E** (Explicit) |
| Object doing more than its job | **E** (Encapsulation) |

**D is the debug protocol:**
1. Output is non-deterministic → start here
2. Trace the data flow
3. Find which of BLESSE was violated
4. Fix the principle violation — not the symptom

**D is the health metric of the architecture.** BLESSE is the law. D is the verdict.

Enforcement:
- Assert at boundaries catches violations early — use the project's assert macro
- Unit tests prove it formally — same input, bit-identical output
- Non-determinism in production means something floated free

---

## Anti-Patterns

| Anti-Pattern | Violation |
|---|---|
| God object | **L** |
| Manual boolean to track subordinate state | **S** (Stateless) + **E** (Encapsulation) |
| Shadow state / duplicate truth | **S** (SSOT) + **B** |
| Bail-out guard | **E** (Explicit) |
| Silent fail | **E** (Explicit) |
| Pessimistic/defensive programming — doubting an invariant the owner already established, whether by re-checking it or by guarding against it | **D** + **E** (Explicit) |
| Getter without proven caller | **E** (Encapsulation) |
| Caller tracking state the object already represents | **S** (Stateless) + **E** (Encapsulation) |
| Layer violation (`#include "HigherLayer.h"`) | **E** (Encapsulation) + **B** |
| Copy, allocation, mutation, or temporary container in transit | **E** (Encapsulation) + **S** (Stateless) |
| Consumer changes the data shape in place of a correction to the parse or the implementation | **E** (Encapsulation) + **D** |
| An object other than the Model holds state | **S** (Stateless) + **S** (SSOT) |
| A View that orchestrates holds state | **S** (Stateless) + **E** (Encapsulation) |
| Concrete object in the Model | **E** (Encapsulation) + **S** (SSOT) |
| Fake carrier struct — holds again what the Model holds | **S** (SSOT) + **S** (Stateless) |
| Defensive guard with no named threat | **B** |
| Magic value / unnamed constant | **E** (Explicit) + **S** (SSOT) |
| Hardcoded value appearing more than once | **S** (SSOT) |
| Inventing a new pattern where one exists | **E** (Encapsulation) |
| Raw owning pointer / manual cleanup | **B** |
| Cross-thread direct call | **B** |

---

*This document is the contract. All code, designs, and solutions must be evaluated against BLESSED.*

*Rock 'n Roll!*
**JRENG!**

---
*Version 0.1 — August 2026*
