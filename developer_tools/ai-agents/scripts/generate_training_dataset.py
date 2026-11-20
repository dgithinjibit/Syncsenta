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

TRAINING_DATA_DIR = Path(__file__).resolve().parents[3] / "ai-agents" / "data" / "training"


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


def _system_prompt_for(grade: str, region: str) -> str:
    return (
        f"{generate_system_prompt()} Learner context: {grade}; setting: {region}. "
        "Keep explanations suitable for the learner's grade."
    )


def _make_dialogue(
    grade: str,
    region: str,
    competency: str,
    cultural_context: str,
    question: str,
    response: str,
) -> Dict[str, Any]:
    return {
        "messages": [
            {"role": "system", "content": _system_prompt_for(grade, region)},
            {"role": "user", "content": question},
            {"role": "assistant", "content": response},
        ],
        "metadata": {
            "grade": grade,
            "subject": "Mathematics",
            "competency": f"MATH.{grade.replace('Grade ', 'G')}.{competency}",
            "region": region,
            "cultural_context": cultural_context,
        },
    }


def generate_fraction_dialogue(
    grade: str, region: str, rng: random.Random | None = None
) -> Dict[str, Any]:
    """Generate a bounded fraction example with a verifiable answer."""
    rng = rng or random.Random()
    objects_by_region = {
        "Nairobi": ["chapati", "mango", "book", "tile"],
        "Mombasa": ["coconut", "mango", "chapati", "fish"],
        "rural": ["maize cob", "orange", "seedling", "bean"],
        "universal": ["chapati", "orange", "mango", "watermelon"],
    }
    item = rng.choice(objects_by_region.get(region, objects_by_region["universal"]))
    task = rng.choice(("part_whole", "add_like_denominators", "fraction_of_quantity"))

    if task == "part_whole":
        denominator = rng.randint(2, 12)
        numerator = rng.randint(1, denominator - 1)
        question = (
            f"A {item} is cut into {denominator} equal pieces. "
            f"What fraction is {numerator} pieces?"
        )
        response = (
            f"The denominator counts all {denominator} equal pieces, and the "
            f"numerator counts the {numerator} selected pieces. The fraction is "
            f"{numerator}/{denominator}."
        )
    elif task == "add_like_denominators":
        denominator = rng.randint(3, 12)
        first = rng.randint(1, denominator - 2)
        second = rng.randint(1, denominator - first - 1)
        total = first + second
        question = (
            f"You have {first}/{denominator} of a {item} and receive "
            f"{second}/{denominator} more. How much do you have altogether?"
        )
        response = (
            f"The pieces have the same size, so add the numerators and keep the "
            f"denominator: {first}/{denominator} + {second}/{denominator} = "
            f"{total}/{denominator}."
        )
    else:
        denominator = rng.randint(2, 10)
        numerator = rng.randint(1, denominator)
        groups = rng.randint(2, 12)
        total_items = denominator * groups
        result = numerator * groups
        question = (
            f"What is {numerator}/{denominator} of {total_items} pieces of {item}?"
        )
        response = (
            f"First divide {total_items} by {denominator} to find one part: "
            f"{total_items} ÷ {denominator} = {groups}. Then take {numerator} "
            f"parts: {groups} × {numerator} = {result}. So {numerator}/"
            f"{denominator} of {total_items} is {result}."
        )

    return _make_dialogue(
        grade, region, "FRACTIONS", "fraction_reasoning", question, response
    )


def generate_money_dialogue(
    grade: str, region: str, rng: random.Random | None = None
) -> Dict[str, Any]:
    """Generate a bounded money example with a verifiable answer."""
    rng = rng or random.Random()
    item = rng.choice(["mandazi", "mango", "vegetables", "maize", "bus fare"])
    task = rng.choice(("multiplication", "spending", "change"))

    if task == "multiplication":
        unit_cost = rng.randint(2, 100) * 10
        quantity = rng.randint(2, 12)
        total = unit_cost * quantity
        question = (
            f"At a market, {item} costs {unit_cost} shillings each. "
            f"How much do {quantity} cost?"
        )
        response = (
            f"Multiply the price by the number of items: {unit_cost} × "
            f"{quantity} = {total} shillings."
        )
    elif task == "spending":
        balance = rng.randint(2, 100) * 50
        spent = rng.randint(1, balance // 50 - 1) * 50
        remaining = balance - spent
        question = (
            f"My M-Pesa balance is {balance} shillings. I spend {spent} "
            "shillings. How much remains?"
        )
        response = (
            f"Subtract the amount spent from the starting balance: {balance} - "
            f"{spent} = {remaining} shillings remain."
        )
    else:
        amount_given = rng.randint(2, 100) * 50
        cost = rng.randint(1, amount_given // 10 - 1) * 10
        change = amount_given - cost
        question = (
            f"I pay {amount_given} shillings for {item} costing {cost} shillings. "
            "How much change should I receive?"
        )
        response = (
            f"Subtract the cost from the amount paid: {amount_given} - {cost} "
            f"= {change} shillings change."
        )

    return _make_dialogue(
        grade, region, "MONEY", "market_calculation", question, response
    )


def generate_measurement_dialogue(
    grade: str, region: str, rng: random.Random | None = None
) -> Dict[str, Any]:
    """Generate a bounded measurement example with a verifiable answer."""
    rng = rng or random.Random()
    contexts = {
        "rural": "shamba",
        "Nairobi": "room",
        "Mombasa": "plot",
        "universal": "classroom"
    }
    
    context = contexts.get(region, "classroom")
    
    task = rng.choice(("area", "perimeter", "conversion"))

    if task == "area":
        length = rng.randint(2, 40)
        width = rng.randint(2, 30)
        area = length * width
        question = (
            f"A rectangular {context} is {length} m long and {width} m wide. "
            "What is its area?"
        )
        response = (
            f"Area is length × width: {length} × {width} = {area} square metres."
        )
    elif task == "perimeter":
        length = rng.randint(2, 40)
        width = rng.randint(2, 30)
        perimeter = 2 * (length + width)
        question = (
            f"A rectangular {context} is {length} m long and {width} m wide. "
            "How far is it around the edge?"
        )
        response = (
            f"Add all four sides: {length} + {width} + {length} + {width} "
            f"= {perimeter} m. The perimeter is {perimeter} metres."
        )
    else:
        direction = rng.choice(("metres_to_centimetres", "centimetres_to_metres"))
        if direction == "metres_to_centimetres":
            metres = rng.randint(1, 100)
            centimetres = metres * 100
            question = f"How many centimetres are there in {metres} metres?"
            response = (
                f"One metre is 100 centimetres, so multiply by 100: {metres} × "
                f"100 = {centimetres} cm."
            )
        else:
            centimetres = rng.randint(1, 100) * 100
            metres = centimetres // 100
            question = f"How many metres are there in {centimetres} centimetres?"
            response = (
                f"One metre is 100 centimetres, so divide by 100: {centimetres} "
                f"÷ 100 = {metres} m."
            )

    return _make_dialogue(
        grade, region, "MEASUREMENT", f"measurement_{task}", question, response
    )


def generate_dataset(num_samples: int = 1000, seed: int = 42) -> List[Dict[str, Any]]:
    """Generate a complete training dataset."""
    dataset = []
    rng = random.Random(seed)
    grades = ["Grade 4", "Grade 5", "Grade 6"]
    regions = ["Nairobi", "Mombasa", "rural", "universal"]
    
    generators = [
        generate_fraction_dialogue,
        generate_money_dialogue,
        generate_measurement_dialogue,
    ]
    
    for _ in range(num_samples):
        grade = rng.choice(grades)
        region = rng.choice(regions)
        generator = rng.choice(generators)
        
        dialogue = generator(grade, region, rng)
        dataset.append(dialogue)
    
    return dataset


def save_dataset(dataset: List[Dict[str, Any]], output_path: str | Path):
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
    output_path = TRAINING_DATA_DIR / "kenya-llm-bench-v2-generated.jsonl"
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
