---
name: changelog-writer
description: Writes CHANGELOG.md at the project root - one shot, replaced, never appended. Load it whenever /changelog runs or ARCHITECT asks for a changelog. Gives the source rule, the fixed structure, and the audience rule so no agent reads an old changelog for style.
---

# Changelog Writer

This skill is the only source of the changelog format.

- Do not copy the style of an earlier changelog.
- Do not guess.
- Write no claim that the commits do not support.

The writing language follows the Writing Standard in CAROL.md. This skill does not restate it.

## What the changelog is

- It is not the sprint log. It is not the commit message.
- It is a synthesis of the latest deployment: bug fixes, features, and framework changes.
- It is a synopsis. The lossless rule for deliverable documents does not apply to it.
- The reader is an end user who is not a developer. Every line uses plain user terms.

## One shot

- The file is `CHANGELOG.md` at the project root.
- Every run replaces the whole file. Never append.
- Read the existing file for two facts only: its header date, and what it already told the reader.
- Clear the file. Write the new changelog from the start.
- If no `CHANGELOG.md` exists, ask ARCHITECT for the start point.

## Source

The changelog covers committed work only. The sprint log is a continuation journal. It is not a source. Work that is not committed is not in the changelog.

1. Find the boundary: the last commit that changed `CHANGELOG.md`. If no commit changed it, ask ARCHITECT for the start point.
2. Read the commits after the boundary: `git log <boundary>..HEAD`. Each message lists the changes by module, class, or object, with the rationale.
3. For detail that a message does not give, read `git show` for that commit.
4. Compare the result with the existing changelog. Write what is new for the reader since then.

## Structure

- Header: `CHANGELOG DD-Mon-YYYY`. The date is the day of writing.
- Intro line: `All changes since the DD-Mon-YYYY changelog. ► marks a test step for this round.`
- Then one section for each area. The area title uses plain user terms.
- Each section holds these bullets, in this order:
  1. `Fixed:` bullets. Each states the symptom the user saw.
  2. `Now` bullets. Each states the new behavior or the new feature.
  3. `►` bullets. Each is a test step. Each states the action and the pass condition ("The window must stay the same"). A step can name the failure that counts as a regression.
- A section for a new feature has `Now` bullets and `►` bullets.

## Under the Hood

- This section lists changes at framework level that the user does not see.
- Each bullet states what changed. A major change gets a bullet even when the user sees no change. A replacement of the rendering engine is one example.
- Each bullet ends with the visible effect: `No intended visible change.` or the real effect.
- Name the technology or the framework. Do not name files, classes, functions, or settings keys.
- Keep the technical detail low.
- A `►` step in this section tells the tester what to recheck.

## Known Open Items

- Add this section only when a known problem remains in the release.
- Each bullet states the problem and the action for the tester.

## Excluded

- File names, class names, function names.
- Sprint numbers and debt IDs.
- The commit message and the sprint log text.

## Delivery

- Write the file with the Write tool. ARCHITECT commits.
