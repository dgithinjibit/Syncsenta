"""Demo: Neuro-Symbolic Pedagogical Reasoning in Action

This script demonstrates how the neuro-symbolic engine provides
explainable, adaptive tutoring decisions.
"""

import asyncio
from datetime import datetime

from syncsenta_agents.reasoning.pedagogical_rules import PedagogicalRuleEngine
from syncsenta_agents.reasoning.knowledge_tracer import NeuralSymbolicKnowledgeTracer
from syncsenta_agents.reasoning.misconception_detector import MisconceptionDetector
from syncsenta_agents.agents.tutoring import TutoringAgent


def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def demo_pedagogical_rules():
    """Demonstrate pedagogical rule evaluation."""
    print_section("DEMO 1: Pedagogical Rule Engine")
    
    engine = PedagogicalRuleEngine()
    
    # Scenario 1: Frustrated student
    print("Scenario 1: Student showing signs of frustration")
    print("-" * 60)
    telemetry_frustrated = {
        "erasure_count": 5,
        "dwell_time_seconds": 75,
        "attempt_count": 4
    }
    print(f"Telemetry: {telemetry_frustrated}")
    
    decision = engine.evaluate(telemetry_frustrated)
    print(f"\n✓ Fired Rules: {[r.rule_id for r in decision.fired_rules]}")
    print(f"✓ Recommended Action: {decision.recommended_action}")
    print(f"✓ Scaffolding Level: {decision.scaffolding_level.value}")
    print(f"✓ Confidence: {decision.confidence:.2f}")
    print(f"✓ Explanation: {decision.explanation}")
    
    # Scenario 2: Student in flow state
    print("\n\nScenario 2: Student in flow state (mastery)")
    print("-" * 60)
    telemetry_flow = {
        "first_attempt_correct": True,
        "time_to_solution_seconds": 22
    }
    print(f"Telemetry: {telemetry_flow}")
    
    decision = engine.evaluate(telemetry_flow)
    print(f"\n✓ Fired Rules: {[r.rule_id for r in decision.fired_rules]}")
    print(f"✓ Recommended Action: {decision.recommended_action}")
    print(f"✓ Scaffolding Level: {decision.scaffolding_level.value}")
    print(f"✓ Confidence: {decision.confidence:.2f}")
    print(f"✓ Explanation: {decision.explanation}")


def demo_knowledge_tracing():
    """Demonstrate neuro-symbolic knowledge tracing."""
    print_section("DEMO 2: Neuro-Symbolic Knowledge Tracing")
    
    tracer = NeuralSymbolicKnowledgeTracer()
    
    # Scenario: Student with improving performance
    print("Scenario: Student learning fractions over time")
    print("-" * 60)
    
    interaction_history = [
        {"correct": False, "time_seconds": 60, "attempt_count": 3},
        {"correct": True, "time_seconds": 45, "attempt_count": 2},
        {"correct": True, "time_seconds": 30, "attempt_count": 1},
        {"correct": True, "time_seconds": 25, "attempt_count": 1},
    ]
    
    telemetry = {
        "erasure_count": 1,
        "dwell_time_seconds": 30
    }
    
    print("Interaction History:")
    for i, interaction in enumerate(interaction_history, 1):
        print(f"  {i}. Correct: {interaction['correct']}, "
              f"Time: {interaction['time_seconds']}s, "
              f"Attempts: {interaction['attempt_count']}")
    
    estimate = tracer.estimate_mastery(
        student_id="demo_student",
        competency="MATH.G4.FRACTIONS",
        interaction_history=interaction_history,
        telemetry=telemetry
    )
    
    print(f"\n✓ Mastery Score: {estimate.mastery_score:.2f} (0.0 = struggling, 1.0 = mastered)")
    print(f"✓ Confidence: {estimate.confidence:.2f}")
    print(f"✓ Neural Contribution: {estimate.neural_contribution:.2f}")
    print(f"✓ Symbolic Contribution: {estimate.symbolic_contribution:.2f}")
    print(f"\n✓ Evidence:")
    for evidence in estimate.evidence:
        print(f"  • {evidence}")
    
    # Get trend
    trend = tracer.get_mastery_trend("demo_student", "MATH.G4.FRACTIONS")
    print(f"\n✓ Mastery Trend: {trend}")


def demo_misconception_detection():
    """Demonstrate misconception detection."""
    print_section("DEMO 3: Misconception Detection")
    
    detector = MisconceptionDetector()
    
    # Scenario: Student confusing numerator and denominator
    print("Scenario: Student struggling with fraction concepts")
    print("-" * 60)
    
    telemetry = {
        "error_pattern": "inverted_fraction",
        "erasure_count": 4
    }
    
    interaction_history = [
        {"correct": False, "error_type": "inverted_fraction"},
        {"correct": False, "error_type": "inverted_fraction"},
        {"correct": False, "error_type": "swapped_values"}
    ]
    
    print(f"Telemetry: {telemetry}")
    print(f"Error Pattern: Repeated 'inverted_fraction' errors")
    
    misconceptions = detector.detect(
        competency="MATH.FRACTIONS",
        interaction_history=interaction_history,
        telemetry=telemetry
    )
    
    print(f"\n✓ Detected {len(misconceptions)} misconception(s):\n")
    
    for i, m in enumerate(misconceptions, 1):
        print(f"{i}. {m.description}")
        print(f"   Type: {m.misconception_type.value}")
        print(f"   Confidence: {m.confidence:.2f}")
        print(f"   Severity: {m.severity}")
        print(f"   Evidence:")
        for evidence in m.evidence:
            print(f"     • {evidence}")
        
        # Get remediation strategy
        strategy = detector.get_remediation_strategy(m)
        print(f"   Remediation Strategy: {strategy['strategy']}")
        print(f"   Recommended Activities:")
        for activity in strategy['recommended_activities']:
            print(f"     • {activity}")
        print()


async def demo_integrated_tutoring():
    """Demonstrate integrated tutoring with neuro-symbolic reasoning."""
    print_section("DEMO 4: Integrated Tutoring (Full Pipeline)")
    
    agent = TutoringAgent()
    
    # Scenario: Student asking for help with fractions
    print("Scenario: Student asks 'How do I add 1/2 + 1/4?'")
    print("-" * 60)
    
    context = {
        "grade": "Grade 4",
        "subject": "Mathematics",
        "student_id": "demo_student",
        "competency": "MATH.G4.FRACTIONS",
        "telemetry": {
            "erasure_count": 3,
            "dwell_time_seconds": 55,
            "attempt_count": 2,
            "error_pattern": "adds_numerators_and_denominators"
        },
        "interaction_history": [
            {"correct": False, "time_seconds": 50, "attempt_count": 2, 
             "error_type": "adds_numerators_and_denominators"},
            {"correct": False, "time_seconds": 45, "attempt_count": 2,
             "error_type": "adds_numerators_and_denominators"}
        ]
    }
    
    print("Student Context:")
    print(f"  Grade: {context['grade']}")
    print(f"  Subject: {context['subject']}")
    print(f"  Competency: {context['competency']}")
    print(f"  Erasures: {context['telemetry']['erasure_count']}")
    print(f"  Time on task: {context['telemetry']['dwell_time_seconds']}s")
    print(f"  Previous attempts: {len(context['interaction_history'])} (both incorrect)")
    
    result = await agent.execute_task(
        "How do I add 1/2 + 1/4?",
        context
    )
    
    print("\n" + "="*60)
    print("TUTORING RESPONSE")
    print("="*60)
    print(f"\n{result['response']}\n")
    
    print("="*60)
    print("EXPLAINABILITY METADATA (Teacher Dashboard)")
    print("="*60)
    
    print(f"\n✓ Scaffolding Level: {result['scaffolding_level']}")
    print(f"✓ Recommended Action: {result['recommended_action']}")
    
    if result['mastery_score']:
        print(f"✓ Mastery Score: {result['mastery_score']:.2f}")
        print(f"✓ Mastery Confidence: {result['mastery_confidence']:.2f}")
    
    print(f"\n✓ Fired Pedagogical Rules:")
    for rule in result['fired_rules']:
        print(f"  • {rule['rule_id']}: {rule['name']}")
        print(f"    Explanation: {rule['explanation']}")
        print(f"    Confidence: {rule['confidence']:.2f}")
    
    if result['detected_misconceptions']:
        print(f"\n✓ Detected Misconceptions:")
        for m in result['detected_misconceptions']:
            print(f"  • {m['description']}")
            print(f"    Type: {m['type']}")
            print(f"    Confidence: {m['confidence']:.2f}")
            print(f"    Remediation: {m['remediation']}")
    
    print(f"\n✓ Overall Explanation:")
    print(f"  {result['explanation']}")


async def main():
    """Run all demos."""
    print("\n" + "="*60)
    print("  NEURO-SYMBOLIC PEDAGOGICAL REASONING DEMO")
    print("  SyncSenta Adaptive Learning Ecosystem")
    print("="*60)
    
    # Run demos
    demo_pedagogical_rules()
    demo_knowledge_tracing()
    demo_misconception_detection()
    await demo_integrated_tutoring()
    
    print("\n" + "="*60)
    print("  DEMO COMPLETE")
    print("="*60)
    print("\nKey Takeaways:")
    print("1. Pedagogical rules provide explainable decisions")
    print("2. Neuro-symbolic fusion combines neural + symbolic reasoning")
    print("3. Misconception detection is evidence-based")
    print("4. Teachers get 'Why this hint?' transparency")
    print("5. All decisions are auditable for compliance")
    print("\nThis is your competitive advantage over MagicSchool/Synthesis/DreamBox!")
    print()


if __name__ == "__main__":
    asyncio.run(main())
