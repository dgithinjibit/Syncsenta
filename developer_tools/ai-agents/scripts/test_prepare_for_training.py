import csv
import re
import random
import tempfile
import unittest
from pathlib import Path

from generate_training_dataset import (
    generate_dataset,
    generate_fraction_dialogue,
    generate_measurement_dialogue,
    generate_money_dialogue,
)
from prepare_for_training import export_to_csv, generate_statistics, split_dataset


def sample(user_message: str, assistant_message: str, grade: str) -> dict:
    return {
        "messages": [
            {"role": "system", "content": "Tutor"},
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_message},
        ],
        "metadata": {
            "grade": grade,
            "subject": "Mathematics",
            "competency": "MATH.FRACTIONS",
            "region": "Nairobi",
        },
    }


class PrepareForTrainingTests(unittest.TestCase):
    def test_duplicate_conversations_stay_in_one_split(self):
        duplicated = [sample("What is 1/2?", "One half.", "Grade 4") for _ in range(12)]
        distinct = [
            sample(f"Question {index}", f"Answer {index}", "Grade 5")
            for index in range(12)
        ]

        splits = split_dataset(duplicated + distinct, seed=7)
        duplicate_membership = [
            index
            for index, split in enumerate(splits)
            if any(row["messages"][1]["content"] == "What is 1/2?" for row in split)
        ]

        self.assertEqual(len(duplicate_membership), 1)

    def test_split_does_not_mutate_input_order(self):
        rows = [sample(f"Question {index}", f"Answer {index}", "Grade 4") for index in range(9)]
        original = list(rows)

        split_dataset(rows, seed=11)

        self.assertEqual(rows, original)

    def test_statistics_report_exact_duplicate_conversations(self):
        rows = [
            sample("What is 1/2?", "One half.", "Grade 4"),
            sample("What is 1/2?", "One half.", "Grade 4"),
            sample("What is 1/3?", "One third.", "Grade 4"),
        ]

        stats = generate_statistics(rows)

        self.assertEqual(stats["unique_conversations"], 2)
        self.assertEqual(stats["duplicate_rows"], 1)

    def test_seeded_generation_is_reproducible(self):
        self.assertEqual(
            generate_dataset(num_samples=25, seed=23),
            generate_dataset(num_samples=25, seed=23),
        )

    def test_generated_dialogues_have_substantial_unique_conversation_count(self):
        rows = generate_dataset(num_samples=1000, seed=23)
        conversations = {
            tuple((message["role"], message["content"]) for message in row["messages"])
            for row in rows
        }

        self.assertGreater(len(conversations), 500)

    def test_generated_numeric_examples_have_correct_arithmetic(self):
        rng = random.Random(31)
        rows = [
            generate_money_dialogue("Grade 5", "Nairobi", rng)
            for _ in range(200)
        ] + [
            generate_measurement_dialogue("Grade 5", "rural", rng)
            for _ in range(200)
        ]
        equations = []
        for row in rows:
            response = row["messages"][2]["content"]
            equations.extend(
                (int(left), operation, int(right), int(result))
                for left, operation, right, result in re.findall(
                    r"(\d+)\s*([×-])\s*(\d+)\s*=\s*(\d+)", response
                )
            )

        self.assertGreater(len(equations), 100)
        for left, operation, right, result in equations:
            expected = left * right if operation == "×" else left - right
            self.assertEqual(result, expected)

    def test_fraction_generation_uses_selected_grade_and_region_context(self):
        row = generate_fraction_dialogue("Grade 6", "Mombasa", random.Random(4))

        self.assertIn("Grade 6", row["messages"][0]["content"])
        self.assertIn("Mombasa", row["messages"][0]["content"])

    def test_csv_export_preserves_system_prompt(self):
        row = sample("What is 1/2?", "One half.", "Grade 4")
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "dataset.csv"

            export_to_csv([row], str(output))

            self.assertNotIn(b"\r\n", output.read_bytes())
            with output.open(encoding="utf-8", newline="") as stream:
                exported = next(csv.DictReader(stream))

        self.assertEqual(exported["system_message"], "Tutor")
        self.assertEqual(exported["user_message"], "What is 1/2?")
        self.assertEqual(exported["assistant_message"], "One half.")


if __name__ == "__main__":
    unittest.main()
