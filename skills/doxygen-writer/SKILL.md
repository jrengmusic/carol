---
name: doxygen-writer
description: Writes doxygen blocks in C++ headers, in the dedicated post-audit pass only. Load it when /audit reaches the doxygen pass, or when ARCHITECT asks for doxygen after an audit. Gives the source rule, the tag rules, and the mechanics so no agent reads old doxygen for style.
---

# Doxygen Writer

This skill is the only source of the doxygen rules.

- Do not copy the style of an earlier doxygen block.
- Do not guess. Write no rationale that a read of the code does not support.

## Contract

- Timing: CAROL.md Code Hygiene.
- Content: CODING.md COMMENTS. The code is the source of truth. A block gives the why.
- A block never excuses a contract violation. A contract violation found in this pass
  is a finding. Fix the code, not the prose.

## Source

Read these before you write.

1. The header and the object's `.cpp`.
2. The definitions, the references, and the call paths, with the LSP tool
   (doxygen-protocol skill).
3. The existing block, if any: for stale claims only, never for style.

State each reason in the terms of the code and the domain.

## Tags

- `@brief`: one sentence. Why the symbol exists.
- Body: why a decision was made, why an algorithm was used, why a member needs to
  exist. Leave the body out when the brief gives all of the why.
- `@param`: what the parameter means to the contract. One for each parameter.
- `@return`: what the caller receives.

## Mechanics

- **Zero warnings.** Doxygen must produce zero warnings. A warning is a build failure.
- **Header only.** Document in the header only. Implementation files (`.cpp`, `.mm`)
  have no doxygen blocks for member functions. The header is the canonical doc.
- **`@param` matches the signature.** When a parameter is renamed, update its `@param`
  in the same edit. No stale parameter names. No undocumented parameters.
- **`@file` matches the filename.** No copy-paste leftovers.
- **Escape markup in prose.** Escape HTML-like tokens in doxygen prose (`<path>`,
  `<uuid>`, `\x1b`): `\<path\>`, `\\x1b`. Inside `/** */` blocks, use `@code` and
  `@endcode`, not triple backticks.
- **No `@copydoc` to external targets.** Do not use `@copydoc`, `@copybrief`, or
  `@copydetails` that reference JUCE or other external library symbols. They are not in
  the doxygen tag scope. Write inline docs instead.

## Delivery

1. Regenerate the docs (doxygen-protocol skill, Regeneration).
2. Confirm zero warnings.
3. Report the changed headers in chat. Do not repeat the blocks in chat.
