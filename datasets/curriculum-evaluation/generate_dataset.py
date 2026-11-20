#!/usr/bin/env python3
"""Generate a reproducible synthetic curriculum-policy evaluation dataset."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
DATASET_SIZE = 5_000
DEFAULT_SEED = 20261120
POLICY_VERSION = "omega-tutoring-v1"
LICENSE = "CC BY 4.0"
GENERATED_ON = "2026-11-20"

GRADES = ("Grade 6", "Grade 10", "Grade 11", "Grade 12")
LANGUAGES = ("en", "sw", "mixed")
CONNECTIVITY = ("online", "low_bandwidth", "offline")
TARGET_LEVELS = ("Intensive", "Guided", "Independent")
COMPETENCIES = (
    ("mathematics", "fractions", "compare_fractions", "Compare and explain fractional quantities."),
    ("mathematics", "measurement", "measure_length", "Choose and apply a suitable length measure."),
    ("english", "reading", "identify_evidence", "Identify evidence that supports a reading answer."),
    ("english", "writing", "organize_ideas", "Organize ideas into a clear short explanation."),
    ("kiswahili", "kusoma", "uelewa_wa_maandishi", "Use details in a text to explain its meaning."),
    ("kiswahili", "uandishi", "mpangilio_wa_mawazo", "Arrange ideas clearly in a short written response."),
    ("science_technology", "observation", "compare_observations", "Compare observations and support a simple conclusion."),
    ("science_technology", "patterns", "describe_a_pattern", "Describe a pattern and test it with an example."),
    ("social_studies", "maps", "interpret_map_symbols", "Use a map key to interpret a simple map."),
    ("social_studies", "community", "explain_shared_rules", "Explain how a shared rule supports a community activity."),
    ("creative_arts", "pattern", "extend_a_pattern", "Recognize and extend a visual or rhythmic pattern."),
    ("creative_arts", "design", "explain_design_choices", "Explain a design choice in relation to its purpose."),
)

NEXT_ACTIONS = {
    "Intensive": ("show-conceptual-example", "notice"),
    "Guided": ("ask-guiding-question", "isolate-step"),
    "Independent": ("present-next-challenge", "worked-example"),
}

CSV_FIELDS = (
    "record_id",
    "split",
    "grade",
    "subject",
    "strand",
    "competency",
    "learning_objective",
    "language",
    "connectivity",
    "questions_answered",
    "correct_answers",
    "mastery_percent",
    "hints_used",
    "consecutive_wrong",
    "expected_scaffolding",
    "expected_next_action",
    "expected_hint",
    "expected_evidence",
    "expected_delivery_mode",
    "expected_progress_policy",
    "policy_version",
    "label_source",
    "synthetic",
    "pii_present",
    "consent_status",
    "educator_reviewed",
    "curriculum_review_status",
    "provenance_kind",
    "generator_seed",
    "license",
)

REQUIRED_FIELDS = {
    "record_id",
    "split",
    "grade",
    "subject",
    "strand",
    "competency",
    "learning_objective",
    "language",
    "connectivity",
    "questions_answered",
    "correct_answers",
    "mastery_percent",
    "hints_used",
    "consecutive_wrong",
    "expected_scaffolding",
    "expected_next_action",
    "expected_hint",
    "expected_evidence",
    "expected_delivery_mode",
    "expected_progress_policy",
    "policy_version",
    "label_source",
    "synthetic",
    "pii_present",
    "consent_status",
    "educator_reviewed",
    "curriculum_review_status",
    "provenance",
}


def tutoring_decision(
    questions: int,
    correct: int,
    mastery: float,
    hints: int,
    consecutive_wrong: int,
) -> tuple[str, str, str, str]:
    """Mirror the documented omega-tutoring-v1 MeTTa rules for evaluation."""
    if questions < 0 or correct < 0 or correct > questions:
        raise ValueError("correct answers must be between zero and questions answered")
    if not 0 <= mastery <= 100:
        raise ValueError("mastery percent must be between 0 and 100")
    if hints < 0 or consecutive_wrong < 0:
        raise ValueError("hint and consecutive-wrong counts cannot be negative")

    below_intensive_accuracy = questions == 0 or correct * 10 < questions * 3
    below_guided_accuracy = questions > 0 and correct * 10 < questions * 7
    intensive = (
        consecutive_wrong >= 3
        or hints >= 8
        or (mastery < 40 and consecutive_wrong >= 2)
        or below_intensive_accuracy
    )
    guided = (
        mastery < 80
        or below_guided_accuracy
        or hints >= 3
        or consecutive_wrong >= 1
    )
    scaffolding = "Intensive" if intensive else "Guided" if guided else "Independent"

    if consecutive_wrong >= 3:
        evidence = "consecutive-wrong"
    elif hints >= 8:
        evidence = "high-hint-use"
    elif mastery < 40 and consecutive_wrong >= 2:
        evidence = "low-mastery-repeated-errors"
    elif below_intensive_accuracy:
        evidence = "low-accuracy"
    elif mastery < 80:
        evidence = "below-mastery-target"
    elif below_guided_accuracy:
        evidence = "below-guided-accuracy"
    elif hints >= 3:
        evidence = "hint-dependence"
    elif consecutive_wrong >= 1:
        evidence = "repeated-error"
    else:
        evidence = "independent-progress"

    next_action, hint = NEXT_ACTIONS[scaffolding]
    return scaffolding, next_action, hint, evidence


def _delivery_policy(connectivity: str) -> tuple[str, str]:
    if connectivity == "offline":
        return "local_practice_only", "do_not_award_or_sync"
    if connectivity == "low_bandwidth":
        return "text_first_defer_optional_media", "save_when_server_confirms"
    return "standard_connected_interaction", "save_when_server_confirms"


def _split_for(features: dict[str, Any]) -> str:
    key = json.dumps(features, sort_keys=True, separators=(",", ":"))
    bucket = int(hashlib.sha256(key.encode("utf-8")).hexdigest()[:8], 16) % 10
    return "train" if bucket < 8 else "validation" if bucket == 8 else "test"


def generate_dataset(
    num_samples: int = DATASET_SIZE,
    seed: int = DEFAULT_SEED,
) -> list[dict[str, Any]]:
    if num_samples <= 0:
        raise ValueError("num_samples must be positive")

    rng = random.Random(seed)
    rows = []
    seen_features: set[str] = set()
    attempts = 0

    while len(rows) < num_samples:
        attempts += 1
        if attempts > num_samples * 100:
            raise RuntimeError("could not generate enough unique scenario profiles")

        subject, strand, competency, objective = COMPETENCIES[len(rows) % len(COMPETENCIES)]
        grade = GRADES[(len(rows) // len(COMPETENCIES)) % len(GRADES)]
        language = LANGUAGES[(len(rows) // (len(COMPETENCIES) * len(GRADES))) % len(LANGUAGES)]
        connectivity = CONNECTIVITY[
            (len(rows) // (len(COMPETENCIES) * len(GRADES) * len(LANGUAGES)))
            % len(CONNECTIVITY)
        ]
        questions = rng.choice((0, 1, 2, 3, 5, 8, 10, 15, 20))
        correct = rng.randint(0, questions) if questions else 0
        hints = rng.randint(0, 10)
        consecutive_wrong = rng.randint(0, min(4, questions - correct)) if questions > correct else 0
        mastery = rng.choice((0, 20, 39, 40, 59, 60, 79, 80, 89, 90, 100))

        features = {
            "grade": grade,
            "subject": subject,
            "strand": strand,
            "competency": competency,
            "learning_objective": objective,
            "language": language,
            "connectivity": connectivity,
            "questions_answered": questions,
            "correct_answers": correct,
            "mastery_percent": mastery,
            "hints_used": hints,
            "consecutive_wrong": consecutive_wrong,
        }
        scaffolding, next_action, hint, evidence = tutoring_decision(
            questions, correct, mastery, hints, consecutive_wrong
        )
        if scaffolding != TARGET_LEVELS[len(rows) % len(TARGET_LEVELS)]:
            continue

        feature_key = json.dumps(features, sort_keys=True, separators=(",", ":"))
        if feature_key in seen_features:
            continue
        seen_features.add(feature_key)

        delivery_mode, progress_policy = _delivery_policy(connectivity)
        rows.append(
            {
                "record_id": f"synthetic-curriculum-{len(rows) + 1:05d}",
                "split": _split_for(features),
                **features,
                "expected_scaffolding": scaffolding,
                "expected_next_action": next_action,
                "expected_hint": hint,
                "expected_evidence": evidence,
                "expected_delivery_mode": delivery_mode,
                "expected_progress_policy": progress_policy,
                "policy_version": POLICY_VERSION,
                "label_source": "deterministic_metta_policy_mirror",
                "synthetic": True,
                "pii_present": False,
                "consent_status": "not_applicable_synthetic",
                "educator_reviewed": False,
                "curriculum_review_status": "illustrative_mapping_unreviewed",
                "provenance": {
                    "kind": "deterministic_synthetic_generator",
                    "generator": "generate_dataset.py",
                    "seed": seed,
                    "generated_on": GENERATED_ON,
                    "license": LICENSE,
                },
            }
        )

    rng.shuffle(rows)
    return rows


def validate_records(rows: list[dict[str, Any]]) -> list[str]:
    errors = []
    if not rows:
        return ["dataset is empty"]
    if len({row.get("record_id") for row in rows}) != len(rows):
        errors.append("record IDs must be unique")
    for index, row in enumerate(rows, start=1):
        prefix = f"row {index}"
        missing = REQUIRED_FIELDS - row.keys()
        if missing:
            errors.append(f"{prefix} is missing fields: {sorted(missing)}")
            continue
        if row["split"] not in ("train", "validation", "test"):
            errors.append(f"{prefix} has unknown split")
        if row["grade"] not in GRADES or row["language"] not in LANGUAGES:
            errors.append(f"{prefix} has unknown grade or language")
        if row["subject"] not in {item[0] for item in COMPETENCIES}:
            errors.append(f"{prefix} has unknown subject")
        for field in ("questions_answered", "correct_answers", "hints_used", "consecutive_wrong"):
            if type(row[field]) is not int:
                errors.append(f"{prefix} field {field} must be an integer")
        if type(row["mastery_percent"]) not in (int, float):
            errors.append(f"{prefix} mastery_percent must be numeric")
        if row["policy_version"] != POLICY_VERSION:
            errors.append(f"{prefix} has unknown policy version")
        if row["label_source"] != "deterministic_metta_policy_mirror":
            errors.append(f"{prefix} has unknown label source")
        if row.get("synthetic") is not True or row.get("pii_present") is not False:
            errors.append(f"{prefix} must be synthetic and contain no PII")
        if row.get("consent_status") != "not_applicable_synthetic":
            errors.append(f"{prefix} has invalid consent status")
        if row.get("educator_reviewed") is not False:
            errors.append(f"{prefix} must not claim educator review")
        if row.get("curriculum_review_status") != "illustrative_mapping_unreviewed":
            errors.append(f"{prefix} has invalid curriculum review status")
        provenance = row.get("provenance")
        if (
            not isinstance(provenance, dict)
            or provenance.get("kind") != "deterministic_synthetic_generator"
            or provenance.get("generator") != "generate_dataset.py"
            or provenance.get("license") != LICENSE
        ):
            errors.append(f"{prefix} is missing synthetic generator provenance")
        try:
            expected = tutoring_decision(
                row["questions_answered"],
                row["correct_answers"],
                row["mastery_percent"],
                row["hints_used"],
                row["consecutive_wrong"],
            )
        except (KeyError, TypeError, ValueError) as error:
            errors.append(f"{prefix} has invalid policy features: {error}")
            continue
        actual = (
            row.get("expected_scaffolding"),
            row.get("expected_next_action"),
            row.get("expected_hint"),
            row.get("expected_evidence"),
        )
        if actual != expected:
            errors.append(f"{prefix} expected policy labels do not match {POLICY_VERSION}")
        connectivity = row.get("connectivity")
        if connectivity not in CONNECTIVITY:
            errors.append(f"{prefix} has unknown connectivity")
        elif (
            row.get("expected_delivery_mode"),
            row.get("expected_progress_policy"),
        ) != _delivery_policy(connectivity):
            errors.append(f"{prefix} delivery labels do not match connectivity")
    return errors


def write_dataset(rows: list[dict[str, Any]], output_dir: Path = ROOT) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = output_dir / "curriculum_policy_evaluation_v1.jsonl"
    csv_path = output_dir / "curriculum_policy_evaluation_v1.csv"
    with jsonl_path.open("w", encoding="utf-8", newline="\n") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    with csv_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=CSV_FIELDS, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    **{key: value for key, value in row.items() if key != "provenance"},
                    "provenance_kind": row["provenance"]["kind"],
                }
            )

    summary = {
        "records": len(rows),
        "seed": rows[0]["provenance"]["seed"],
        "by_split": dict(sorted(Counter(row["split"] for row in rows).items())),
        "by_grade": dict(sorted(Counter(row["grade"] for row in rows).items())),
        "by_subject": dict(sorted(Counter(row["subject"] for row in rows).items())),
        "by_language": dict(sorted(Counter(row["language"] for row in rows).items())),
        "by_connectivity": dict(sorted(Counter(row["connectivity"] for row in rows).items())),
        "by_scaffolding": dict(sorted(Counter(row["expected_scaffolding"] for row in rows).items())),
    }
    (output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=DATASET_SIZE)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--output-dir", type=Path, default=ROOT)
    args = parser.parse_args()

    rows = generate_dataset(args.count, args.seed)
    errors = validate_records(rows)
    if errors:
        raise SystemExit("\n".join(errors))
    write_dataset(rows, args.output_dir)
    print(f"Wrote {len(rows)} synthetic curriculum evaluation rows to {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
