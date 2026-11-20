import csv
import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from generate_dataset import (
    DATASET_SIZE,
    generate_dataset,
    tutoring_decision,
    validate_records,
    write_dataset,
)


class CurriculumEvaluationDatasetTests(unittest.TestCase):
    def test_seeded_generation_has_exact_size_and_stable_rows(self):
        first = generate_dataset(seed=20261120)
        second = generate_dataset(seed=20261120)

        self.assertEqual(len(first), DATASET_SIZE)
        self.assertEqual(first, second)

    def test_dataset_is_valid_and_balanced_across_evaluation_groups(self):
        rows = generate_dataset(seed=17)

        self.assertEqual(validate_records(rows), [])
        for field in ("grade", "subject", "language", "connectivity", "split"):
            self.assertGreaterEqual(
                len({row[field] for row in rows}),
                3,
                f"expected multiple values for {field}",
            )
        self.assertEqual(
            {row["split"] for row in rows},
            {"train", "validation", "test"},
        )
        label_counts = Counter(row["expected_scaffolding"] for row in rows)
        self.assertLessEqual(max(label_counts.values()) - min(label_counts.values()), 1)
        partitions = {}
        for row in rows:
            feature_values = {
                key: row[key]
                for key in (
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
                )
            }
            feature_key = json.dumps(feature_values, sort_keys=True)
            partitions.setdefault(feature_key, set()).add(row["split"])
        self.assertTrue(all(len(splits) == 1 for splits in partitions.values()))

    def test_policy_labels_cover_zero_data_and_threshold_boundaries(self):
        self.assertEqual(
            tutoring_decision(0, 0, 80, 0, 0),
            ("Intensive", "show-conceptual-example", "notice", "low-accuracy"),
        )
        self.assertEqual(
            tutoring_decision(10, 3, 80, 0, 0),
            ("Guided", "ask-guiding-question", "isolate-step", "below-guided-accuracy"),
        )
        self.assertEqual(
            tutoring_decision(10, 7, 80, 0, 0),
            ("Independent", "present-next-challenge", "worked-example", "independent-progress"),
        )

    def test_records_are_synthetic_and_do_not_claim_educator_review(self):
        row = generate_dataset(seed=5)[0]

        self.assertTrue(row["synthetic"])
        self.assertFalse(row["educator_reviewed"])
        self.assertEqual(row["consent_status"], "not_applicable_synthetic")
        self.assertEqual(row["provenance"]["kind"], "deterministic_synthetic_generator")

    def test_jsonl_and_csv_exports_contain_the_same_records(self):
        rows = generate_dataset(num_samples=40, seed=3)
        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)
            write_dataset(rows, output_dir)
            jsonl_rows = [
                json.loads(line)
                for line in (output_dir / "curriculum_policy_evaluation_v1.jsonl")
                .read_text(encoding="utf-8")
                .splitlines()
            ]
            with (output_dir / "curriculum_policy_evaluation_v1.csv").open(
                encoding="utf-8", newline=""
            ) as stream:
                csv_rows = list(csv.DictReader(stream))
                summary = json.loads((output_dir / "summary.json").read_text(encoding="utf-8"))

        self.assertEqual(len(jsonl_rows), len(rows))
        self.assertEqual(len(csv_rows), len(rows))
        self.assertEqual(csv_rows[0]["record_id"], jsonl_rows[0]["record_id"])
        self.assertEqual(csv_rows[0]["expected_scaffolding"], jsonl_rows[0]["expected_scaffolding"])
        self.assertEqual(csv_rows[0]["provenance_kind"], jsonl_rows[0]["provenance"]["kind"])
        self.assertEqual(summary["by_language"], dict(Counter(row["language"] for row in rows)))


if __name__ == "__main__":
    unittest.main()
