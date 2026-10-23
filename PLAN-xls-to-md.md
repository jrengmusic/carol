# PLAN — xls-to-md

**Author:** COUNSELOR (session: Crimson Oath, 2026-10-23)
**Implementer:** MACHINIST
**Status:** Ready for ARCHITECT review. Section 6 holds the items that have no ruling.

---

## 1. Rulings (ARCHITECT, verbatim)

| ID  | Ruling                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | "translate all sheet into english into markdown format pandoc grid tables with 100 column max (the whole document cap), i believe you can format it using cast" |
| R2  | "can we formalise it into carol tools? so it's reusable?"                                                                                                      |
| R3  | "write PLAN-xls-to-md.md to ~/.carol/ i will ask machinist to write it first, then you can run it"                                                             |
| R4  | "must be crossplatform"                                                                                                                                        |
| R5  | "so the deps are: - nvim - cast - unzip? what cli are we using? 7-zip? already in my path? - and the lua script?"                                              |
| R6  | Extractor: "unzip -p"                                                                                                                                          |
| R7  | Columns: "Caller lists columns"                                                                                                                                |
| R8  | Output files: "One per workbook"                                                                                                                               |
| R9  | "why separate tables? cast can wrap and reflow"                                                                                                                |
| R10 | "why do we even care about "break"? what is break is lost? did you understand what cast formatter capable of?"                                                 |

Consequences of the rulings:

- R1, R9: one grid table for each sheet. cast does all wrap and reflow.
- R10: the tool does not process line breaks in cell text. It writes the source lines of a
  cell as they are. cast reads them and reflows them (SPEC.md:293-301).
- R1: translation is not a tool step. The tool converts. A CAROL primary translates the
  output.

---

## 2. Scope

In scope:

1. One Lua script that headless nvim runs (R5).
2. Input: one `.xlsx` workbook and one spec file.
3. Output: one `.md` file for the workbook (R8). One `## <sheet name>` heading and one grid
   table for each listed sheet.
4. A cast run that formats the output to 100 columns or less (R1).
5. A width check of the formatted output.
6. A `SKILL.md` in the CAROL skill shape.

Out of scope:

- Translation (R1 consequence).
- Images. A `DISPIMG` cell has only formula text or an error as its cached value (§3.2).
- Formula evaluation. The tool reads cached values only.
- Legacy binary `.xls`. It is not a zip archive, so `unzip -p` cannot read it.

---

## 3. Facts

All facts below come from reads and probes in the COUNSELOR session. Evidence files are in
`C:/msys64/tmp/claude/C--Users-jreng-downloads-Crimson-Oath/d4bdfb6f-0003-4bf1-8ae0-c5aeb49bf9e6/scratchpad/`.

### 3.1 Runtime

- nvim on the Windows machine: `NVIM v0.12.3`, LuaJIT 2.1.1774638290.
- Command shape of the sibling skill: `nvim --headless -l ~/.claude/skills/whatdbg-trace/trace.lua <absolute-spec-path>`
  (`~/.carol/skills/whatdbg-trace/SKILL.md:35-36`).
- An external command from Lua works: `vim.system({ ... }):wait()` gave `code=0` and the
  full stdout (`scratchpad/probe/read.lua`, 19434 bytes of `xl/sharedStrings.xml`).
- nvim Lua has no zip library: `require("zlib")` gives `module 'zlib' not found`.
- nvim has no XML parser: a parse gives `No parser for language "xml"`. The script parses
  the XML with Lua string functions.
- `unzip` on Windows: `C:\msys64\usr\bin\unzip.exe`. `bootstrap-windows.sh:289-292` installs
  it through pacman. Inside nvim, `vim.fn.exepath("unzip")` gives
  `C:\msys64\usr\bin\unzip.EXE`. `unzip -p <xlsx> xl/workbook.xml` gave rc=0 from the shell.
  It has not been run from Lua.
- `unzip` on macOS: `bootstrap-macos.sh` does not install it. Its presence is not verified.
- Do not use a bare `tar` on Windows. In nvim it finds MSYS GNU tar 1.35, which fails on an
  xlsx with rc=2.
- cast: `~/.local/bin/cast` (macOS), `~/.local/bin/cast.exe` (Windows) (`~/.carol/CAST.md:13`).
  Version: `cast 0.1.0 (3147a86)`.

### 3.2 xlsx structure

Source: the working stdlib reader
`scratchpad/xlsx_probe.py`. It read all six test workbooks with no value mismatch in a
second independent read.

- Sheet list: `xl/workbook.xml`, `<sheets><sheet name="…" r:id="…" state="…">`. Map `r:id`
  to `Target` through `xl/_rels/workbook.xml.rels`. A `Target` that starts with `/` is
  absolute in the package. Any other `Target` is relative to `xl/` (xlsx_probe.py:46-56).
- `state` is absent for a visible sheet (xlsx_probe.py:55).
- Shared strings: `xl/sharedStrings.xml`. The text of one `<si>` is the concatenation of
  its direct `<t>` children and the `<t>` children of its `<r>` children. Other children
  are ignored (xlsx_probe.py:34-42). The part can be absent (xlsx_probe.py:29-32).
- Cell: `<c r="B12" t="…">` with `<v>`, `<is>` and `<f>` children. The reference pattern is
  `([A-Z]+)(\d+)$` (xlsx_probe.py:14, 73-78).
- Cell types (xlsx_probe.py:79-96):

  | `t`         | Value                                     |
  | ----------- | ----------------------------------------- |
  | `s`         | shared string at index `<v>`              |
  | `inlineStr` | concatenation of the `<t>` text in `<is>` |
  | `str`       | `<v>` text (formula string result)        |
  | `b`         | `<v>` is `0` or `1`                       |
  | `e`         | `<v>` is the error text                   |
  | absent, `n` | `<v>` text, a number                      |

- Merged ranges: `<mergeCells><mergeCell ref="I1:O1">`. Only the top-left cell holds the
  value (xlsx_probe.py:98-101).
- `<dimension>` can be absent. Both Russian test workbooks have none. Compute the extent
  from the cells.
- XML character references: the Python reader decoded them through ElementTree
  (xlsx_probe.py:24-25). The Lua reader must decode them itself. MACHINIST confirms the
  set that the test workbooks use.
- Test-data properties:
  - WPS wrote the workbooks: `xmlns:dbsheet="http://web.wps.cn/et/2021/dbsheet"` in
    `xl/workbook.xml`.
  - `DISPIMG` image cells: the cached value is `=DISPIMG("ID_…",1)` in the Chinese file and
    `#NAME?` in the Russian file (`scratchpad/guide/ru_diff.txt` §1).
  - Hidden sheet `WpsReserved_CellImgList`: `veryHidden` or `hidden`, and empty.
  - Row 1 is the header row in every sheet of all six workbooks.
  - Duplicate headers in one sheet: `技能和皮肤` has `位置` two times and `缩略图` two
    times (`scratchpad/guide/skills_skins.tsv:1`).
  - Empty header with data: Localization sheets Map1-6, Item, Tips and Game have an empty
    row-1 cell in column A, and column A holds speaker labels on Map1-6.

### 3.3 cast formatter

Source: `~/Documents/Poems/dev/cast/SPEC.md` (the authority, SPEC.md:9-12), the cast and
JAM source, and probes P1-P5 (`scratchpad/castprobe/`).

- A grid table is a format table only when it has a `=` header separator line
  (JAM `jam_markdown/document/jam_MarkdownBlockParser.cpp:2000-2016, 2031-2034`).
- "A grid table whose body has no border between rows never splits." (SPEC.md:347, 1052).
  Probe P3: a body with no row borders did not reflow.
- Column width: the style file's `## format` table, `| name | width |`. `name` is a column
  name. `width` is the wrap width of every body cell in a column of that name, in every
  grid table of the run (SPEC.md:1022-1024).
- A column that `## format` does not name keeps its natural width (SPEC.md:346-347).
- A header wider than its width makes the column wider. The header does not wrap. Probe
  P1: header `Japanese`, width 4, column width 8.
- A run with no break opportunity that is wider than the width is cut at the width by
  display width (SPEC.md:331-332).
- In a named column, the reader joins the lines of a cell with nothing between and then
  reflows (SPEC.md:293-301; cast `Source/Model.cpp:932-938`).
- Display width: East Asian Wide counts 2 (JAM `jam_core/text/jam_AttributedChar.h:286-295`).
  Probe P1: CJK text wrapped at 4 display columns.
- Escapes: write a `|` in a cell as `\|` (SPEC.md:309-311). A backslash before an ASCII
  punctuation character is an escape, and the reader drops the backslash (SPEC.md:304).
  Probe P5: `a\"b` and `x\|y` passed the formatter unchanged.
- A column name in `## format` two times is fatal (SPEC.md §6.11, identity column).
- `--style=file:<path>` wins over every other style source (SPEC.md §6.11 precedence 1). The
  path resolves against the working directory (cast `Source/main.cpp:530-533`). Any file
  name is valid (SPEC.md §6.11 Names).
- `cast --format -i <file>`: formats in place, write-if-different, stdout empty. On failure:
  exit 1, empty stdout, diagnostic on stderr (SPEC.md:150-165; main.cpp:1078-1088).
- cast has no check on the total width of a table line (cast `Source/Validator.cpp:920-947`).
  The paragraph wrap default is 100 (SPEC.md:1028).
- The parser compares pipe counts for each row. It does not compare widths
  (JAM `jam_MarkdownBlockParser.cpp:2125-2139`). Whether cast accepts and pads an unaligned
  grid table is not tested (Step 4).
- Not explained: probe P4 (13 columns, every width 3) gave an output of 809 columns,
  byte-identical to its aligned input. P1 and P2 wrapped. The cause is not isolated. The
  width check (§4.2 step 10) catches this case.

### 3.4 CAROL skill pattern

- Layout: `~/.carol/skills/<name>/` with `SKILL.md` and `.lua` files
  (`~/.carol/skills/whatdbg-trace/`).
- `bin/carol:142-146` and `bin/carol:975-981` link each skill directory into
  `~/.claude/skills`.
- `SKILL.md` shape: frontmatter `name`, `description`; then Protocol, Command,
  Preconditions, Spec with a field table and a template, Output, Limits
  (`whatdbg-trace/SKILL.md:1-200`).
- Spec rules of the sibling: "Every field is required. The driver has no defaults. An
  unknown field is an error." (SKILL.md:49-50).
- Output lines of the sibling: `SPEC ERROR <field>: <problem>` and `DRIVER ERROR <message>`
  (SKILL.md:147, 149).
- Exit codes of the sibling: "0 when the run happened. 2 when the spec is wrong."
  (SKILL.md:189; `driver.lua:6` `exitCodeSpecError = 2`).
- Lua style of the sibling: `driver.lua:1-80` (module table, named constants, validator
  table dispatch).

---

## 4. Design

### 4.1 Interface

The caller lists the columns (R7). The sibling takes a JSON spec file (SKILL.md:47-50), so
this tool does the same.

Command:

```
nvim --headless -l ~/.claude/skills/xls-to-md/<entry>.lua <absolute-spec-path>
```

Spec fields. Every field is required. An unknown field is an error.

| Field              | Type                    | Meaning                                                    |
| ------------------ | ----------------------- | ---------------------------------------------------------- |
| `workbook`         | string                  | Absolute path of the `.xlsx` file.                         |
| `output`           | string                  | Absolute path of the `.md` file to write.                  |
| `sheets`           | list                    | Sheets to convert, in output order. Not empty.             |
| `sheets[].name`    | string                  | Sheet name, as in `xl/workbook.xml`.                       |
| `sheets[].columns` | list of string, not empty | Row-1 header text of each column to keep, in output order. |

Column identity is the row-1 header text. cast uses the same identity in `## format`
(SPEC.md:1022). Thus:

- A header that the sheet does not have is a spec error.
- A header that the sheet has two times is a spec error. The selection is ambiguous.
- A column with an empty header cannot be listed.

Template:

```json
{
  "workbook": "C:/Users/jreng/downloads/Crimson Oath/CrimsonOath-AllEquipmentSkillsSkin.xlsx",
  "output": "C:/Users/jreng/downloads/Crimson Oath/CrimsonOath-AllEquipmentSkillsSkin.md",
  "sheets": [
    { "name": "装备", "columns": ["名称", "作用", "出现地图", "布置位置"] }
  ]
}
```

### 4.2 Run steps

1. Read and validate the spec. On any error, print one `SPEC ERROR <field>: <problem>` line
   for each error and exit 2. Write nothing.
2. Read each package part with `unzip -p <workbook> <part>` through `vim.system`. A
   non-zero exit is a `DRIVER ERROR` with unzip's stderr, exit 1.
3. Parse `xl/workbook.xml` and `xl/_rels/workbook.xml.rels` to map each sheet name to its
   part (§3.2).
4. Parse `xl/sharedStrings.xml` (§3.2).
5. For each spec sheet: parse its part (§3.2). Find each listed column by its row-1 header.
6. Write the `.md`:
   - `## <sheet name>`, a blank line, then the grid table, then a blank line.
   - Header row: the listed header texts, in spec order.
   - A `=` separator line after the header row (§3.3).
   - Body: rows 2 to the last row, in source order. Each cell holds the cached value text
     (§3.2). A merged range gives its value at the top-left cell only.
   - A border line after every body row (SPEC.md:347).
   - Cell text: write `|` as `\|`. Write a `\` that comes before an ASCII punctuation
     character as `\\` (SPEC.md:304, 309-311). Write a line break in the source text as a
     new physical line of the same cell (R10).
   - Border and cell padding: as Step 4 decides.
7. Compute the width of each listed column name (§6, O2).
8. Write the style file (§6, O3): `## format`, `| name | width |`, one row for each distinct
   column name in the output.
9. Run `cast --format -i --style=file:<absolute style path> <output>`. A non-zero exit is a
   `DRIVER ERROR` with cast's stderr, exit 1.
10. Read the formatted output. Every line must be 100 display columns or less (R1). Use the
    nvim API for display width — do not write a width function again (CODING.md "Use the
    framework API fully"). A wider line is a `DRIVER ERROR` that lists each line number and
    width, exit 1.
11. Exit 0. Print nothing on success.

### 4.3 Cross-platform rules (R4)

- One code path on Windows and macOS. The extractor is `unzip -p` on both (R6), thus no
  OS branch for it.
- Find `cast` and `unzip` on PATH. Do not write an absolute path to them.
- Build and compare paths with the nvim API. MACHINIST reads the nvim docs for the path
  functions. Do not use training priors.
- Output is LF and UTF-8 on both platforms.

---

## 5. Steps for MACHINIST

1. Read `~/.carol/CODING.md`, `MANIFESTO.md`, `NAMES.md`, and the Lua section of
   `LANGUAGE.md`.
2. Read `~/.carol/skills/whatdbg-trace/SKILL.md`, `driver.lua` and `trace.lua`. Find how
   `trace.lua` reads its argument and sets the exit code. COUNSELOR did not read these
   lines.
3. Verify the extractor:
   - Windows, from Lua: `vim.system({ "unzip", "-p", <xlsx>, "xl/workbook.xml" }):wait()`
     gives code 0 and the XML.
   - macOS, from a shell and from Lua: `command -v unzip`, then the same call.
   - Report each result. A missing `unzip` on macOS stops the plan: report to ARCHITECT.
4. Test cast with an unaligned grid table: borders of one `-` for each column, cells with no
   padding, row borders between all body rows, `=` separator present. Run
   `cast --format` on it to stdout.
   - cast accepts and pads it: the tool writes the unaligned form.
   - cast rejects it: the tool pads each cell to its column's widest display width
     (nvim API for display width).
5. Implement §4 in `~/.carol/skills/xls-to-md/`.
6. Write `SKILL.md` in the sibling shape (§3.4).
7. Run `carol` once and confirm the new link in `~/.claude/skills` (bin/carol:142-146).
8. Test with the Crimson Oath workbooks (§7). Confirm:
   - every line of each output is 100 display columns or less;
   - a second run gives a byte-identical output;
   - a spec with an unknown field, a missing sheet, a missing header and a duplicate
     header each gives `SPEC ERROR` and exit 2.

---

## 6. Open items (no ruling)

| ID  | Item                  | Facts                                                                                                                                                                                                                                                       |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | Empty rows            | A row where every listed cell is empty. Localization Map4 has 86 fully empty rows (`scratchpad/guide/distributions_4b.tsv`). Write them, or skip them.                                                                                                       |
| O2  | Width split           | One width for each column name in the file (R8, SPEC.md:1022-1024). A header is a lower bound (P1). Each table needs `sum(widths) + 3n + 1 <= 100` for `n` columns. A rule is necessary that gives each name its width. Headers that alone exceed the budget are fatal. |
| O3  | Style file place      | `--style=file:` takes any path (§3.3). Write it as a temporary file and delete it after the run, or keep it beside the output.                                                                                                                              |
| O4  | Entry script name     | The skill directory is `xls-to-md` (R3). The sibling has `trace.lua` and `sample.lua` as entry scripts (SKILL.md:12-13). The entry script of this skill has no name yet (NAMES.md Rule -1).                                                                  |

---

## 7. Test data

Workbooks in `C:/Users/jreng/downloads/Crimson Oath/`:

| Workbook                                                   | Sheets                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| `CrimsonOath-AllAchievement.xlsx`                          | `Sheet1`                                                     |
| `CrimsonOath-AllDialogue-AllDiscription-All Localization.xlsx` | `Map1`-`Map6`, `Item`, `Tips`, `Game`, `Menu`, `UI`, `NPCName` |
| `CrimsonOath-AllEquipmentSkillsSkin.xlsx`                  | `装备`, `技能和皮肤`, hidden `WpsReserved_CellImgList`       |
| `CrimsonOath-AllEquipmentSkillsSkin-Russian-Tristis Oris.xlsx` | `装备`, `ru`, `技能和皮肤`, `ru2`, hidden `WpsReserved_CellImgList` |
| `CrimsonOath-AllSkillsDamage.xlsx`                         | `Sheet1`                                                     |
| `CrimsonOath-AllSkillsDamage-Tristis Oris.xlsx`            | `Sheet1`, `ru`                                               |

Reference values: the TSV extracts in `scratchpad/guide/` and `scratchpad/guide/en/` hold
the same cells, read by the Python reader. Compare the tool output cells with them.

Rock 'n Roll!
**JRENG!**
