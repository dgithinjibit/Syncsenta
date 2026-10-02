"""Generate comprehensive training dataset for SyncSenta.

This script creates culturally-relevant training data based on:
1. CBC curriculum structure
2. Kenyan cultural context (matatu, shamba, M-Pesa, etc.)
3. Common student misconceptions
4. Teacher intervention patterns
5. Regional variations (Nairobi, Mombasa, rural areas)

Output: JSONL format compatible with fine-tuning Llama, GPT, or other LLMs
"""

import json
import random
from typing import List, Dict, Any
from pathlib import Path


# Cultural contexts by region
CULTURAL_CONTEXTS = {
    "Nairobi": ["matatu", "M-Pesa", "traffic", "supermarket", "boda boda", "CBD", "estates"],
    "Mombasa": ["ferry", "beach", "port", "coconut", "dhow", "maize meal", "fish market"],
    "rural": ["shamba", "livestock", "harvest", "borehole", "market day", "planting season"],
    "universal": ["ugali", "chapati", "mandazi", "sukuma wiki", "shillings", "school", "family"]
}

# Common Kenyan examples for math concepts
KENYAN_EXAMPLES = {
    "money": ["shillings", "M-Pesa", "market", "fare", "change", "savings"],
    "food": ["ugali", "chapati", "mandazi", "sukuma wiki", "githeri", "unga"],
    "transport": ["matatu", "boda boda", "bus", "ferry", "bicycle"],
    "agriculture": ["shamba", "maize", "beans", "harvest", "planting", "livestock"],
    "measurement": ["jerrycan", "debe", "sack", "bundle", "heap"],
}

# CBC Mathematics curriculum structure
CURRICULUM_STRUCTURE = {
    "Grade 4": {
        "Numbers": ["Whole Numbers", "Addition", "Subtraction", "Multiplication", "Division", "Fractions"],
        "Measurement": ["Length", "Mass", "Capacity", "Time", "Money"],
        "Geometry": ["Lines", "Shapes", "Angles"],
    },
    "Grade 5": {
        "Numbers": ["Whole Numbers", "Fractions", "Decimals", "Percentages", "Ratios"],
        "Measurement": ["Length", "Area", "Perimeter", "Volume", "Mass", "Time", "Money"],
        "Geometry": ["Lines", "Angles", "2D Shapes", "3D Objects"],
        "Data": ["Data Collection", "Bar Graphs", "Pie Charts", "Averages"],
    },
    "Grade 6": {
        "Numbers": ["Integers", "Fractions", "Decimals", "Percentages", "Ratios", "Proportions"],
        "Algebra": ["Simple Equations", "Patterns", "Sequences"],
        "Measurement": ["Area", "Volume", "Capacity", "Mass", "Time"],
        "Geometry": ["Angles", "Triangles", "Circles", "3D Objects"],
        "Data": ["Statistics", "Probability", "Graphs"],
    }
}

# Common misconceptions and corrections
MISCONCEPTIONS = [
    {
        "topic": "Fractions",
        "misconception": "Thinking 1/3 is larger than 1/2 because 3 > 2",
        "correction": "The bigger the denominator, the smaller each piece. 1/2 means 1 out of 2 pieces (bigger), 1/3 means 1 out of 3 pieces (smaller)."
    },
    {
        "topic": "Decimals",
        "misconception": "Thinking 0.5 is smaller than 0.25 because 5 < 25",
        "correction": "Look at place value: 0.5 = 5 tenths, 0.25 = 2 tenths and 5 hundredths. 5 tenths is bigger than 2 tenths."
    },
    {
        "topic": "Area vs Perimeter",
        "misconception": "Confusing area (inside space) with perimeter (distance around)",
        "correction": "Perimeter = walking around the fence. Area = space inside for planting. Different formulas!"
    },
    {
        "topic": "Division",
        "misconception": "Dividing smaller by larger (e.g., 3 ÷ 12 instead of 12 ÷ 3)",
        "correction": "The first number is what you're sharing, the second is how many groups. 12 ÷ 3 means share 12 into 3 groups."
    },
]


def generate_system_prompt() -> str:
    """Generate the system prompt for SyncSenta."""
    return (
        "You are SyncSenta, a culturally-aware Kenyan AI tutor for CBC curriculum. "
        "Use local examples like matatu, shamba, M-Pesa, ugali, and shillings. "
        "Adapt to student's region (Nairobi, Mombasa, rural areas)."
    )


def generate_fraction_dialogue(grade: str, region: str) -> Dict[str, Any]:
    """Generate a dialogue about fractions."""
    cultural_items = CULTURAL_CONTEXTS.get(region, CULTURAL_CONTEXTS["universal"])
    food_item = random.choice(["chapati", "orange", "mango", "watermelon"])
    
    questions = [
        f"What is a fraction?",
        f"How do I add fractions?",
        f"Why do fractions have two numbers?",
        f"What does 1/2 mean?",
    ]
    
    question = random.choice(questions)
    
    # Generate culturally relevant response
    if "add" in question.lower():
        response = (
            f"To add fractions, they need the same denominator (bottom number). "
            f"Think of sharing {food_item} - you can't add 1/2 and 1/4 directly. "
            f"First make them the same: 1/2 = 2/4, then 2/4 + 1/4 = 3/4. "
            f"Like combining pieces of {food_item}!"
        )
    else:
        response = (
            f"A fraction shows part of a whole. If you cut a {food_item} into equal pieces, "
            f"each piece is a fraction. 1/2 means 1 out of 2 equal pieces. "
            f"The bottom number (denominator) tells how many pieces total, "
            f"the top number (numerator) tells how many pieces you have."
        )
    
    return {
        "messages": [
            {"role": "system", "content": generate_system_prompt()},
            {"role": "user", "content": question},
            {"role": "assistant", "content": response}
        ],
        "metadata": {
            "grade": grade,
            "subject": "Mathematics",
            "competency": f"MATH.{grade.replace('Grade ', 'G')}.FRACTIONS",
            "region": region,
            "cultural_context": "food_sharing"
        }
    }


def generate_money_dialogue(grade: str, region: str) -> Dict[str, Any]:
    """Generate a dialogue about money and calculations."""
    amounts = [50, 100, 150, 200, 500, 1000]
    items = ["mandazi", "unga", "sukuma wiki", "maize", "fare"]
    
    amount1 = random.choice(amounts)
    amount2 = random.choice([a for a in amounts if a != amount1])
    item = random.choice(items)
    
    questions = [
        f"If {item} costs {amount1} shillings, how much for 3?",
        f"I have {amount1} bob and spend {amount2} bob. How much left?",
        f"How do I calculate change from {amount1} shillings?",
    ]
    
    question = random.choice(questions)
    
    if "3" in question:
        answer = amount1 * 3
        response = (
            f"Multiply the cost by the quantity: {amount1} × 3 = {answer} shillings. "
            f"This is useful at the market or when buying multiple items. "
            f"You can also add: {amount1} + {amount1} + {amount1} = {answer} bob."
        )
    elif "spend" in question:
        answer = amount1 - amount2
        response = (
            f"Subtract what you spend from what you have: {amount1} - {amount2} = {answer} shillings left. "
            f"This is like M-Pesa - you check your balance before and after sending money."
        )
    else:
        response = (
            f"Change = Amount given - Cost of item. If you buy something for 80 bob "
            f"and give {amount1} bob, change = {amount1} - 80 = {amount1 - 80} shillings. "
            f"Always count your change at the shop!"
        )
    
    return {
        "messages": [
            {"role": "system", "content": generate_system_prompt()},
            {"role": "user", "content": question},
            {"role": "assistant", "content": response}
        ],
        "metadata": {
            "grade": grade,
            "subject": "Mathematics",
            "competency": f"MATH.{grade.replace('Grade ', 'G')}.MONEY",
            "region": region,
            "cultural_context": "market_shopping"
        }
    }


def generate_measurement_dialogue(grade: str, region: str) -> Dict[str, Any]:
    """Generate a dialogue about measurement."""
    contexts = {
        "rural": "shamba",
        "Nairobi": "room",
        "Mombasa": "plot",
        "universal": "classroom"
    }
    
    context = contexts.get(region, "classroom")
    
    questions = [
        f"How do I measure the area of my {context}?",
        f"What's the difference between area and perimeter?",
        f"How do I convert meters to centimeters?",
    ]
    
    question = random.choice(questions)
    
    if "area" in question.lower() and "perimeter" not in question.lower():
        response = (
            f"Area measures the space inside. For a rectangle {context}, "
            f"multiply length × width. If your {context} is 10m long and 5m wide, "
            f"area = 10 × 5 = 50 square meters. This tells you how much space you have "
            f"for {'planting' if region == 'rural' else 'furniture'}."
        )
    elif "perimeter" in question.lower():
        response = (
            f"PERIMETER = distance around (like walking around the fence). "
            f"AREA = space inside (like the ground for {'planting' if region == 'rural' else 'walking'}). "
            f"For a rectangle: Perimeter = 2(length + width), Area = length × width. "
            f"Different formulas for different purposes!"
        )
    else:
        response = (
            f"1 meter = 100 centimeters. To convert: multiply by 100. "
            f"Example: 3 meters = 3 × 100 = 300 cm. "
            f"Think like money: 1 shilling = 100 cents. Same idea! "
            f"To go back (cm to m), divide by 100."
        )
    
    return {
        "messages": [
            {"role": "system", "content": generate_system_prompt()},
            {"role": "user", "content": question},
            {"role": "assistant", "content": response}
        ],
        "metadata": {
            "grade": grade,
            "subject": "Mathematics",
            "competency": f"MATH.{grade.replace('Grade ', 'G')}.MEASUREMENT",
            "region": region,
            "cultural_context": "land_measurement" if region == "rural" else "measurement"
        }
    }


def generate_dataset(num_samples: int = 1000) -> List[Dict[str, Any]]:
    """Generate a complete training dataset."""
    dataset = []
    grades = ["Grade 4", "Grade 5", "Grade 6"]
    regions = ["Nairobi", "Mombasa", "rural", "universal"]
    
    generators = [
        generate_fraction_dialogue,
        generate_money_dialogue,
        generate_measurement_dialogue,
    ]
    
    for _ in range(num_samples):
        grade = random.choice(grades)
        region = random.choice(regions)
        generator = random.choice(generators)
        
        dialogue = generator(grade, region)
        dataset.append(dialogue)
    
    return dataset


def save_dataset(dataset: List[Dict[str, Any]], output_path: str):
    """Save dataset in JSONL format."""
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in dataset:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    print(f"✅ Generated {len(dataset)} training samples")
    print(f"📁 Saved to: {output_path}")


def main():
    """Main function to generate and save the dataset."""
    print("🇰🇪 Generating Kenya-LLM-Bench-v2 Training Dataset...")
    print("=" * 60)
    
    # Generate dataset
    dataset = generate_dataset(num_samples=1000)
    
    # Save to file
    output_path = "ai-agents/data/training/kenya-llm-bench-v2-generated.jsonl"
    save_dataset(dataset, output_path)
    
    # Print statistics
    print("\n📊 Dataset Statistics:")
    print(f"   Total samples: {len(dataset)}")
    
    # Count by grade
    grade_counts = {}
    for item in dataset:
        grade = item["metadata"]["grade"]
        grade_counts[grade] = grade_counts.get(grade, 0) + 1
    
    print("\n   By Grade:")
    for grade, count in sorted(grade_counts.items()):
        print(f"      {grade}: {count} samples")
    
    # Count by region
    region_counts = {}
    for item in dataset:
        region = item["metadata"]["region"]
        region_counts[region] = region_counts.get(region, 0) + 1
    
    print("\n   By Region:")
    for region, count in sorted(region_counts.items()):
        print(f"      {region}: {count} samples")
    
    print("\n✨ Dataset generation complete!")
    print(f"\n💡 Next steps:")
    print(f"   1. Review the generated data: {output_path}")
    print(f"   2. Combine with manual examples: kenya-llm-bench-v2.jsonl")
    print(f"   3. Use for fine-tuning Llama 3.1 or other models")
    print(f"   4. Test with Groq API or local inference")


if __name__ == "__main__":
    main()
