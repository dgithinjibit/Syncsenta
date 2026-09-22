"""Deterministic stub LLM for offline demos / mobile / no-Ollama setups.

Activated by SYNCSENTA_OFFLINE_DEMO=1 when starting the FastAPI server.
Routes by system prompt to canned, CBC-flavoured JSON so the student UI
flow is fully exercisable without a running model server.
"""

from __future__ import annotations

import json
import random
from typing import Any, Dict


_SAMPLE_BANK: Dict[str, Dict[str, Any]] = {
    "fractions": {
        "title": "Mathematics — Fractions",
        "competency": "MATH.NUMBERS.FRACTIONS",
        "citation": "KICD CBC Mathematics Strand 2.1 — Fractions",
        "questions": [
            {
                "question": "What is 1/2 + 1/2?",
                "question_type": "multiple_choice",
                "options": ["1/4", "3/4", "1", "2"],
                "correct_answer": "1",
                "difficulty": "easy",
                "points": 1,
            },
            {
                "question": "1/4 is greater than 1/2.",
                "question_type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "False",
                "difficulty": "easy",
                "points": 1,
            },
            {
                "question": "Mama bought 6 mandazis and shared them equally between 3 children. How many mandazis did each child get?",
                "question_type": "multiple_choice",
                "options": ["1", "2", "3", "6"],
                "correct_answer": "2",
                "difficulty": "medium",
                "points": 1,
            },
            {
                "question": "Explain how you would share 3 chapatis equally between 4 friends.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Cut each chapati into 4 equal parts and give each friend 3 of those parts (3/4 of a chapati).",
                "difficulty": "medium",
                "points": 2,
                "rubric": ["accuracy", "explanation", "uses fractions"],
            },
            {
                "question": "Which fraction is bigger: 2/3 or 1/2?",
                "question_type": "multiple_choice",
                "options": ["2/3", "1/2", "They are equal", "Cannot tell"],
                "correct_answer": "2/3",
                "difficulty": "medium",
                "points": 1,
            },
        ],
    },
    "default": {
        "title": "General Knowledge",
        "competency": "GENERAL.KNOWLEDGE",
        "citation": "KICD CBC General Knowledge",
        "questions": [
            {
                "question": "Which is the capital city of Kenya?",
                "question_type": "multiple_choice",
                "options": ["Mombasa", "Nairobi", "Kisumu", "Nakuru"],
                "correct_answer": "Nairobi",
                "difficulty": "easy",
                "points": 1,
            },
            {
                "question": "Mount Kenya is the tallest mountain in Africa.",
                "question_type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "False",
                "difficulty": "easy",
                "points": 1,
            },
            {
                "question": "Briefly describe one Kenyan cultural celebration you know.",
                "question_type": "short_answer",
                "options": [],
                "correct_answer": "Examples include Mashujaa Day, Madaraka Day, or Jamhuri Day.",
                "difficulty": "medium",
                "points": 2,
                "rubric": ["accuracy", "specificity"],
            },
        ],
    },
}


def _pick_topic(prompt: str) -> str:
    text = prompt.lower()
    for key in _SAMPLE_BANK:
        if key != "default" and key in text:
            return key
    return "default"


class DemoStubLLM:
    """Routes by system prompt and produces canned JSON. Stable for demos."""

    def __init__(self, *, seed: int = 7):
        self._rng = random.Random(seed)

    async def generate(self, prompt: str, *, system: str | None = None) -> str:
        s = (system or "").lower()

        if "quiz generator" in s:
            return json.dumps(self._make_quiz(prompt))
        if "marking examiner" in s:
            return json.dumps(self._grade_short_answer(prompt))
        if "feedback coach" in s:
            return json.dumps(self._coach_feedback(prompt))
        if "tutoring agent" in s:
            return self._tutor_reply(prompt)

        return json.dumps({"response": "ok"})

    def _tutor_reply(self, prompt: str) -> str:
        """Plain-prose canned tutoring reply for offline demos."""
        text = prompt.lower()
        if "fraction" in text:
            return (
                "A fraction shows part of a whole. If you cut a chapati into 4 "
                "equal slices and eat 1, you have eaten 1/4 of it. The bottom "
                "number tells you how many equal parts there are; the top "
                "number tells you how many you have. Try drawing it on paper — "
                "what fraction is left if you eat 2 slices?"
            )
        if "photosynthesis" in text or "plant" in text:
            return (
                "Plants make their own food using sunlight, water from the "
                "soil, and carbon dioxide from the air. This happens in the "
                "green parts of the leaf. The food they make is sugar, and "
                "they release oxygen as a leftover. That is why trees keep "
                "the air around us fresh."
            )
        return (
            "Great question! Let's think it through together. First, can you "
            "tell me what you already know about this topic? That way we can "
            "build on it step by step."
        )

    # ---- generators -----------------------------------------------------

    def _make_quiz(self, prompt: str) -> Dict[str, Any]:
        topic = _pick_topic(prompt)
        bank = _SAMPLE_BANK[topic]
        # respect num_questions from prompt if present
        n = 5
        for line in prompt.splitlines():
            if "Generate" in line and "questions" in line:
                for tok in line.split():
                    if tok.isdigit():
                        n = max(1, min(int(tok), len(bank["questions"])))
                        break

        chosen = list(bank["questions"][:n])
        for q in chosen:
            q["competency"] = bank["competency"]
            q["cbc_citation"] = bank["citation"]

        return {
            "title": bank["title"],
            "competencies": [bank["competency"]],
            "cbc_citations": [bank["citation"]],
            "questions": chosen,
        }

    def _grade_short_answer(self, prompt: str) -> Dict[str, Any]:
        # Crude heuristic: longer answers get better rubric scores
        student_line = ""
        for line in prompt.splitlines():
            if line.startswith("Student answer:"):
                student_line = line.replace("Student answer:", "").strip()
                break

        length = len(student_line)
        if length == 0:
            return {
                "rubric_scores": {"accuracy": 0.0, "explanation": 0.0},
                "points_earned": 0,
                "correct": False,
                "feedback": "No answer provided. Try writing one full sentence.",
            }
        if length < 20:
            return {
                "rubric_scores": {"accuracy": 0.4, "explanation": 0.2},
                "points_earned": 1,
                "correct": False,
                "feedback": "Good start — try giving a fuller explanation with an example.",
            }
        return {
            "rubric_scores": {"accuracy": 0.9, "explanation": 0.8},
            "points_earned": 2,
            "correct": True,
            "feedback": "Well explained with a clear example. Keep it up!",
        }

    def _coach_feedback(self, prompt: str) -> Dict[str, Any]:
        # Pull the percentage out of the prompt if we can
        pct = 0.0
        for token in prompt.split():
            if token.endswith("%"):
                try:
                    pct = float(token.rstrip("%"))
                    break
                except ValueError:
                    pass

        if pct >= 80:
            return {
                "overall_feedback": f"Excellent work — {pct}% shows strong mastery. Keep stretching yourself!",
                "next_steps": [
                    "Try a harder quiz on the same topic",
                    "Teach a friend how you solved one of these",
                    "Move to the next CBC strand",
                ],
            }
        if pct >= 50:
            return {
                "overall_feedback": f"Good effort — {pct}%. You're approaching expectations; a little more practice and you'll be solid.",
                "next_steps": [
                    "Review the questions you missed",
                    "Practise 5 more problems on the weak topic",
                    "Ask your teacher for one worked example",
                ],
            }
        return {
            "overall_feedback": f"Keep going — {pct}% means there's room to grow. Don't give up; revisit the basics first.",
            "next_steps": [
                "Re-read the lesson notes for this topic",
                "Watch a short video on the concept",
                "Try 3 easy practice problems first, then come back",
            ],
        }
