---
name: xls-to-md
description: Convert listed columns of listed sheets of one .xlsx workbook into one markdown file of pandoc grid tables, formatted by cast to 100 display columns or less. Use when a primary needs a workbook as text, for example to translate it. The tool converts and never translates. A primary writes the spec and runs the command.
---

# xls-to-md

One run reads one workbook and writes one `.md` file. The file holds one `## <sheet name>`
heading and one grid table for each listed sheet. cast wraps and reflows the cells.

## Protocol

1. The primary writes the spec file.
2. The primary runs the one command below with the absolute spec path.
3. The primary reads the `.md` file. Translation, when needed, is a separate step by the
   primary. The tool translates nothing.

The command writes files. A primary runs it.

## Command

```
nvim --headless -l ~/.claude/skills/xls-to-md/tabulate.lua <absolute-spec-path>
```

Run it in the foreground.

Preconditions, all on the caller:

- `nvim`, `unzip` and `cast` are on PATH.
- Every path in the spec is absolute.
- The directory of `output` exists.

## Spec

The spec is a JSON file. Every field is required. The tool has no defaults. An unknown
field is an error.

| Field | Type | Meaning |
|---|---|---|
| `workbook` | string | Absolute path of the `.xlsx` file. |
| `output` | string | Absolute path of the `.md` file to write. |
| `sheets` | non-empty list | Sheets to convert, in output order. |
| `sheets[].name` | string | Sheet name, as in `xl/workbook.xml`. |
| `sheets[].columns` | non-empty list of string | Row-1 header text of each column to keep, in output order. |

Column identity is the row-1 header text. The tool replaces each CR/LF run in a header
with one space and trims the edges before it compares. A header that the sheet does not
have is an error. A header that the sheet has two times is an error. A header that is
empty cannot be listed.

### Template

```json
{
  "workbook": "/absolute/path/to/book.xlsx",
  "output": "/absolute/path/to/book.md",
  "sheets": [
    { "name": "Sheet1", "columns": ["Name", "Effect"] }
  ]
}
```

## What the run does

1. Validate the spec and the headers. On any error, print `SPEC ERROR` lines, write
   nothing, and exit 2.
2. Write `output`. Row 1 is the header row. Body rows keep source order. A row is skipped
   when every listed cell is empty. A cell is its cached value. Each CR/LF run becomes
   one space. The edges are trimmed. A `|` is written as `\|`. A `\` before an ASCII
   punctuation character, or at the end of a cell, is written as `\\`.
3. Write `.cast-format` in the directory of `output`. It holds one width for each column
   name. A run overwrites it.
4. Run `cast --format -i --style=file:<that file> <output>`.
5. Check that every line of `output` is 100 display columns or less.

Width rule. A table with `n` columns has `100 - 3n - 1` columns for the cell text. Each
column keeps its natural width when that is below the equal share. The other columns share
what is left. A column is never narrower than its header. Headers that alone exceed the
budget are a `SPEC ERROR`.

cast keys a column by an identifier, not by the name (`Model.cpp:36-38`). The identifier
turns each run of characters other than ASCII letters and digits into one `_`
(`jam_Format.cpp:120-123`). The tool groups the names by that identifier. A group takes
the smallest width over the columns that are capped in their table. A row that cast wraps
can start with one carried space, so the width in `.cast-format` for a capped group is one
less than that width.

## Output

The tool prints nothing on success.

| Line | Meaning |
|---|---|
| `SPEC ERROR <field>: <problem>` | The spec or a listed sheet or header is wrong. Nothing was written. |
| `DRIVER ERROR <message>` | `unzip` or `cast` failed, or a line is wider than 100 display columns. The message lists the line numbers and widths. |

Exit code: 0 when the run finished. 1 on `DRIVER ERROR`. 2 on `SPEC ERROR`.

## Limits

- Only `.xlsx`. A legacy `.xls` file is not a zip archive.
- The tool reads cached values. It evaluates no formula. A `DISPIMG` cell has formula text
  or an error as its cached value. The tool reads no image.
- Row 1 is the header row.
- The XML reader accepts attribute values in double quotes only.
- cast does not wrap a table that has one body row (SPEC.md §3.1, §3.3). A wide single row
  fails the width check.
- Two workbooks written to one directory share one `.cast-format` file. The second run
  overwrites the first.
- The tool does not fold Latin diacritics as `toValidID` does. Two names that differ only
  by diacritics share one cast identifier but get two widths here. The width check then
  shows any line over 100 columns.
- The width check uses `nvim_strwidth`. That function does not depend on the window.
