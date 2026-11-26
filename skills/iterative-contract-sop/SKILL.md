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
| `fix_batch` | `nvim --headless -l ~/.carol/local/janitor/fix.lua --subject <kebab>` | Fix the next batch through `saw patch`, verify the parse and a rescan, mark the rows, and commit. |

## Sections

Pass a section name to `scan_rule` whenever the request names a CODING.md or NAMES.md section. `scan_rule` expands each section to all its rules.

| Section | Contract section | Expanded rules |
|---|---|---|
| `all` | All CODING.md + NAMES.md | All 31 rules (`coding` + `names`) |
| `coding` | All CODING.md | All 26 CODING.md rules |
| `formatting` | `## FORMATTING` | `special-operators`, `braces-new-line`, `comment-spacing` |
| `pointers` | `## POINTERS AND REFERENCES` | `pointer-ref-placement`, `const-placement`, `no-multiple-pointers` |
| `literals` | `## LITERALS AND CONSTANTS` | `numeric-literals`, `null-to-nullptr`, `no-platform-macro-names` |
| `namespaces` | `## NAMESPACES` | `no-anonymous-namespaces-allowed`, `no-namespace-detail-allowed`, `namespace-enclosure-format` |
| `modern-cpp` | Modern C++ / Diagnostics | `override-without-virtual`, `no-c-casts`, `no-c-math`, `no-dbg`, `no-pair-first-second`, `no-string-equality`, `no-implicit-null-check` |
| `structure` | Memory / Class / Header | `no-raw-new-delete`, `no-manual-raii-destructor`, `no-friend`, `no-local-struct`, `no-forward-declarations` |
| `control-flow` | `## CONTROL FLOW` | `no-else-after-return`, `no-bail-out-guard` |
| `names` | `NAMES.md` | `no-kind-prefix`, `no-variable-underscores`, `no-type-suffix`, `apply-without-callable`, `forbidden-terms` |

## Rules

- **Auto-fix rules (tree-sitter):** `special-operators`, `braces-new-line`, `comment-spacing`, `pointer-ref-placement`, `const-placement`, `numeric-literals`, `null-to-nullptr`, `no-anonymous-namespaces-allowed` (`.cpp` functions/vars), `namespace-enclosure-format`, `override-without-virtual`, `no-c-math`.
- **Auto-fix rules (`ling` cross-TU rename when indexed, else flag):** `no-kind-prefix`, `no-variable-underscores`.
- **Flag-only rules (redesign / judgment):** `no-multiple-pointers`, `no-platform-macro-names`, `no-namespace-detail-allowed`, `no-c-casts`, `no-dbg`, `no-pair-first-second`, `no-string-equality`, `no-implicit-null-check`, `no-raw-new-delete`, `no-manual-raii-destructor`, `no-friend`, `no-local-struct`, `no-forward-declarations`, `no-else-after-return`, `no-bail-out-guard`, `no-type-suffix`, `apply-without-callable`, `forbidden-terms`.

## Loop

1. **Interpret.** Map the request to section names (or single rule ids when the request names one rule) and the scope paths. Choose a kebab-case subject and a one-sentence objective.
2. **Scan.** Call `scan_rule` with the rules, the paths, the subject, and the objective.
   - If it reports a dirty tree, stop. Tell ARCHITECT the baseline needs a commit.
   - Otherwise it returns the counts and the first batch.
3. **Classify the batch.** For each row of the batch:
   1. Read its lines with `read_range`.
   2. Keep the row when the fix is a pure syntax or style change.
   3. Call `set_status` when the fix would change logic, an interface, or ownership, or when the row is not what its kind says. Give the reason in one sentence.
4. **Fix.** Call `fix_batch` with the subject. When `PENDING` rows remain, the harness compacts the context to the tracker handoff for the next batch. When no `PENDING` row remains, `fix_batch` returns the final report.
5. **Repeat** steps 3 and 4 from each handoff until `fix_batch` returns `pending: 0`.
6. **Report.** Pass on the final report from `fix_batch` verbatim: the `DONE` and `FLAGGED` counts and each `FLAGGED` row with its `file:line` and reason.

## Evidence

- A tool result is the only evidence. Report it verbatim.
- Never claim an edit that `fix_batch` did not report.
- After a compaction, the handoff summary gives the tracker, the progress, and the next action. Continue from it.
