"""Prepare the Kenya-LLM-Bench-v2 dataset for model training.

This script:
1. Combines manual and generated datasets
2. Validates all samples
3. Groups duplicate conversations before splitting into train/validation/test sets
4. Generates statistics and quality reports
5. Exports fine-tuning JSONL and analysis CSV files

"""
import json
import math
import random
from pathlib import Path
from typing import List, Dict, Any
from collections import Counter
import csv

TRAINING_DATA_DIR = Path(__file__).resolve().parents[3] / "ai-agents" / "data" / "training"


def load_jsonl(file_path: str | Path) -> List[Dict[str, Any]]:
    """Load a JSONL file."""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data


def validate_sample(sample: Dict[str, Any]) -> tuple[bool, str]:
    """Validate a single training sample."""
    # Check required fields
    if "messages" not in sample:
        return False, "Missing 'messages' field"
    
    if "metadata" not in sample:
        return False, "Missing 'metadata' field"
    
    # Check messages structure
    messages = sample["messages"]
    if len(messages) != 3:
        return False, f"Expected 3 messages, got {len(messages)}"
    
    roles = [m["role"] for m in messages]
    if roles != ["system", "user", "assistant"]:
        return False, f"Invalid roles: {roles}"
    
    # Check metadata
    metadata = sample["metadata"]
    required_fields = ["grade", "subject", "competency", "region"]
    for field in required_fields:
        if field not in metadata:
            return False, f"Missing metadata field: {field}"
    
    # Validate grade
    valid_grades = ["Grade 4", "Grade 5", "Grade 6"]
    if metadata["grade"] not in valid_grades:
        return False, f"Invalid grade: {metadata['grade']}"
    
    # Validate region
    valid_regions = ["Nairobi", "Mombasa", "rural", "universal"]
    if metadata["region"] not in valid_regions:
        return False, f"Invalid region: {metadata['region']}"
    
    return True, "Valid"


def split_dataset(
    data: List[Dict[str, Any]],
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    seed: int = 42
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Split records while keeping identical conversations in one partition."""
    ratios = (train_ratio, val_ratio, test_ratio)
    if (
        any(not math.isfinite(ratio) or ratio < 0 for ratio in ratios)
        or abs(sum(ratios) - 1.0) >= 1e-6
    ):
        raise ValueError("Split ratios must be non-negative and sum to 1.0")

    groups: Dict[str, List[Dict[str, Any]]] = {}
    for sample in data:
        conversation_key = json.dumps(
            sample["messages"], sort_keys=True, ensure_ascii=False
        )
        groups.setdefault(conversation_key, []).append(sample)

    grouped_samples = list(groups.values())
    rng = random.Random(seed)
    rng.shuffle(grouped_samples)
    grouped_samples.sort(key=len, reverse=True)

    targets = [len(data) * ratio for ratio in ratios]
    split_data: List[List[Dict[str, Any]]] = [[], [], []]
    split_sizes = [0, 0, 0]

    for group in grouped_samples:
        scores = []
        for split_index in range(3):
            candidate_sizes = split_sizes.copy()
            candidate_sizes[split_index] += len(group)
            scores.append(
                sum(
                    (candidate_sizes[index] - targets[index]) ** 2
                    for index in range(3)
                )
            )
        best_score = min(scores)
        best_splits = [
            index for index, score in enumerate(scores) if score == best_score
        ]
        selected_split = rng.choice(best_splits)
        split_data[selected_split].extend(group)
        split_sizes[selected_split] += len(group)

    return split_data[0], split_data[1], split_data[2]


def save_jsonl(data: List[Dict[str, Any]], file_path: str | Path):
    """Save data to JSONL file."""
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')


def generate_statistics(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate dataset statistics."""
    stats = {
        "total_samples": len(data),
        "by_grade": Counter(),
        "by_region": Counter(),
        "by_subject": Counter(),
        "by_competency": Counter(),
        "by_cultural_context": Counter(),
        "by_intervention_type": Counter(),
    }
    
    for sample in data:
        metadata = sample["metadata"]
        stats["by_grade"][metadata["grade"]] += 1
        stats["by_region"][metadata["region"]] += 1
        stats["by_subject"][metadata["subject"]] += 1
        stats["by_competency"][metadata["competency"]] += 1
        
        if "cultural_context" in metadata:
            stats["by_cultural_context"][metadata["cultural_context"]] += 1
        
        if "intervention_type" in metadata:
            stats["by_intervention_type"][metadata["intervention_type"]] += 1
    
    # Convert Counter to dict for JSON serialization
    for key in stats:
        if isinstance(stats[key], Counter):
            stats[key] = dict(stats[key])
    
    return stats


def export_to_csv(data: List[Dict[str, Any]], file_path: str | Path):
    """Export dataset to CSV for analysis."""
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, lineterminator="\n")
        
        # Header
        writer.writerow([
            "grade", "subject", "competency", "region", "cultural_context",
            "intervention_type", "user_message", "assistant_message",
            "system_message"
        ])
        
        # Data
        for sample in data:
            metadata = sample["metadata"]
            messages = {
                message["role"]: message["content"]
                for message in sample["messages"]
            }
            
            writer.writerow([
                metadata.get("grade", ""),
                metadata.get("subject", ""),
                metadata.get("competency", ""),
                metadata.get("region", ""),
                metadata.get("cultural_context", ""),
                metadata.get("intervention_type", ""),
                messages["user"],
                messages["assistant"],
                messages["system"],
            ])


def main():
    """Main function to prepare the dataset."""
    print("🇰🇪 Preparing Kenya-LLM-Bench-v2 for Training")
    print("=" * 60)
    
    # Load datasets
    print("\n📂 Loading datasets...")
    manual_data = load_jsonl(TRAINING_DATA_DIR / "kenya-llm-bench-v2.jsonl")
    generated_data = load_jsonl(
        TRAINING_DATA_DIR / "kenya-llm-bench-v2-generated.jsonl"
    )
    
    print(f"   Manual samples: {len(manual_data)}")
    print(f"   Generated samples: {len(generated_data)}")
    
    # Combine datasets
    all_data = manual_data + generated_data
    print(f"   Total samples: {len(all_data)}")
    
    # Validate all samples
    print("\n✅ Validating samples...")
    valid_samples = []
    invalid_samples = []
    
    for i, sample in enumerate(all_data):
        is_valid, message = validate_sample(sample)
        if is_valid:
            valid_samples.append(sample)
        else:
            invalid_samples.append((i, message))
    
    print(f"   Valid: {len(valid_samples)}")
    print(f"   Invalid: {len(invalid_samples)}")
    
    if invalid_samples:
        print("\n   ⚠️  Invalid samples:")
        for idx, msg in invalid_samples[:5]:  # Show first 5
            print(f"      Sample {idx}: {msg}")
    if not valid_samples:
        raise ValueError("No valid training samples; refusing to write empty outputs")
    
    # Split dataset
    print("\n📊 Splitting dataset...")
    train, val, test = split_dataset(valid_samples, train_ratio=0.8, val_ratio=0.1, test_ratio=0.1)
    
    total_samples = len(valid_samples)
    print(f"   Train: {len(train)} samples ({len(train) / total_samples:.1%})")
    print(f"   Validation: {len(val)} samples ({len(val) / total_samples:.1%})")
    print(f"   Test: {len(test)} samples ({len(test) / total_samples:.1%})")
    
    # Save splits
    print("\n💾 Saving splits...")
    save_jsonl(train, TRAINING_DATA_DIR / "splits/train.jsonl")
    save_jsonl(val, TRAINING_DATA_DIR / "splits/val.jsonl")
    save_jsonl(test, TRAINING_DATA_DIR / "splits/test.jsonl")
    save_jsonl(valid_samples, TRAINING_DATA_DIR / "kenya-llm-bench-v2-complete.jsonl")
    
    print("   ✅ Saved train.jsonl")
    print("   ✅ Saved val.jsonl")
    print("   ✅ Saved test.jsonl")
    print("   ✅ Saved kenya-llm-bench-v2-complete.jsonl")
    
    # Generate statistics
    print("\n📈 Generating statistics...")
    stats = generate_statistics(valid_samples)
    
    # Save statistics
    with (TRAINING_DATA_DIR / "statistics.json").open("w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    
    print("   ✅ Saved statistics.json")
    
    # Print statistics
    print("\n📊 Dataset Statistics:")
    print(f"\n   Total Samples: {stats['total_samples']}")
    
    print("\n   By Grade:")
    for grade, count in sorted(stats['by_grade'].items()):
        pct = (count / stats['total_samples']) * 100
        print(f"      {grade}: {count} ({pct:.1f}%)")
    
    print("\n   By Region:")
    for region, count in sorted(stats['by_region'].items()):
        pct = (count / stats['total_samples']) * 100
        print(f"      {region}: {count} ({pct:.1f}%)")
    
    print("\n   By Subject:")
    for subject, count in sorted(stats['by_subject'].items()):
        pct = (count / stats['total_samples']) * 100
        print(f"      {subject}: {count} ({pct:.1f}%)")
    
    print("\n   Top 10 Competencies:")
    top_competencies = sorted(stats['by_competency'].items(), key=lambda x: x[1], reverse=True)[:10]
    for comp, count in top_competencies:
        print(f"      {comp}: {count}")
    
    if stats['by_cultural_context']:
        print("\n   By Cultural Context:")
        for context, count in sorted(stats['by_cultural_context'].items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"      {context}: {count}")
    
    if stats['by_intervention_type']:
        print("\n   By Intervention Type:")
        for intervention, count in sorted(stats['by_intervention_type'].items()):
            print(f"      {intervention}: {count}")
    
    # Export to CSV
    print("\n📄 Exporting to CSV...")
    export_to_csv(
        valid_samples, TRAINING_DATA_DIR / "kenya-llm-bench-v2-complete.csv"
    )
    for split_name, split_data in (("train", train), ("val", val), ("test", test)):
        export_to_csv(split_data, TRAINING_DATA_DIR / "splits" / f"{split_name}.csv")
    print("   ✅ Saved kenya-llm-bench-v2-complete.csv")
    
    print("\n✨ Dataset preparation complete!")
    print("\n💡 Next steps:")
    print("   1. Review statistics.json for data distribution")
    print("   2. Use splits/train.jsonl for fine-tuning")
    print("   3. Use splits/val.jsonl for validation during training")
    print("   4. Use splits/test.jsonl for final evaluation")
    print("\nDataset files are prepared; model training has not been run.")
    print("No model-training or evaluation runner is checked in.")


if __name__ == "__main__":
    main()
