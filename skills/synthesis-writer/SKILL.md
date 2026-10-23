---
name: synthesis-writer
description: Writes or refreshes the project CLAUDE.md - a thin orientation file for any folder, code or not. Load it whenever carol init synthesizes CLAUDE.md or ARCHITECT asks for a synthesis. Gives the mode rule, the source rule, and the fixed structure for each folder type so no agent copies another project's CLAUDE.md.
---

# Synthesis Writer

This skill is the only source of the project `CLAUDE.md` format.

- Do not copy the style of the `CLAUDE.md` of another project.
- Do not guess.
- Write no claim that a file in the folder does not support.

The writing language follows the Writing Standard in CAROL.md. This skill does not restate it.

## What the file is

- It is a thin orientation file. An agent reads it first when it enters the folder.
- It is not the spec. It is not the sprint log. It is not a copy of any document.
- It points to documents. It does not restate them.
- It is a synopsis. The lossless rule for deliverable documents does not apply to it.

## Mode

- **Write.** No `CLAUDE.md` exists, or the existing file is a copy of CAROL.md. Write the file from the start.
- **Update.** A `CLAUDE.md` with its own content exists.
  1. Read it.
  2. Read the sources below.
  3. If every fact is current, change nothing.
  4. If a fact drifted, edit that fact in place. Keep the rest of the file as it is.

## Source

Read each of these files when it exists. Facts come from these files only.

- The root listing of the folder.
- `README.md`.
- The build or package manifest at the root.
- `ARCHITECTURE.md`.
- `SPEC.md`.
- `carol/SPRINT-LOG.md`.
- `DEBT.md`.

Do not run a build. Do not run the project.

## Folder type

- The folder is a source code project when a build or package manifest exists, or when source directories exist.
- Every other folder is not code.
- Decide from the evidence in the source files. Do not decide from the folder name.

## Structure - source code project

Write these sections in this order. Omit a section when its facts do not exist.

1. **Identity.** Name, type, language, framework or stack, root path, version.
2. **Current state.** The last sprint. The active ODE, when one exists. The active debt.
3. **Layout.** The layer order and the key source directories. One line for each.
4. **Key documents.** A table with two columns: document and purpose. List only documents that exist.
5. **API docs.** The location of the generated docs, for each generator the project uses. Doxygen, godoc, rustdoc, and typedoc are examples. List active generators and active libraries only. Exclude unused frameworks.
6. **Build.** One note on how to build. Take it from the manifest.

## Structure - folder that is not code

Write these sections in this order. Omit a section when its facts do not exist.

1. **Identity.** Name and root path.
2. **Purpose.** What the folder is about. One short paragraph. Take it from the content found.
3. **Contents.** The main subfolders or file groups. One line for each.
4. **Key documents.** A table with two columns: document and purpose. List only documents that exist.

## Excluded

- Rules that CAROL.md or the contract files already hold.
- Text copied from another document.
- Sprint detail beyond the last sprint. Debt entry bodies.
- A claim about intent that no file supports.

## Delivery

- Write mode: write `CLAUDE.md` at the project root with the Write tool.
- Update mode: edit `CLAUDE.md` in place with the Edit tool.
- Report "done" in chat. Add no summary.
