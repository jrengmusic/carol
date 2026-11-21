---
name: iterative-contract-sop
description: The JANITOR loop for a bounded CODING.md clean-up campaign over a file, a module, or a whole library. Deterministic tools do every scan, edit, check, and commit; the model interprets the request, classifies each row, and reports. Load it whenever JANITOR runs a campaign.
---

# Iterative Contract SOP

## Tools

JANITOR has four tools and no shell. Each tool wraps one CLI script in `~/.carol/local/janitor/`. Any harness can call the CLI form.

| Tool | CLI form | Job |
|---|---|---|
| `read_range` | none (a numbered read) | Read numbered lines of one file, at most 80 per call. |
| `scan_rule` | `nvim --headless -l ~/.carol/local/janitor/scan.lua --rules <id,id> (--subject <kebab> --objective <text> \| --check) <path>...` | Find every violation. With a subject, write `CLEAN-UP-<subject>.md`. With `--check`, list the findings and write nothing. |
| `set_status` | `nvim --headless -l ~/.carol/local/janitor/tracker.lua --subject <kebab> --row <id> --flag <reason>` | Change one `PENDING` fix row to a flag, with the reason. |
| `fix_batch` | `nvim --headless -l ~/.carol/local/janitor/fix.lua --subject <kebab>` | Fix the next batch through `carol apply`, verify the parse and a rescan, mark the rows, and commit. |

## Rules

| Rule id | CODING.md heading | Fix or flag |
|---|---|---|
| `special-operators` | **Special operators:** | Fix `!`, `&&`, `\|\|` in code. Preprocessor directives are out of scope. |
| `namespace-enclosure-format` | **Namespace enclosure format:** | Fix a missing or wrong banner and a wrong closing comment. Flag a misplaced brace. |
| `no-anonymous-namespaces-allowed` | **NO anonymous namespaces allowed:** | Fix functions and variables into `static`. Flag a header, a type, a template, or an irregular layout. |
| `no-namespace-detail-allowed` | **NO `namespace detail` ... allowed:** | Always flag: the correction is a redesign. |

A request names a CODING.md section, so it maps to rule ids. Example: "namespace violations" maps to the three namespace rules.

## Loop

1. **Interpret.** Map the request to the rule ids and the scope paths. Choose a kebab-case subject and a one-sentence objective.
2. **Scan.** Call `scan_rule` with the rules, the paths, the subject, and the objective.
   - If it reports a dirty tree, stop. Tell ARCHITECT the baseline needs a commit.
   - Otherwise it returns the counts and the first batch.
3. **Classify the batch.** For each row of the batch:
   1. Read its lines with `read_range`.
   2. Keep the row when the fix is a pure syntax or style change.
   3. Call `set_status` when the fix would change logic, an interface, or ownership, or when the row is not what its kind says. Give the reason in one sentence.
4. **Fix.** Call `fix_batch` with the subject. It returns the done and flagged rows, the commit, and the next batch.
5. **Repeat** steps 3 and 4 until `fix_batch` returns `complete`.
6. **Report.** Give the DONE and FLAGGED counts and each FLAGGED row with its `file:line` and reason.

## Evidence

- A tool result is the only evidence. Report it verbatim.
- Never claim an edit that `fix_batch` did not report.
- After a compaction, the handoff summary gives the tracker, the progress, and the next action. Continue from it.
