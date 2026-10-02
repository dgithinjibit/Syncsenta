"""Transpile scheme-scribe-ai TypeScript curriculum data to Python.

Source: https://github.com/dgithinjibit/scheme-scribe-ai (src/data/curriculum/)
Target: ai-agents/src/syncsenta_agents/curriculum/

The curriculum files are almost entirely pure data: nested object/array literals
of strings and numbers. This script:

  1. Strips TypeScript-specific syntax (imports, type annotations, `as ...`).
  2. Inlines the `mada(...)` helper used in lower-primary/kiswahili.ts.
  3. Converts the resulting JS object/array literal expressions to Python
     literals via a small tokenizer (handles unquoted keys, comments, trailing
     commas).
  4. Writes one Python module per TS file under the target directory, exposing
     each `export const X` as a Python `X = [...]`.

Re-run after pulling updates from upstream:

    python ai-agents/scripts/transpile_curriculum.py \\
        --src /tmp/scheme-scribe-ai/src/data/curriculum \\
        --dst ai-agents/src/syncsenta_agents/curriculum

The hand-written modules `types.py`, `term_mappings.py`, and
`__init__.py` are NOT touched by this script.
"""

from __future__ import annotations

import argparse
import ast
import re
import sys
from pathlib import Path
from typing import List, Tuple

# --- Files we transpile ---------------------------------------------------

LOWER_PRIMARY = [
    "creative-activities.ts",
    "cre.ts",
    "english-activities.ts",
    "environmental-activities.ts",
    "hre.ts",
    "ire.ts",
    "kiswahili.ts",
    "mathematics.ts",
]

UPPER_PRIMARY = [
    "agriculture-grade4.ts",
    "agriculture.ts",
    "creative-arts-grade5.ts",
    "creative-arts.ts",
    "cre.ts",
    "english.ts",
    "indigenous-language.ts",
    "kiswahili-grade6.ts",
    "kiswahili.ts",
    "mathematics-grade5.ts",
    "mathematics-grade6.ts",
    "science-technology-grade4.ts",
    "social-studies-grade6.ts",
    "social-studies.ts",
]


def ts_to_py_filename(ts_name: str) -> str:
    """creative-activities.ts -> creative_activities.py"""
    return ts_name.replace("-", "_").replace(".ts", ".py")


# --- TypeScript -> JS-ish expression preprocessing ------------------------

EXPORT_CONST_RE = re.compile(
    r"^export\s+const\s+(\w+)(?:\s*:[^=]+?)?\s*=\s*",
    re.MULTILINE,
)

# Strip line and block comments while preserving string contents.
def strip_comments(src: str) -> str:
    out: list[str] = []
    i = 0
    n = len(src)
    while i < n:
        c = src[i]
        # String literal
        if c in ('"', "'", "`"):
            quote = c
            out.append(c)
            i += 1
            while i < n:
                ch = src[i]
                out.append(ch)
                if ch == "\\" and i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
                if ch == quote:
                    i += 1
                    break
                i += 1
            continue
        # Line comment
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i)
            if j == -1:
                break
            i = j
            continue
        # Block comment
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            if j == -1:
                break
            i = j + 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


def inline_mada_helper(src: str) -> str:
    """Replace mada("X") calls in lower-primary/kiswahili.ts with the literal
    object the helper returns. Detection is text-based but only triggered when
    the helper is actually defined in the file."""
    if "function mada(name: string)" not in src and "function mada(" not in src:
        return src

    template = (
        '{{name: {name}, subStrands: ['
        '{{name: "Kusikiliza na Kuzungumza", lessons: 3}}, '
        '{{name: "Kusoma", lessons: 3}}, '
        '{{name: "Kuandika", lessons: 3}}, '
        '{{name: "Sarufi", lessons: 3}}'
        ']}}'
    )

    def _expand(match: re.Match[str]) -> str:
        return template.format(name=match.group(1))

    src = re.sub(r"mada\((\"[^\"]*\")\)", _expand, src)
    src = re.sub(r"mada\(('[^']*')\)", _expand, src)
    # Remove the helper definition itself.
    src = re.sub(
        r"function mada\([^)]*\)\s*:\s*StrandInfo\s*\{[^}]*\{[\s\S]*?\}\s*\}\s*",
        "",
        src,
    )
    src = re.sub(
        r"function mada\([^)]*\)\s*\{[\s\S]*?return[\s\S]*?\}\s*\}\s*",
        "",
        src,
    )
    return src


def find_export_blocks(src: str) -> List[Tuple[str, str]]:
    """Find each `export const NAME = <expr>;` and return [(name, expr_text), ...]."""
    blocks: list[tuple[str, str]] = []
    for m in EXPORT_CONST_RE.finditer(src):
        name = m.group(1)
        expr_start = m.end()
        expr_end = scan_expression_end(src, expr_start)
        expr = src[expr_start:expr_end].strip()
        # strip trailing semicolon if present
        if expr.endswith(";"):
            expr = expr[:-1].rstrip()
        blocks.append((name, expr))
    return blocks


def scan_expression_end(src: str, start: int) -> int:
    """Return the index *after* the expression starting at `start`. Walks
    matching brackets while respecting string literals."""
    i = start
    n = len(src)
    depth = 0
    in_str: str | None = None
    while i < n:
        c = src[i]
        if in_str:
            if c == "\\" and i + 1 < n:
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in ('"', "'", "`"):
            in_str = c
            i += 1
            continue
        if c in "[{(":
            depth += 1
        elif c in "]})":
            depth -= 1
            if depth < 0:
                return i
        elif c == ";" and depth == 0:
            return i
        i += 1
    return n


# --- JS expression -> Python expression -----------------------------------

# Quote unquoted object keys: `name: "x"` -> `"name": "x"`.
# An "unquoted key" is an identifier followed by `:` after `{` or `,`,
# where the `:` is not part of `::` or a type annotation (we already stripped
# annotations at the top level).
UNQUOTED_KEY_RE = re.compile(r"([\{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)")


def js_expr_to_py(expr: str) -> str:
    """Convert a JS object/array literal expression to a Python literal."""
    # Replace JS literals.
    expr = re.sub(r"\btrue\b", "True", expr)
    expr = re.sub(r"\bfalse\b", "False", expr)
    expr = re.sub(r"\bnull\b", "None", expr)
    expr = re.sub(r"\bundefined\b", "None", expr)

    # Convert template literals `text` to "text" (no interpolations expected
    # in curriculum data; we'd error out below if any slipped in).
    expr = convert_template_strings(expr)

    # Quote unquoted object keys. Apply repeatedly to handle nesting.
    while True:
        new_expr = UNQUOTED_KEY_RE.sub(r'\1"\2"\3', expr)
        if new_expr == expr:
            break
        expr = new_expr

    return expr


def convert_template_strings(expr: str) -> str:
    out: list[str] = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c == "`":
            j = i + 1
            buf: list[str] = []
            while j < n and expr[j] != "`":
                if expr[j] == "\\" and j + 1 < n:
                    buf.append(expr[j])
                    buf.append(expr[j + 1])
                    j += 2
                    continue
                if expr[j] == "$" and j + 1 < n and expr[j + 1] == "{":
                    raise ValueError(
                        "Template-literal interpolation `${...}` is not supported "
                        "by the transpiler. Curriculum data should be plain strings."
                    )
                buf.append(expr[j])
                j += 1
            text = "".join(buf).replace('"', '\\"')
            out.append('"' + text + '"')
            i = j + 1
            continue
        if c in ('"', "'"):
            quote = c
            j = i + 1
            buf2: list[str] = [c]
            while j < n:
                ch = expr[j]
                buf2.append(ch)
                if ch == "\\" and j + 1 < n:
                    buf2.append(expr[j + 1])
                    j += 2
                    continue
                if ch == quote:
                    j += 1
                    break
                j += 1
            out.append("".join(buf2))
            i = j
            continue
        out.append(c)
        i += 1
    return "".join(out)


# --- Per-file driver ------------------------------------------------------

PY_HEADER = (
    '"""Auto-generated from {ts_path}. DO NOT EDIT.\n\n'
    "Re-run ai-agents/scripts/transpile_curriculum.py to regenerate.\n"
    '"""\n\n'
    "from __future__ import annotations\n\n"
    "from ..types import StrandInfo  # noqa: F401  (kept for IDE type hints)\n\n"
)


def transpile_file(ts_path: Path, py_path: Path, ts_rel: str) -> List[str]:
    src = ts_path.read_text(encoding="utf-8")
    src = strip_comments(src)
    src = inline_mada_helper(src)

    blocks = find_export_blocks(src)
    if not blocks:
        raise RuntimeError(f"No `export const` declarations found in {ts_path}")

    out_lines: list[str] = [PY_HEADER.format(ts_path=ts_rel)]
    names: list[str] = []

    for name, raw_expr in blocks:
        py_expr = js_expr_to_py(raw_expr)
        # Sanity-check: the resulting expression must be a valid Python literal.
        try:
            ast.literal_eval(py_expr)
        except (SyntaxError, ValueError) as exc:
            preview = py_expr[:200].replace("\n", " ")
            raise RuntimeError(
                f"Failed to convert {name} in {ts_path}: {exc}\nPreview: {preview!r}"
            ) from exc
        out_lines.append(f"{name}: list = {py_expr}\n\n")
        names.append(name)

    out_lines.append("__all__ = " + repr(names) + "\n")

    py_path.parent.mkdir(parents=True, exist_ok=True)
    py_path.write_text("".join(out_lines), encoding="utf-8")
    return names


# --- main -----------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--src",
        type=Path,
        default=Path("/tmp/scheme-scribe-ai/src/data/curriculum"),
        help="Path to scheme-scribe-ai/src/data/curriculum",
    )
    parser.add_argument(
        "--dst",
        type=Path,
        default=Path(__file__).resolve().parents[1]
        / "src"
        / "syncsenta_agents"
        / "curriculum",
        help="Destination directory for generated Python modules.",
    )
    args = parser.parse_args()

    src_root: Path = args.src
    dst_root: Path = args.dst
    if not src_root.is_dir():
        print(f"error: source directory not found: {src_root}", file=sys.stderr)
        return 1

    total = 0
    for sub_dir, files in [("lower-primary", LOWER_PRIMARY), ("upper-primary", UPPER_PRIMARY)]:
        py_subdir = "lower_primary" if sub_dir == "lower-primary" else "upper_primary"
        (dst_root / py_subdir).mkdir(parents=True, exist_ok=True)
        # Ensure __init__.py exists for the package.
        init_path = dst_root / py_subdir / "__init__.py"
        if not init_path.exists():
            init_path.write_text("", encoding="utf-8")

        for fn in files:
            ts_path = src_root / sub_dir / fn
            py_path = dst_root / py_subdir / ts_to_py_filename(fn)
            ts_rel = f"{sub_dir}/{fn}"
            names = transpile_file(ts_path, py_path, ts_rel)
            total += len(names)
            print(f"  {ts_rel} -> {py_path.name}: {names}")

    print(f"\nDone. {total} `export const` declarations transpiled.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
