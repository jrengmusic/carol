#!/usr/bin/env python3
"""
rename_to_juce_convention.py

Rename JUCE module files from prefix_snake_case.h to prefix_PascalCase.h,
matching the JUCE `juce_ClassName` naming convention.

Reusable across any framework: KANJUT (kuassa), JAM (jam), CIUM (cium).

Usage:
    python3 rename_to_juce_convention.py --root ~/path/to/modules --prefix myprefix [--dry-run | --execute]

Phases:
    1. Build rename mapping (file renames)
    2. Build subdirectory rename mapping
    3. Apply file renames
    4. Update #include directives and @file doxygen tags

Idempotent: running twice on already-renamed files is a no-op.
"""

import argparse
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_SKIP_DIRS = ["___SDK___", "cmake", "AquaticPrime"]
DEFAULT_ACRONYMS  = ["RBJ", "FIR", "FFT", "SRPP", "XML", "SVG", "GPU", "GL",
                     "IPP", "APVTS", "URL", "DSP"]

# Regex to locate the first non-comment, non-forward-declaration class/struct.
# Group 1: identifier (the class name)
#
# [^;]*$ on the tail ensures the rest of the line contains no semicolon,
# which rejects forward declarations (`class Foo;`).  A negative lookahead
# like `(?!\s*;)` would allow the engine to backtrack to a shorter capture
# (e.g. "Fo" from "Foo;"), so the tail anchor is the correct approach.
_CLASS_RE = re.compile(
    r'^\s*(?:template\s*<[^>]*>\s*)?'   # optional template<...>
    r'(?:class|struct)\s+'              # keyword
    r'([A-Za-z_]\w*)'                   # class name (group 1)
    r'[^;]*$',                           # rest of line must have no semicolon
    re.MULTILINE,
)

# Matches the opening of a block comment so we can skip comment regions.
_BLOCK_COMMENT_OPEN_RE  = re.compile(r'/\*')
_BLOCK_COMMENT_CLOSE_RE = re.compile(r'\*/')

# Matches a line comment.
_LINE_COMMENT_RE = re.compile(r'//.*$', re.MULTILINE)

# Matches a preprocessor #define (to skip macro bodies).
_DEFINE_RE = re.compile(r'^\s*#\s*define\b', re.MULTILINE)


# ---------------------------------------------------------------------------
# Helpers: case conversion
# ---------------------------------------------------------------------------

def _snake_to_pascal(name: str, acronyms: list[str]) -> str:
    """
    Convert a snake_case identifier to PascalCase, preserving acronyms.

    "butterworth"  → "Butterworth"
    "rbj_filter"   → "RBJFilter"
    "hash_map"     → "HashMap"
    "cached_blur"  → "CachedBlur"
    """
    acronym_upper = {a.lower(): a for a in acronyms}
    parts = name.split("_")
    out = []
    for part in parts:
        if not part:
            continue
        lower = part.lower()
        if lower in acronym_upper:
            out.append(acronym_upper[lower])
        else:
            out.append(part.capitalize())
    return "".join(out)


def _camel_to_snake(name: str) -> str:
    """
    Convert a camelCase or PascalCase directory name to snake_case.

    "flexBox"  → "flex_box"
    "HashMap"  → "hash_map"
    """
    s1 = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', name)
    return re.sub(r'([a-z\d])([A-Z])', r'\1_\2', s1).lower()


def _is_camel_case(name: str) -> bool:
    """Return True if `name` looks like camelCase (lowercase-start, contains uppercase)."""
    return bool(name) and name[0].islower() and any(c.isupper() for c in name)


# ---------------------------------------------------------------------------
# Helpers: class-name extraction
# ---------------------------------------------------------------------------

def _strip_comments(source: str) -> str:
    """
    Remove block comments and line comments from source text.

    Preserves line count (replaces with whitespace) so line-based tooling
    doesn't need adjustment, but here we just need clean text for the regex.
    """
    result = []
    i = 0
    while i < len(source):
        # Block comment?
        m = _BLOCK_COMMENT_OPEN_RE.search(source, i)
        if m:
            # Everything before the block comment is kept.
            result.append(source[i:m.start()])
            close = _BLOCK_COMMENT_CLOSE_RE.search(source, m.end())
            if close:
                i = close.end()
            else:
                # Unclosed block comment — discard rest.
                break
        else:
            result.append(source[i:])
            break
    clean = "".join(result)
    # Strip line comments.
    clean = _LINE_COMMENT_RE.sub("", clean)
    return clean


def _strip_define_bodies(source: str) -> str:
    """
    Remove multi-line #define macro bodies (lines ending with \\) from source.
    Single-line defines are left (their class/struct matches are unlikely).
    """
    lines = source.splitlines(keepends=True)
    out = []
    in_define = False
    for line in lines:
        if in_define:
            if line.rstrip().endswith("\\"):
                out.append("\n")          # blank placeholder
            else:
                out.append("\n")          # end of define body
                in_define = False
        elif _DEFINE_RE.match(line):
            if line.rstrip().endswith("\\"):
                in_define = True
            out.append("\n")
        else:
            out.append(line)
    return "".join(out)


def extract_primary_class(source: str) -> str | None:
    """
    Return the first unqualified class or struct name found in `source`,
    after stripping comments and define bodies.

    Rules:
    - Forward declarations (line ends with `;` immediately after name) are skipped.
    - Names containing `::` are skipped (qualified names from friend/using).
    - Template parameters are not class names.
    - The FIRST match wins.
    """
    clean = _strip_comments(source)
    clean = _strip_define_bodies(clean)

    for m in _CLASS_RE.finditer(clean):
        name = m.group(1)
        # Skip names that look like template parameters (single uppercase letter).
        if len(name) == 1 and name.isupper():
            continue
        # Skip qualified names: `struct File::Watcher` — `\w*` stops at `:`,
        # so `File` is captured while `::Watcher` is in the tail.  If the
        # character immediately after the captured name is `:`, this is a
        # qualified declaration; skip it.
        after_name = clean[m.end(1):m.end(1) + 2]  # two chars after capture
        if after_name.startswith(":"):
            continue
        return name

    return None


# ---------------------------------------------------------------------------
# Helpers: module detection
# ---------------------------------------------------------------------------

def _is_module_root_file(filepath: Path, prefix: str) -> bool:
    """
    Return True if `filepath` is the module root file, e.g.:
    kuassa_core/kuassa_core.h  or  kuassa_core/kuassa_core.cpp
    """
    stem = filepath.stem          # e.g. "kuassa_core"
    parent_name = filepath.parent.name   # e.g. "kuassa_core"
    return stem == parent_name and stem.startswith(f"{prefix}_")


# ---------------------------------------------------------------------------
# Phase 1: Build file rename mapping
# ---------------------------------------------------------------------------

def build_file_renames(
    root: Path,
    prefix: str,
    skip_dirs: list[str],
    acronyms: list[str],
) -> dict[Path, Path]:
    """
    Walk `root`, find all header/source files in `{prefix}_*` module dirs,
    and return a dict mapping old Path → new Path.

    Keys and values are absolute paths.
    Module root files are excluded.
    """
    renames: dict[Path, Path] = {}

    # Collect module directories directly under root.
    module_dirs = sorted(
        d for d in root.iterdir()
        if d.is_dir() and d.name.startswith(f"{prefix}_")
    )

    for mod_dir in module_dirs:
        for filepath in sorted(mod_dir.rglob("*")):
            if not filepath.is_file():
                continue
            if filepath.suffix not in (".h", ".cpp", ".mm"):
                continue

            # Skip if any ancestor directory is in the skip list.
            rel = filepath.relative_to(root)
            parts = rel.parts
            if any(p in skip_dirs for p in parts):
                continue

            # Skip module root files.
            if _is_module_root_file(filepath, prefix):
                continue

            # Only rename .h files directly; .cpp/.mm companions follow their .h.
            if filepath.suffix in (".cpp", ".mm"):
                continue

            new_path = _compute_new_header_path(filepath, prefix, acronyms)
            if new_path != filepath:
                renames[filepath] = new_path

    # Now add companion .cpp and .mm for each renamed .h.
    h_renames = dict(renames)
    for old_h, new_h in h_renames.items():
        for ext in (".cpp", ".mm"):
            old_companion = old_h.with_suffix(ext)
            if old_companion.exists():
                new_companion = new_h.with_suffix(ext)
                if new_companion != old_companion:
                    renames[old_companion] = new_companion

    return renames


def _compute_new_header_path(filepath: Path, prefix: str, acronyms: list[str]) -> Path:
    """
    Determine the new path for a single .h file.

    Strategy:
    1. Read file, extract primary class name.
    2. New filename = {prefix}_{ClassName}.h
    3. If no class found: mechanical snake_case → PascalCase on the stem
       (after stripping the prefix if present).
    4. If file has no prefix: add it.
    """
    old_name = filepath.name   # e.g. "kuassa_butterworth.h"
    stem = filepath.stem       # e.g. "kuassa_butterworth"

    # Determine the "bare" name (without prefix).
    prefix_underscore = f"{prefix}_"
    if stem.startswith(prefix_underscore):
        bare = stem[len(prefix_underscore):]    # "butterworth"
    else:
        bare = stem                              # no prefix present

    # Read source and extract class name.
    try:
        source = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError:
        source = ""

    class_name = extract_primary_class(source)

    if class_name:
        new_stem = f"{prefix}_{class_name}"
    else:
        # Mechanical conversion.
        pascal = _snake_to_pascal(bare, acronyms)
        new_stem = f"{prefix}_{pascal}"

    new_name = f"{new_stem}.h"
    if new_name == old_name:
        return filepath  # no change

    return filepath.parent / new_name


# ---------------------------------------------------------------------------
# Phase 2: Build subdirectory rename mapping
# ---------------------------------------------------------------------------

def build_dir_renames(
    root: Path,
    prefix: str,
    skip_dirs: list[str],
) -> dict[Path, Path]:
    """
    Find subdirectories (non-module-root) that:
    - Are camelCase → rename to snake_case
    - Have a {prefix}_ prefix → remove the prefix

    Returns dict of old absolute path → new absolute path.
    Sorted deepest-first so renames can be applied leaf-to-root.
    """
    renames: dict[Path, Path] = {}

    module_dirs = sorted(
        d for d in root.iterdir()
        if d.is_dir() and d.name.startswith(f"{prefix}_")
    )

    for mod_dir in module_dirs:
        # Walk depth-first; we collect all dirs and sort later.
        for dirpath in sorted(mod_dir.rglob("*")):
            if not dirpath.is_dir():
                continue
            rel = dirpath.relative_to(root)
            parts = rel.parts
            # Skip the module root dir itself (it keeps its name).
            if len(parts) == 1:
                continue
            # Skip if any ancestor is in skip list.
            if any(p in skip_dirs for p in parts):
                continue

            dirname = dirpath.name
            new_dirname = _compute_new_dir_name(dirname, prefix)
            if new_dirname != dirname:
                renames[dirpath] = dirpath.parent / new_dirname

    # Sort deepest path first so we rename children before parents.
    sorted_renames = dict(
        sorted(renames.items(), key=lambda kv: len(kv[0].parts), reverse=True)
    )
    return sorted_renames


def _compute_new_dir_name(dirname: str, prefix: str) -> str:
    """
    Compute the new directory name.

    Rules (applied in order):
    1. Strip {prefix}_ prefix if present.
    2. If name is camelCase, convert to snake_case.
    """
    prefix_underscore = f"{prefix}_"
    if dirname.startswith(prefix_underscore):
        dirname = dirname[len(prefix_underscore):]

    if _is_camel_case(dirname):
        dirname = _camel_to_snake(dirname)

    return dirname


# ---------------------------------------------------------------------------
# Phase 3: Apply renames
# ---------------------------------------------------------------------------

def apply_file_renames(
    renames: dict[Path, Path],
    execute: bool,
    label: str = "FILE",
) -> None:
    """
    Print and optionally apply a set of file renames.
    `label` is shown in brackets: [FILE] or [DIR].
    """
    if not renames:
        return

    for old, new in sorted(renames.items()):
        # Describe the change.
        description = _describe_rename(old, new)
        print(description)
        if execute:
            new.parent.mkdir(parents=True, exist_ok=True)
            old.rename(new)


def _describe_rename(old: Path, new: Path) -> str:
    """Format a single rename for human-readable output."""
    label = "DIR" if old.is_dir() else "FILE"

    old_display = str(old)
    new_display = str(new)

    # Annotation for file renames: show extracted class name if we can recover it.
    annotation = ""
    if label == "FILE" and old.suffix == ".h" and old.exists():
        try:
            source = old.read_text(encoding="utf-8", errors="replace")
            cls = extract_primary_class(source)
            if cls:
                annotation = f" (class: {cls})"
            else:
                annotation = " (no class found, mechanical)"
        except OSError:
            pass

    return f"[{label}] {old_display} → {new_display}{annotation}"


# ---------------------------------------------------------------------------
# Phase 4: Update includes and @file tags
# ---------------------------------------------------------------------------

def build_include_map(
    file_renames: dict[Path, Path],
    dir_renames: dict[Path, Path],
    root: Path,
) -> dict[str, str]:
    """
    Build a mapping of old include path fragment → new include path fragment.

    Include paths are relative to the module directory, e.g.:
        "filter/kuassa_butterworth.h"  →  "filter/kuassa_Butterworth.h"
        "flexBox/kuassa_foo.h"         →  "flex_box/kuassa_Foo.h"

    We produce two variants of every old path (with and without leading
    module name) and map them to new.
    """
    include_map: dict[str, str] = {}

    for old_path, new_path in file_renames.items():
        old_rel = str(old_path.relative_to(root))   # e.g. kuassa_dsp/filter/kuassa_butterworth.h
        new_rel = str(new_path.relative_to(root))

        # Account for subdirectory renames in the path.
        new_rel = _apply_dir_renames_to_path(new_rel, dir_renames, root)

        # Map: full relative path (from root).
        include_map[old_rel] = new_rel

        # Map: basename only (used when includes just name the file).
        include_map[old_path.name] = new_path.name

        # Map: partial paths (subdir/filename variants).
        old_parts = old_path.relative_to(root).parts
        new_parts_list = new_rel.replace("\\", "/").split("/")
        for depth in range(1, len(old_parts)):
            old_sub = "/".join(old_parts[depth:])
            new_sub = "/".join(new_parts_list[depth:])
            if old_sub not in include_map:
                include_map[old_sub] = new_sub

    return include_map


def _apply_dir_renames_to_path(
    path_str: str,
    dir_renames: dict[Path, Path],
    root: Path,
) -> str:
    """
    Substitute renamed directory segments into a path string.
    """
    for old_dir, new_dir in dir_renames.items():
        old_seg = str(old_dir.relative_to(root)).replace("\\", "/")
        new_seg = str(new_dir.relative_to(root)).replace("\\", "/")
        path_str = path_str.replace(old_seg, new_seg)
    return path_str


# Matches #include "..." or #include <...>
_INCLUDE_RE = re.compile(r'(#\s*include\s*)(["<])([^">]+)([">])')

# Matches doxygen @file tag: /// @file oldname.h  or  /** @file oldname.h */
_ATFILE_RE = re.compile(r'(@file\s+)(\S+)')


def update_includes_in_file(
    filepath: Path,
    include_map: dict[str, str],
    execute: bool,
) -> list[str]:
    """
    Scan `filepath` for includes and @file tags that reference old names.
    Return a list of human-readable change descriptions.
    Apply changes to disk if `execute` is True.
    """
    try:
        original = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []

    lines = original.splitlines(keepends=True)
    changed_lines: list[tuple[int, str, str]] = []   # (lineno, old_line, new_line)

    for lineno, line in enumerate(lines, start=1):
        new_line = line

        # Update #include directives.
        def replace_include(m: re.Match) -> str:
            directive, open_q, path, close_q = m.groups()
            new_path = _lookup_include(path, include_map)
            return f"{directive}{open_q}{new_path}{close_q}"

        new_line = _INCLUDE_RE.sub(replace_include, new_line)

        # Update @file tags.
        def replace_atfile(m: re.Match) -> str:
            tag, filename = m.groups()
            new_filename = _lookup_include(filename, include_map)
            return f"{tag}{new_filename}"

        new_line = _ATFILE_RE.sub(replace_atfile, new_line)

        if new_line != line:
            changed_lines.append((lineno, line.rstrip("\n"), new_line.rstrip("\n")))
            lines[lineno - 1] = new_line

    descriptions = []
    for lineno, old_line, new_line in changed_lines:
        descriptions.append(
            f"[INCLUDE] {filepath}:{lineno}: {old_line.strip()!r} → {new_line.strip()!r}"
        )

    if execute and changed_lines:
        filepath.write_text("".join(lines), encoding="utf-8")

    return descriptions


def _lookup_include(path: str, include_map: dict[str, str]) -> str:
    """
    Look up `path` in the include map, trying progressively shorter suffixes.
    Returns the new path if found, else the original.
    """
    # Exact match first.
    if path in include_map:
        return include_map[path]

    # Try matching any suffix segment of the path.
    parts = path.replace("\\", "/").split("/")
    for depth in range(1, len(parts)):
        suffix = "/".join(parts[depth:])
        if suffix in include_map:
            prefix_parts = parts[:depth]
            # Rebuild: replace the suffix portion with the new mapped suffix.
            new_suffix = include_map[suffix]
            return "/".join(prefix_parts) + "/" + new_suffix

    return path


def update_all_includes(
    root: Path,
    prefix: str,
    include_map: dict[str, str],
    skip_dirs: list[str],
    execute: bool,
) -> None:
    """
    Walk all .h / .cpp / .mm files under root and update their includes.
    """
    if not include_map:
        return

    for filepath in sorted(root.rglob("*")):
        if not filepath.is_file():
            continue
        if filepath.suffix not in (".h", ".cpp", ".mm"):
            continue
        rel = filepath.relative_to(root)
        if any(p in skip_dirs for p in rel.parts):
            continue

        descriptions = update_includes_in_file(filepath, include_map, execute)
        for desc in descriptions:
            print(desc)


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------

def run(
    root: Path,
    prefix: str,
    skip_dirs: list[str],
    acronyms: list[str],
    execute: bool,
) -> None:
    mode_label = "EXECUTE" if execute else "DRY-RUN"
    print(f"=== rename_to_juce_convention ({mode_label}) ===")
    print(f"    root   : {root}")
    print(f"    prefix : {prefix}")
    print(f"    acronyms: {', '.join(acronyms)}")
    print(f"    skip   : {', '.join(skip_dirs)}")
    print()

    # Phase 1: File rename mapping.
    print("--- Phase 1: File renames ---")
    file_renames = build_file_renames(root, prefix, skip_dirs, acronyms)
    if not file_renames:
        print("  (no file renames needed)")
    else:
        for old, new in sorted(file_renames.items()):
            print(_describe_rename(old, new))

    # Phase 2: Subdirectory rename mapping.
    print()
    print("--- Phase 2: Subdirectory renames ---")
    dir_renames = build_dir_renames(root, prefix, skip_dirs)
    if not dir_renames:
        print("  (no directory renames needed)")
    else:
        for old, new in sorted(dir_renames.items(), key=lambda kv: len(kv[0].parts), reverse=True):
            print(f"[DIR] {old} → {new}")

    # Phase 3: Apply file renames (deepest first to avoid parent-rename collisions).
    if execute and file_renames:
        print()
        print("--- Phase 3: Applying file renames ---")
        # Apply companion files first, then headers (order within same dir doesn't matter
        # but keep headers logically last for clarity).
        sorted_renames = dict(sorted(file_renames.items(), key=lambda kv: len(kv[0].parts), reverse=True))
        for old, new in sorted_renames.items():
            if old.exists():
                new.parent.mkdir(parents=True, exist_ok=True)
                old.rename(new)

    # Apply directory renames (deepest first).
    if execute and dir_renames:
        print()
        print("--- Phase 3b: Applying directory renames ---")
        for old, new in dir_renames.items():   # already sorted deepest-first
            if old.exists():
                old.rename(new)

    # Phase 4: Update includes.
    print()
    print("--- Phase 4: Updating includes ---")
    include_map = build_include_map(file_renames, dir_renames, root)
    update_all_includes(root, prefix, include_map, skip_dirs, execute)
    if not include_map:
        print("  (no include updates needed)")

    print()
    print(f"=== Done ({mode_label}) ===")
    if not execute:
        print("    Re-run with --execute to apply changes.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rename JUCE module files to prefix_PascalCase.h convention.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--root",
        required=True,
        metavar="PATH",
        help="Root directory containing the {prefix}_* module directories.",
    )
    parser.add_argument(
        "--prefix",
        required=True,
        metavar="PREFIX",
        help="Module prefix, e.g. kuassa, jam, cium.",
    )
    parser.add_argument(
        "--skip-dirs",
        default=",".join(DEFAULT_SKIP_DIRS),
        metavar="DIRS",
        help=(
            "Comma-separated directory names to skip. "
            f"Default: {','.join(DEFAULT_SKIP_DIRS)}"
        ),
    )
    parser.add_argument(
        "--acronyms",
        default=",".join(DEFAULT_ACRONYMS),
        metavar="WORDS",
        help=(
            "Comma-separated words to preserve ALL CAPS in PascalCase. "
            f"Default: {','.join(DEFAULT_ACRONYMS)}"
        ),
    )

    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Print what would be done without doing it (default).",
    )
    mode_group.add_argument(
        "--execute",
        action="store_true",
        default=False,
        help="Actually perform the renames.",
    )

    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        print(f"ERROR: --root path does not exist or is not a directory: {root}", file=sys.stderr)
        sys.exit(1)

    skip_dirs = [s.strip() for s in args.skip_dirs.split(",") if s.strip()]
    acronyms  = [a.strip() for a in args.acronyms.split(",") if a.strip()]
    execute   = args.execute   # --dry-run is the default; --execute overrides

    run(root, args.prefix, skip_dirs, acronyms, execute)


if __name__ == "__main__":
    main()
