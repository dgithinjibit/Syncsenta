import csv
import tempfile
import unittest
from pathlib import Path

from generate_training_dataset import generate_dataset
from prepare_for_training import export_to_csv, split_dataset


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

    def test_seeded_generation_is_reproducible(self):
        self.assertEqual(
            generate_dataset(num_samples=25, seed=23),
            generate_dataset(num_samples=25, seed=23),
        )

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
