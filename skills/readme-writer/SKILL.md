---
name: readme-writer
description: Writes README.md at the project root - states what the repo actually is, in ARCHITECT's manifesto voice. Load it whenever ARCHITECT asks any primary for a README, or asks to refresh one. Gives the source rule, the fixed structure, and the voice rule so no agent reads an old README for style.
---

# README Writer

This skill is the only source of the README format.

- Do not copy the style of an earlier README.
- Do not guess.
- Write no claim that a read or a run does not support.

The reference for voice and structure is the `end` README (`~/Documents/Poems/dev/end/README.md`). This skill states the rules that README follows. Read the reference for tone only after you read this skill.

## What the README is

- It states what the repo is, for a reader who has seen nothing else.
- It is not the SPEC, the ARCHITECTURE, the changelog, or the sprint log. It links to the SPEC and the ARCHITECTURE.
- It is ARCHITECT's public voice for the project. It is not a neutral manual.

## Voice

- The README speaks in ARCHITECT's first person and opinion. The manifesto voice is the style.
- Opinion belongs to the `Why` and `Architecture` sections only. Every other section states facts.
- An agent does not invent an opinion. The words of `Why` and `Architecture` come from ARCHITECT's words in the session, or from SPEC.md and ARCHITECTURE.md. If neither supplies them, ask ARCHITECT before you write the section.
- A claim of speed, size, or comparison needs a measurement or a citation from the repo. Without one, leave the claim out.

## Source

Read these before you write. The README states only what they support.

1. `project-info.md`, `CMakeLists.txt`, and the build scripts: name, requirements, build commands.
2. `Source/`, and the module headers: the features that exist.
3. SPEC.md and ARCHITECTURE.md: the design and the stated intent.
4. The existing `README.md`, if any: for what it already told the reader, never for style.
5. A command you quote runs, or you cite the script that holds it.

## Structure

Write the sections in this order. A section with no content is left out, except `Why` and `How`.

1. `# NAME`, then the bold expansion of the name, then one paragraph that says what the repo is.
2. `## Why`: the problem, and what exists today. Manifesto voice.
3. `## Architecture`: the design stance that sets the project apart. Manifesto voice. Link to ARCHITECTURE.md.
4. `## What`: the facts. One `###` subsection for each feature area. Each subsection states what the project does, with named platforms, formats, and tools.
5. `## How`:
   - `**Requirements:**` line: compiler, build tools, frameworks.
   - The build commands in a fenced `bash` block.
   - Where the config lives, and what happens on first launch.
   - Platform notes taken from the build scripts.
6. A status table (`Feature | Status`) only when a feature is in progress or known open.
7. `## License`: the license named in the repo `LICENSE` file.
8. Footer, in this order:
   - `*conceived with [CAROL](https://github.com/jrengmusic/carol)*`
   - `Rock 'n Roll!`
   - `**JRENG!**`

A `---` line separates the major sections.

## Excluded

- Sprint numbers, debt IDs, and agent names.
- File, class, and function names in the `Why`, `Architecture`, and `What` sections. A file name is allowed in `How` when the reader must open it.
- Badges and marketing words that the repo cannot support.
- A copy of SPEC.md or ARCHITECTURE.md text.

## Delivery

- Write `README.md` at the project root with the Write tool. ARCHITECT commits.
- Report the path in chat. List each section that waits for ARCHITECT's words. Do not repeat the README in chat.
