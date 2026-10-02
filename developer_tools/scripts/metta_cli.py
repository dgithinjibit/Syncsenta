"""Run a MeTTa source file and optionally evaluate one expression."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from hyperon import MeTTa


def print_results(results: list[list[object]]) -> bool:
    printed = False
    for result in results:
        if result:
            print(" ".join(str(atom) for atom in result))
            printed = True
    return printed


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a MeTTa source file.")
    parser.add_argument("file", type=Path, help="MeTTa source file to load")
    parser.add_argument(
        "expression",
        nargs="?",
        help="optional expression to evaluate after loading the file",
    )
    args = parser.parse_args()

    try:
        source = args.file.read_text(encoding="utf-8")
        metta = MeTTa()
        file_results = metta.run(source)

        if args.expression is None:
            if not print_results(file_results):
                print(f"Loaded {args.file} (no query results).")
            return 0

        expression = args.expression.removeprefix("!").strip()
        query_results = metta.run(chr(33) + expression)
        if not print_results(query_results):
            print("No results.")
        return 0
    except Exception as exc:
        print(f"metta: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())