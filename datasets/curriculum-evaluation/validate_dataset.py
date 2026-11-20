#!/usr/bin/env python3
"""Validate the checked-in synthetic curriculum policy evaluation dataset."""

from __future__ import annotations

import json
from pathlib import Path

from generate_dataset import DATASET_SIZE, validate_records


ROOT = Path(__file__).resolve().parent
DATASET = ROOT / "curriculum_policy_evaluation_v1.jsonl"


def main() -> int:
    rows = [json.loads(line) for line in DATASET.read_text(encoding="utf-8").splitlines() if line.strip()]
    errors = validate_records(rows)
    if len(rows) != DATASET_SIZE:
        errors.append(f"expected {DATASET_SIZE} rows, found {len(rows)}")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"validated {len(rows)} synthetic records; labels, provenance, and privacy flags checked")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
