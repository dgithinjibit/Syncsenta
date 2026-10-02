"""Prepare the Kenya-LLM-Bench-v2 dataset for model training.

This script:
1. Combines manual and generated datasets
2. Validates all samples
3. Splits into train/validation/test sets
4. Generates statistics and quality reports
5. Exports in multiple formats (JSONL, CSV, Parquet)
"""

import json
import random
from pathlib import Path
from typing import List, Dict, Any
from collections import Counter
import csv


def load_jsonl(file_path: str) -> List[Dict[str, Any]]:
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
    """Split dataset into train/validation/test sets."""
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, "Ratios must sum to 1.0"
    
    random.seed(seed)
    random.shuffle(data)
    
    n = len(data)
    train_end = int(n * train_ratio)
    val_end = train_end + int(n * val_ratio)
    
    train = data[:train_end]
    val = data[train_end:val_end]
    test = data[val_end:]
    
    return train, val, test


def save_jsonl(data: List[Dict[str, Any]], file_path: str):
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


def export_to_csv(data: List[Dict[str, Any]], file_path: str):
    """Export dataset to CSV for analysis."""
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            "grade", "subject", "competency", "region", "cultural_context",
            "intervention_type", "user_message", "assistant_message"
        ])
        
        # Data
        for sample in data:
            metadata = sample["metadata"]
            messages = sample["messages"]
            
            writer.writerow([
                metadata.get("grade", ""),
                metadata.get("subject", ""),
                metadata.get("competency", ""),
                metadata.get("region", ""),
                metadata.get("cultural_context", ""),
                metadata.get("intervention_type", ""),
                messages[1]["content"],  # user message
                messages[2]["content"],  # assistant message
            ])


def main():
    """Main function to prepare the dataset."""
    print("🇰🇪 Preparing Kenya-LLM-Bench-v2 for Training")
    print("=" * 60)
    
    # Load datasets
    print("\n📂 Loading datasets...")
    manual_data = load_jsonl("data/training/kenya-llm-bench-v2.jsonl")
    generated_data = load_jsonl("data/training/kenya-llm-bench-v2-generated.jsonl")
    
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
    
    # Split dataset
    print("\n📊 Splitting dataset...")
    train, val, test = split_dataset(valid_samples, train_ratio=0.8, val_ratio=0.1, test_ratio=0.1)
    
    print(f"   Train: {len(train)} samples (80%)")
    print(f"   Validation: {len(val)} samples (10%)")
    print(f"   Test: {len(test)} samples (10%)")
    
    # Save splits
    print("\n💾 Saving splits...")
    save_jsonl(train, "data/training/splits/train.jsonl")
    save_jsonl(val, "data/training/splits/val.jsonl")
    save_jsonl(test, "data/training/splits/test.jsonl")
    save_jsonl(valid_samples, "data/training/kenya-llm-bench-v2-complete.jsonl")
    
    print("   ✅ Saved train.jsonl")
    print("   ✅ Saved val.jsonl")
    print("   ✅ Saved test.jsonl")
    print("   ✅ Saved kenya-llm-bench-v2-complete.jsonl")
    
    # Generate statistics
    print("\n📈 Generating statistics...")
    stats = generate_statistics(valid_samples)
    
    # Save statistics
    with open("data/training/statistics.json", 'w') as f:
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
    export_to_csv(valid_samples, "data/training/kenya-llm-bench-v2-complete.csv")
    print("   ✅ Saved kenya-llm-bench-v2-complete.csv")
    
    print("\n✨ Dataset preparation complete!")
    print("\n💡 Next steps:")
    print("   1. Review statistics.json for data distribution")
    print("   2. Use splits/train.jsonl for fine-tuning")
    print("   3. Use splits/val.jsonl for validation during training")
    print("   4. Use splits/test.jsonl for final evaluation")
    print("\n📚 Training commands:")
    print("   # With Hugging Face Transformers:")
    print("   python scripts/train_llama.py --train_file data/training/splits/train.jsonl")
    print("\n   # With Groq API (testing):")
    print("   python scripts/test_with_groq.py --test_file data/training/splits/test.jsonl")


if __name__ == "__main__":
    main()
