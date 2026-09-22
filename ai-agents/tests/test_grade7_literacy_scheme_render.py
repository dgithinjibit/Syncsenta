"""Offline render tests for Grade 7 AI and Blockchain Literacy schemes."""

from __future__ import annotations

import asyncio
import json
from typing import Optional

from syncsenta_agents.agents.lesson_planning.scheme_generator import SchemeGenerator, SchemeMode


class OfflineSchemeProvider:
    """Small deterministic provider for contract/render tests; never calls a network."""

    def __init__(self) -> None:
        self.prompts: list[tuple[str, str]] = []

    async def generate(self, prompt: str, *, system: Optional[str] = None) -> str:
        self.prompts.append((prompt, system or ""))
        return json.dumps([
            {
                "week": 1,
                "lesson": 1,
                "specificLearningOutcome": (
                    "By the end of the lesson, the learner should be able to:\n"
                    "a) identify the concept in the example\n"
                    "b) practise the concept using a guided task\n"
                    "c) appreciate responsible use of technology"
                ),
                "keyInquiryQuestion": "How can we explain this idea safely?",
                "learningExperiences": "Listen, model, practise independently, and explain to a partner.",
                "learningResources": "Paper cards, pencils, and a teacher-created fictional scenario.",
                "assessmentMethods": "Observation, oral explanation, and a short exit ticket.",
                "reflection": "What became clearer after practice?",
            }
        ])


def _render(grade: str, subject: str, term: str) -> tuple[dict, OfflineSchemeProvider]:
    provider = OfflineSchemeProvider()
    generator = SchemeGenerator(provider)
    result = asyncio.run(
        generator.generate_scheme(
            grade=grade,
            subject=subject,
            term=term,
            mode=SchemeMode.STANDARD,
            teacher_id="offline-test-teacher",
        )
    )
    return result, provider


def test_grade7_ai_scheme_renders_from_registered_strands():
    result, provider = _render("Grade 7", "AI Literacy", "Term 1")
    scheme = result["scheme"]
    rows = scheme["rows"]

    assert scheme["lessons_per_week"] == 2
    assert scheme["curriculum"]["curriculumId"] == "Grade 7|AI Literacy"
    assert scheme["curriculum"]["teacherMediationRequired"] is True
    assert scheme["scheduleAudit"]["status"] == "requires_extension"
    assert scheme["scheduleAudit"]["overrunWeeks"] == 11
    assert rows
    assert all(row["strand"] in {
        "1.0 Foundations of Intelligence",
        "2.0 Data and Representation",
    } for row in rows)
    assert any("Defining Artificial Intelligence" in row["subStrand"] for row in rows)
    assert provider.prompts


def test_grade7_blockchain_scheme_renders_from_registered_strands():
    result, provider = _render("Grade 7", "Blockchain Literacy", "Term 1")
    scheme = result["scheme"]
    rows = scheme["rows"]

    assert scheme["lessons_per_week"] == 2
    assert scheme["curriculum"]["curriculumId"] == "Grade 7|Blockchain Literacy"
    assert scheme["curriculum"]["externalActionsAllowed"] is False
    assert scheme["scheduleAudit"]["status"] == "fits"
    assert scheme["scheduleAudit"]["requiredWeeks"] == 30
    assert rows
    assert all(row["strand"] in {
        "1.0 Data, Records, and Trust",
        "2.0 Blockchain Mechanics",
    } for row in rows)
    assert any("Data Provenance and Claims" in row["subStrand"] for row in rows)
    assert any("fictional" in system.lower() or "blockchain" in system.lower() for _, system in provider.prompts)
