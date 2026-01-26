# ARCHITECTURAL MANIFESTO
## The North Star for Technical Design & Problem Solving

**Document Purpose:** Core architectural principles aligned with LIFESTAR and LOVE

---

## Core Mantra

**NEVER OVERDO IT**

This manifesto serves as the single source of truth for architectural decisions, code design, and problem-solving approaches. It is a contract between humans and LLMs, ensuring consistency, clarity, and quality across all technical work.

---

## Supreme Principle: CODE READABILITY

**Code is read far more often than it is written.**

All code must follow the **Infinites Coding Standards** (see attached document). Readability is not negotiable—it is the foundation upon which all other principles rest. Code that cannot be easily understood cannot be maintained, debugged, or evolved.

**Readability means:**
- Consistent formatting and style
- Clear, descriptive naming
- Explicit intentions over implicit behavior
- Self-documenting code structure
- Minimal cognitive load for the reader

**All code generation must adhere to Infinites Coding Standards before considering any other architectural principle.**

This aligns with **LIFESTAR's "Reviewable"** principle—code must be easy to review, understand, and validate.

---

## LIFESTAR: Documentation Excellence

Our architectural foundation follows **LIFESTAR** principles for documentation and code excellence:

```
L - Lean
I - Immutable
F - Findable
E - Explicit

S - Single Source of Truth
T - Testable
A - Accessible
R - Reviewable
```

### L: Lean (Keep It Simple Stupid)
**Favor simple, obvious solutions over clever ones.**

Each component should have a clear, focused responsibility. Complexity should only be introduced when it solves a real, measured problem—not a hypothetical future one.

**When to apply:**
- Choose the simplest approach that solves the problem completely
- Avoid premature optimization or over-engineering
- Break complex problems into smaller, independent pieces
- Prefer composition over inheritance
- Delegate specialized tasks to focused modules rather than creating monolithic solutions
- If you can't explain it simply, it's probably too complex

**Implementation Checklist:**
- [ ] Is this the simplest solution that could work?
- [ ] Can this be broken into smaller, focused components?
- [ ] Am I solving a problem that doesn't exist yet?
- [ ] Would someone unfamiliar with the code understand it quickly?

---

### I: Immutable (Predictable Behavior)
**The same input with the same settings must always yield the same output.**

Eliminate hidden randomness and non-deterministic behavior. Systems must be deterministic and reproducible. When behavior changes based on context, that context must be explicit and documented.

**When to apply:**
- Ensure deterministic behavior for identical inputs
- Prefer immutable data structures where possible
- If randomness is needed, make it controllable (e.g., seed parameter)
- Document all edge cases and special behaviors
- Avoid silent fallbacks or automatic overrides
- Make non-deterministic operations explicit and opt-in
- Test that repeated operations produce identical results

**Examples:**
- Sorting: always use stable sort with explicit comparators
- Random generation: accept seed parameter for reproducibility
- Caching: document cache invalidation rules clearly
- Async operations: document ordering guarantees or lack thereof
- Default values: explicitly stated, never implicit

**Implementation Checklist:**
- [ ] Will the same input always produce the same output?
- [ ] Are random operations seeded or explicitly random?
- [ ] Are edge cases documented?
- [ ] Are there silent fallbacks that should be explicit?
- [ ] Is internal state managed predictably?

---

### F: Findable (Discoverable & Visible)
**Information must be easy to locate and system behavior must be observable.**

This principle has two aspects:
1. **Code/Documentation Findability**: Easy to navigate and locate functionality
2. **Runtime Visibility**: Users can see what the system is doing

**When to apply:**

**For Code Findability:**
- Organize files logically with clear naming conventions
- Provide comprehensive documentation with navigation
- Use consistent patterns that are easy to search
- Create clear module boundaries

**For Runtime Visibility:**
- Log significant operations with before/after states
- Surface computed metrics, applied transformations, or internal decisions
- Provide progress indicators for long-running operations
- Make internal state inspectable through debugging tools or APIs
- Document what's happening at each step of complex processes
- Expose system behavior through logs, metrics, UI indicators, or debug modes

**Examples:**
- Log file sizes before/after compression
- Display applied styles (rowHeight, inset, padding) in UI
- Show query execution plans in database operations
- Expose API response times and payload sizes
- Provide trace IDs for distributed operations
- Clear file structure: `Source/ProcessorChain.cpp` (findable)

**Implementation Checklist:**
- [ ] Can users see what the system is doing in real-time?
- [ ] Are important operations logged with meaningful context?
- [ ] Can internal state be inspected when needed?
- [ ] Are there debug modes or verbose options available?
- [ ] Is this code easy to locate in the codebase?

---

### E: Explicit (Dependencies Visible)
**Allow necessary access, but keep ownership and dependencies explicit.**

Dependencies must be visible and traceable. Hidden global state makes systems unpredictable and untestable. Make the flow of data and control explicit through the code structure.

**When to apply:**
- Pass context explicitly through function parameters or dependency injection
- Document ownership and lifecycle of shared resources
- Make dependencies visible in function signatures
- Use context objects or providers that can be traced through the call stack
- Avoid implicit global state that makes behavior unpredictable
- Every function signature should reveal what it needs to operate

**Examples:**
```cpp
// WRONG: Hidden dependency
class Processor 
{
    void process()
    {
        auto& config = GlobalConfig::get();  // Hidden!
    }
};

// âœ… CORRECT: Explicit dependency
class Processor 
{
    void process(const Config& config)
    {  // Visible!
        // Use config
    }
};
```

**Implementation Checklist:**
- [ ] Are all dependencies explicit in the function/class signature?
- [ ] Can I trace where this data comes from?
- [ ] Is ownership and lifecycle clear?
- [ ] Can this be tested in isolation?

---

### S: Single Source of Truth
**One source of truth: declare once, reference everywhere.**

DRY: Don't Repeat Yourself. Every concept, piece of logic, or data structure must be defined in exactly one place. All other parts of the system reference that single definition. Duplication is not just inefficient—it creates maintenance burden and introduces opportunities for inconsistency.

**When to apply:**
- Check if functionality already exists before creating new implementations
- Extract repeated patterns into reusable functions, classes, or modules
- Use constants, configuration files, or schema definitions instead of hardcoding values
- Reference existing implementations rather than duplicating logic
- If the same code appears more than twice, it must be abstracted

**Examples:**
```
PluginMetadata.xml     → Single source for parameters
InterfaceLayout.svg    → Single source for UI layout
CustomStyleSheet.xml   → Single source for styling
```

**Implementation Checklist:**
- [ ] Is this concept/logic/data already defined elsewhere?
- [ ] Can this be extracted into a reusable component?
- [ ] Are there hardcoded values that should be constants or configuration?
- [ ] Can multiple implementations be unified under a single abstraction?

---

### T: Testable
**Pure functions, dependency injection, verify determinism.**

Systems must be designed for testability from the ground up. This means isolatable components, predictable behavior, and the ability to verify correctness through automated tests.

**When to apply:**
- Write pure functions without side effects when possible
- Use dependency injection to enable test doubles
- Design for deterministic behavior (same input → same output)
- Create clear interfaces between components
- Avoid hidden state that makes testing difficult
- Document edge cases and test them explicitly

**Examples:**
```cpp
// âœ… Testable: Pure function
template<typename SampleType>
void process(SampleType& sample)
{
    if (!isBypassed)
    {
        sample *= gain;
        shaper.process(sample);
    }
}

// âœ… Test determinism
TEST_CASE("Filter deterministic")
{
    filter1.setSampleRate(48000.0);
    filter2.setSampleRate(48000.0);

    for (auto& s : samples1) filter1.process(s);
    for (auto& s : samples2) filter2.process(s);

    REQUIRE(samples1[i] == samples2[i]);  // Bit-identical
}
```

**Implementation Checklist:**
- [ ] Can this be tested in isolation?
- [ ] Are dependencies injectable?
- [ ] Are edge cases covered?
- [ ] Is determinism verified?
- [ ] Are real-time constraints testable?

---

### A: Accessible (Controllable)
**Users must be able to adjust trade-offs instead of being locked into hidden defaults.**

Never make decisions the user should control. Every meaningful parameter that affects behavior, quality, or performance must be exposed. Users should be empowered to make informed decisions about trade-offs.

**When to apply:**
- Expose configuration for quality vs. performance trade-offs
- Provide sliders, toggles, or parameters for tunable behavior
- Allow users to override defaults without modifying code
- Document the impact of different configuration choices
- Provide sensible defaults, but never hide the controls
- Make implicit assumptions explicit through configuration
- Ensure code is approachable for developers of varying skill levels

**Examples:**
- Image compression: quality slider (0-100)
- Caching: TTL and size limit controls
- API requests: timeout and retry configuration
- Rendering: quality vs. speed presets
- Search: precision vs. recall tuning
- XML-based parameters: accessible to non-C++ developers

**Implementation Checklist:**
- [ ] Are critical parameters exposed and configurable?
- [ ] Can users override defaults without code changes?
- [ ] Are trade-offs and their impacts documented?
- [ ] Do sensible defaults exist for quick starts?
- [ ] Can junior developers understand and modify this?

---

### R: Reviewable
**Code must be clear, consistent, easy to read, understand and review.**

This is our **Supreme Principle** restated. Code that cannot be easily reviewed cannot be trusted, maintained, or evolved safely.

**When to apply (always):**
- Follow Infinites Coding Standards consistently
- Write self-documenting code with clear naming
- Add comments only when "why" is not obvious from code
- Structure code for linear reading (top-down)
- Use meaningful variable and function names
- Keep functions focused and short
- Make code review checklist part of process

**Implementation Checklist:**
- [ ] Does this follow Infinites Coding Standards?
- [ ] Can a reviewer understand intent without explanation?
- [ ] Are complex sections commented with "why"?
- [ ] Would this pass code review on first submission?

---

## LOVE: Developer Experience Excellence

Beyond technical excellence, we follow **LOVE** principles for user-centered design:

```
L - Listens
O - Optimizes
V - Validates
E - Empathizes
```

### L: Listens (User Needs Drive Design)
**Understand user needs and fail fast when assumptions are violated.**

Design decisions must be driven by actual user needs, not hypothetical requirements. When user input is invalid or context is missing, the system must immediately surface the problem.

**When to apply:**
- Gather user feedback before major architectural decisions
- Add assertions and validations at entry points
- Check preconditions before performing operations
- Use type systems and schemas to catch errors at compile/load time
- Throw clear, actionable errors rather than allowing corrupt state
- Validate input data as early as possible in the pipeline
- Make invalid states unrepresentable through type design

**Examples:**
```cpp
// âœ… Fail Fast: Validate immediately
void setSampleRate(double rate)
{
    jassert(rate > 0.0);  // Catch error immediately
    if (rate <= 0.0)
    {
        DBG("Invalid sample rate: " << rate);
        return;
    }
    sampleRate = rate;
}
```

**Implementation Checklist:**
- [ ] Are user needs documented and validated?
- [ ] Are preconditions validated before operation?
- [ ] Do error messages clearly indicate what went wrong?
- [ ] Can invalid states be prevented by design?
- [ ] Are edge cases handled explicitly?

---

### O: Optimizes (Performance Matters)
**Profile first, optimize hot paths only.**

Performance optimization must be data-driven. Never optimize without profiling. Focus optimization efforts on measured bottlenecks, not perceived slow points.

**When to apply:**
- Document requirements explicitly ("512 samples <1ms @ 48kHz")
- Profile before optimizing (Instruments, VTune, Tracy)
- Optimize hot paths only (80/20 rule)
- Isolate and document optimizations
- Verify improvements with measurements
- Make optimizations configurable when they affect behavior

**Examples:**
```cpp
// âœ… Template Processing: User chooses precision vs speed
template<typename SampleType>
void process(juce::dsp::AudioBlock<SampleType>& block);

// âœ… Glitch-Free Parameters: Optimized smoothing
juce::SmoothedValue<double> hiFrequency;
Smooth::setValue(smoother.hiFrequency, setHiFrequency);
```

**Implementation Checklist:**
- [ ] Requirements documented?
- [ ] Profiled bottlenecks?
- [ ] Optimized code isolated?
- [ ] Trade-offs documented?
- [ ] Verified improvement?
- [ ] Tests still pass?

---

### V: Validates (Correctness First)
**Assert assumptions, validate inputs, ensure correctness.**

Correctness is non-negotiable. Every assumption must be validated, every input must be checked, every invariant must be enforced.

**When to apply (always):**
- Validate all user inputs at system boundaries
- Assert internal invariants with `jassert()`
- Use type systems to prevent invalid states
- Write tests that verify correctness properties
- Document assumptions and validate them

**Examples:**
```cpp
// âœ… Validate at boundary
void parameterChanged(const juce::String& id, double val)
{
    jassert(!id.isEmpty());  // Internal invariant
    if (!ku::Map::contains(parameters, id))
    {
        DBG("Unknown parameter: " << id);
        return;  // Fail gracefully
    }
    parameters.get(id, val);
}
```

**Implementation Checklist:**
- [ ] Are all inputs validated?
- [ ] Are assertions in place for invariants?
- [ ] Are edge cases tested?
- [ ] Is error handling comprehensive?

---

### E: Empathizes (User-Centered Design)
**Design for human users—both end users and fellow developers.**

Every design decision must consider the human who will use or maintain the system. This means clear visibility, full control, and predictable behavior.

**When to apply (always):**
- Make system behavior visible (logs, UI, debugging)
- Expose controls for meaningful parameters
- Ensure predictable, deterministic behavior
- Write error messages that help users solve problems
- Document decisions and trade-offs
- Consider onboarding experience for new developers

**Examples:**
- Visibility: "Input: -12dB, Output: -8dB, GR: 4dB"
- Controllability: Quality slider (0-100) instead of hidden algorithm
- Predictability: Same preset always sounds identical
- Developer empathy: XML parameters accessible to non-C++ developers

**Implementation Checklist:**
- [ ] Can users see what's happening?
- [ ] Can users control behavior?
- [ ] Is behavior predictable?
- [ ] Are error messages helpful?
- [ ] Is documentation clear?

---

## Audio-Specific Extensions

For real-time audio software, we extend LIFESTAR and LOVE with four additional principles:

**8. Real-Time Performance** (extends LOVE: Optimizes)
- Hard real-time deadlines (<1ms per audio block)
- Profile-driven optimization
- Template-based processing for compile-time optimization

**9. Thread Safety** (extends LIFESTAR: Explicit)
- Explicit thread context documentation
- Lock-free atomics for simple shared state
- Minimal lock duration when locks necessary
- Never block audio thread

**10. Testability** (extends LIFESTAR: Testable)
- Deterministic audio processing (bit-identical output)
- Isolated DSP components
- Measurable, verifiable behavior

**11. Evolution** (extends LIFESTAR: Immutable)
- Versioned preset data with migration paths
- User data preservation over code purity
- Backward compatibility where possible

**For complete audio extension details:** See `Audio Extensions to Architectural Manifesto.md`

---

## Design Patterns & Anti-Patterns

### âœ… Encouraged Patterns

1. **Dependency Injection**: Pass dependencies explicitly (LIFESTAR: Explicit)
2. **Pure Functions**: Functions without side effects when possible (LIFESTAR: Testable, Immutable)
3. **Immutability**: Prefer immutable data structures (LIFESTAR: Immutable)
4. **Composition**: Build complex behavior from simple pieces (LIFESTAR: Lean)
5. **Interface Segregation**: Small, focused interfaces (LIFESTAR: Lean, Accessible)
6. **Configuration Objects**: Group related parameters (LIFESTAR: Single Source of Truth)
7. **Builder Pattern**: For complex object construction (LIFESTAR: Explicit)
8. **Strategy Pattern**: For swappable algorithms (LIFESTAR: Accessible)
9. **Factory Pattern**: For object creation with dependencies (LIFESTAR: Explicit)

### Discouraged Anti-Patterns

1. **God Objects**: Classes that do too much (violates LIFESTAR: Lean)
2. **Hidden State**: Globals without explicit context (violates LIFESTAR: Explicit)
3. **Magic Numbers**: Hardcoded values without names (violates LIFESTAR: Single Source of Truth)
4. **Tight Coupling**: Components that can't exist independently (violates LIFESTAR: Testable)
5. **Layer Violations**: Components "poking" into other layers (violates LIFESTAR: Explicit)
6. **Premature Optimization**: Complexity without measured need (violates LOVE: Optimizes)
7. **Silent Failures**: Errors that don't fail fast (violates LOVE: Validates)
8. **Implicit Behavior**: Side effects or defaults that aren't obvious (violates LIFESTAR: Explicit)
9. **Copy-Paste Programming**: Duplicated code instead of abstraction (violates LIFESTAR: Single Source of Truth)

#### Anti-Pattern #4: Tight Coupling (Expanded)

**The Problem:** Components that can't exist independently create maintenance nightmares and prevent reuse.

**Symptoms:**
- Component A cannot be tested without Component B
- Changing Component A forces changes in Component B
- Components directly reference each other's internals
- Circular dependencies between modules

**Violates:** LIFESTAR: Testable, Explicit

**Example - âŒ WRONG:**
```cpp
class DataProcessor 
{
    // Direct dependency on UI
    void process()
    {
        calculateResult();
        ui->updateDisplay(result);  // Tight coupling!
    }
    UserInterface* ui;  // âŒ Knows about UI layer
};
```

**Example - âœ… CORRECT:**
```cpp
class DataProcessor 
{
    // Indirect communication via callback
    void process()
    {
        calculateResult();
        if (onResultReady)
            onResultReady(result);  // Loose coupling!
    }
    std::function<void(Result)> onResultReady;  // âœ… Dependency injection
};
```

#### Anti-Pattern #5: Layer Violations ("Poking")

**The Principle:** *"Each layer must stay dumb. No poking each other. Use only provided thread-safe APIs."*

**The Problem:** Layers directly accessing each other create hidden dependencies, violate thread boundaries, and make code untestable.

**Violates:** LIFESTAR: Explicit, Testable + Audio Extension: Thread Safety

**Common Violations:**
- Business logic accessing UI components directly
- UI components directly modifying data models without going through API
- Lower layers calling into higher layers
- Bypassing established communication channels

**Example - âŒ WRONG (Audio Plugin):**
```cpp
// Processor layer poking into Editor layer
class AudioProcessor 
{
    void processBlock(AudioBuffer& buffer)
    {
        // âŒ LAYER VIOLATION: Audio thread â†' UI component
        if (auto* editor = getActiveEditor())
            editor->updateVisualizer(data);  // Crosses thread boundary!
    }
};

// Chain layer knowing about specific UI components
class ProcessorChain 
{
    DynamicVisualizer* visualizer;  // âŒ LAYER VIOLATION: DSP knows UI
    
    void process() {
        // âŒ Directly calling UI from DSP layer
        if (visualizer)
            visualizer->update(levels);
    }
};
```

**Example - âœ… CORRECT (Proper Layer Separation):**
```cpp
// Processor provides API, doesn't know about Editor
class AudioProcessor 
{
    void processBlock(AudioBuffer& buffer) 
    {
        chain.process(buffer);  // âœ… Stays in own layer
        // Editor pulls data via getters (NOT pushed from here!)
    }
    
    // Explicit API for access
    ProcessorChain& getProcessorChain()
    {
        return chain;
    }
};

// Chain exposes data, doesn't push to UI
class ProcessorChain 
{
public:
    // âœ… Provides thread-safe API for UI to pull data
    Function::Map<String, void> getters;
    
    void process()
    {
        // âœ… Stores data in thread-safe atomics
        currentLevel.store(level, memory_order_relaxed);
        // UI pulls via getters.get() on UI thread
    }
    
private:
    std::atomic<double> currentLevel;  // âœ… Thread-safe storage
};

// Editor pulls data, doesn't get pushed to
class Editor : private Timer 
{
    void timerCallback()  // UI THREAD
    {
        // PULL model: UI requests data via API
        dataMap->get("LEVELS", levelsBuffer);
        repaint();
    }
    
    Function::Map<String, void>* dataMap;  // âœ… Pointer to API
};
```

**The Rules:**
1. **Each layer exposes an API** (public methods, getters map, callbacks)
2. **Communication flows through the API** (not direct access)
3. **Lower layers don't know about higher layers** (Processor → Chain → DSP, NOT reverse)
4. **Data flows via explicit channels** (Function::Map, callbacks, atomics)
5. **Thread boundaries are respected** (UI pulls on UI thread, audio writes on audio thread)

**Red Flags:**
- 🚨 `#include "HigherLayer.h"` in lower layer
- 🚨 Direct method calls bypassing established API
- 🚨 `dynamic_cast` to access specific component types
- 🚨 Circular `#include` dependencies
- 🚨 Cross-thread direct calls

---

## Decision Framework

When helping user making architectural decisions, follow this framework aligned with LIFESTAR and LOVE:

### 1. Understand the Problem (LOVE: Listens)
- What is the actual requirement?
- What are the constraints?
- What are the edge cases?

### 2. Consider Simplicity First (LIFESTAR: Lean)
- What's the simplest solution that works?
- Can this be solved with existing tools/patterns?
- Am I adding unnecessary complexity?

### 3. Evaluate Trade-offs (LOVE: Optimizes, Empathizes)
- Performance vs. Maintainability
- Flexibility vs. Simplicity
- Generality vs. Specificity
- What does the user need to control?

### 4. Design for Visibility (LIFESTAR: Findable)
- How will users know what's happening?
- What should be logged or surfaced?
- Can behavior be inspected and debugged?

### 5. Ensure Predictability (LIFESTAR: Immutable)
- Is the behavior deterministic?
- Are edge cases handled?
- Is the API intuitive and consistent?

### 6. Make It Explicit (LIFESTAR: Explicit)
- Are dependencies visible?
- Is ownership clear?
- Are assumptions documented?

### 7. Validate Correctness (LOVE: Validates)
- Can this be tested?
- Are invariants enforced?
- Does it fail fast on errors?

### 8. Document Decisions (LIFESTAR: Reviewable, Findable)
- Why was this approach chosen?
- What trade-offs were made?
- What are the limitations?

---

## Metrics for Quality

A well-designed system following LIFESTAR and LOVE should exhibit:

- **Low Coupling**: Components can be changed independently (LIFESTAR: Testable, Explicit)
- **High Cohesion**: Related functionality is grouped together (LIFESTAR: Lean)
- **Clear Contracts**: Interfaces are explicit and well-documented (LIFESTAR: Explicit, Reviewable)
- **Easy Testing**: Components can be tested in isolation (LIFESTAR: Testable)
- **Debuggability**: Problems can be traced to their source (LIFESTAR: Findable)
- **Discoverability**: Users can find and understand controls (LIFESTAR: Findable, Accessible)
- **Consistency**: Similar problems are solved in similar ways (LIFESTAR: Single Source of Truth)
- **Performance**: Meets documented requirements (LOVE: Optimizes)
- **Reliability**: Validates inputs and fails gracefully (LOVE: Validates)
- **Usability**: Empathizes with user needs (LOVE: Empathizes)

---

## Summary: The Integrated Model

```
LIFESTAR (Documentation & Code Excellence)
    +
LOVE (Developer Experience Excellence)
    =
Complete Technical North Star
```

### LIFESTAR Principles
1. **Lean** - Keep it simple
2. **Immutable** - Predictable behavior
3. **Findable** - Discoverable & visible
4. **Explicit** - Dependencies visible
5. **Single Source of Truth** - No duplication
6. **Testable** - Verifiable correctness
7. **Accessible** - User control, developer approachability
8. **Reviewable** - Clear and consistent (Supreme Principle)

### LOVE Principles
1. **Listens** - User needs & fail fast
2. **Optimizes** - Data-driven performance
3. **Validates** - Correctness enforced
4. **Empathizes** - Human-centered design

### Audio Extensions
1. **Real-Time Performance** (Principle 8)
2. **Thread Safety** (Principle 9)
3. **Testability** (Principle 10)
4. **Evolution** (Principle 11)

This manifesto is not a rigid rule book, but a north star. When in doubt, return to LIFESTAR and LOVE and ask: "Does this solution empower users and future maintainers, or does it hide complexity and create confusion?"

**JRENG!**

---

*This document is the contract. All code, designs, and solutions must be evaluated against these principles on code form and structure.*

---

*Version 2.0  - November 24, 2025*
