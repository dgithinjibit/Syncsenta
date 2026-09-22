"""Tests for the ported scheme-scribe-ai guardrail pipeline.

Covers:
- ``extract_json_array`` happy path + truncated-response recovery
- ``normalize_row_keys`` for snake_case + lowercase variants
- ``validate_and_fix_slo`` for English a/b/c and Kiswahili dash format
- ``validate_ksa_structure`` reordering when LLM puts skill verbs in slot a
- ``enforce_week_lesson_numbering`` rollover at lessons_per_week
- ``validate_and_sanitize_rows`` end-to-end against a mocked LLM output
- ``generate_for_sub_strand`` with a fake provider — asserts SchemeRow shape
"""

from __future__ import annotations

import asyncio
from typing import Optional

import pytest

from syncsenta_agents.agents.scheme.batched import (
    LLMProvider,
    generate_for_sub_strand,
)
from syncsenta_agents.agents.scheme.guardrails import (
    enforce_week_lesson_numbering,
    validate_and_fix_slo,
    validate_and_sanitize_rows,
    validate_ksa_structure,
)
from syncsenta_agents.agents.scheme.normalize import (
    extract_json_array,
    normalize_row_keys,
)


SCHEME_ROW_KEYS = {
    "week",
    "lesson",
    "strand",
    "subStrand",
    "specificLearningOutcome",
    "keyInquiryQuestion",
    "learningExperiences",
    "learningResources",
    "assessmentMethods",
    "reflection",
}


class _FakeProvider:
    """Stub LLMProvider returning a canned JSON array."""

    def __init__(self, response: str) -> None:
        self.response = response
        self.calls = 0

    async def generate(self, prompt: str, *, system: Optional[str] = None) -> str:
        self.calls += 1
        return self.response


# ── extract_json_array ────────────────────────────────────────────────────
def test_extract_json_array_strips_markdown_fences():
    raw = '```json\n[{"week": 1, "lesson": 1}]\n```'
    assert extract_json_array(raw) == [{"week": 1, "lesson": 1}]


def test_extract_json_array_recovers_truncated_response():
    raw = '[{"week": 1, "lesson": 1, "strand": "A"}, {"week": 1, "lesson": 2'
    recovered = extract_json_array(raw)
    assert len(recovered) == 1
    assert recovered[0]["strand"] == "A"


def test_extract_json_array_raises_on_no_array():
    with pytest.raises(ValueError):
        extract_json_array("just some prose with no brackets at all")


# ── normalize_row_keys ────────────────────────────────────────────────────
def test_normalize_row_keys_handles_snake_case():
    raw = {
        "week": 2,
        "lesson": "3",
        "specific_learning_outcome": "SLO text",
        "sub_strand": "Sub",
        "key_inquiry_question": "Why?",
        "learning_experiences": "Exp",
        "learning_resources": "Res",
        "assessment_methods": "Asm",
    }
    row = normalize_row_keys(raw)
    assert row["week"] == 2
    assert row["lesson"] == 3
    assert row["specificLearningOutcome"] == "SLO text"
    assert row["subStrand"] == "Sub"
    assert row["keyInquiryQuestion"] == "Why?"
    assert row["learningExperiences"] == "Exp"
    assert row["learningResources"] == "Res"
    assert row["assessmentMethods"] == "Asm"
    assert row["reflection"] == ""


def test_normalize_row_keys_defaults_missing():
    row = normalize_row_keys({"strand": "S"})
    assert row["week"] == 1
    assert row["lesson"] == 1
    assert row["strand"] == "S"
    assert row["specificLearningOutcome"] == ""


# ── validate_and_fix_slo ──────────────────────────────────────────────────
def test_validate_and_fix_slo_inserts_header_when_missing():
    slo = "a) identify\nb) practice\nc) appreciate"
    fixed = validate_and_fix_slo(slo, is_sw=False)
    assert fixed.startswith("By the end of the lesson")
    assert "a) identify" in fixed


def test_validate_and_fix_slo_kiswahili_converts_letters_to_dashes():
    slo = "**Kufikia mwisho wa somo mwanafunzi aweze:**\na) kutambua\nb) kutumia\nc) kuthamini"
    fixed = validate_and_fix_slo(slo, is_sw=True)
    assert "\n-kutambua" in fixed
    assert "\n-kutumia" in fixed
    assert "\na)" not in fixed


def test_validate_and_fix_slo_empty_returns_scaffold():
    assert "By the end of the lesson" in validate_and_fix_slo("", is_sw=False)
    assert "Kufikia mwisho" in validate_and_fix_slo("", is_sw=True)


# ── validate_ksa_structure ────────────────────────────────────────────────
def test_validate_ksa_structure_reorders_misplaced_verbs():
    slo = (
        "By the end of the lesson, the learner should be able to:\n"
        "a) practice counting to 100\n"     # skills verb in K slot
        "b) identify whole numbers\n"        # knowledge verb in S slot
        "c) appreciate numbers in daily life"
    )
    row = {
        "week": 1, "lesson": 1, "strand": "Numbers", "subStrand": "WN",
        "specificLearningOutcome": slo,
        "keyInquiryQuestion": "?", "learningExperiences": "",
        "learningResources": "", "assessmentMethods": "", "reflection": "",
    }
    out = validate_ksa_structure([row], is_sw=False)  # type: ignore[list-item]
    fixed = out[0]["specificLearningOutcome"]
    # K should be in slot a now.
    a_line = fixed.split("\n")[1]  # "a) identify whole numbers"
    assert a_line.startswith("a) identify")
    b_line = fixed.split("\n")[2]
    assert b_line.startswith("b) practice")


def test_validate_ksa_structure_replaces_banned_verbs():
    slo = (
        "By the end of the lesson, the learner should be able to:\n"
        "a) know about numbers\n"
        "b) carry out counting\n"
        "c) appreciate numbers"
    )
    row = {
        "week": 1, "lesson": 1, "strand": "X", "subStrand": "Y",
        "specificLearningOutcome": slo,
        "keyInquiryQuestion": "", "learningExperiences": "",
        "learningResources": "", "assessmentMethods": "", "reflection": "",
    }
    out = validate_ksa_structure([row], is_sw=False)  # type: ignore[list-item]
    fixed = out[0]["specificLearningOutcome"]
    assert "know about" not in fixed.lower()
    assert "carry out" not in fixed.lower()


# ── enforce_week_lesson_numbering ─────────────────────────────────────────
def test_enforce_week_lesson_numbering_rolls_over():
    rows = [
        {  # type: ignore[var-annotated]
            "week": 0, "lesson": 0, "strand": "X", "subStrand": "Y",
            "specificLearningOutcome": "", "keyInquiryQuestion": "",
            "learningExperiences": "", "learningResources": "",
            "assessmentMethods": "", "reflection": "",
        }
        for _ in range(7)
    ]
    out = enforce_week_lesson_numbering(rows, week_start=3, lessons_per_week=3)  # type: ignore[arg-type]
    assert [(r["week"], r["lesson"]) for r in out] == [
        (3, 1), (3, 2), (3, 3),
        (4, 1), (4, 2), (4, 3),
        (5, 1),
    ]


# ── validate_and_sanitize_rows ────────────────────────────────────────────
def test_validate_and_sanitize_rows_emits_complete_scheme_row():
    raw = [
        {
            "week": 99,  # will be overwritten by numbering
            "lesson": 99,
            "strand": "WRONG",  # will be overridden by strand arg
            "sub_strand": "WRONG",
            "specific_learning_outcome": (
                "a) identify shapes\nb) draw shapes\nc) appreciate geometry"
            ),
            "learning_experiences": "",
            "key_inquiry_question": "What is a shape?",
            "learning_resources": "",
            "assessment_methods": "",
        }
    ]
    rows = validate_and_sanitize_rows(
        raw,
        strand="Geometry",
        sub_strand_name="Shapes",
        grade="Grade 2",
        subject="Mathematics",
        week_start=1,
        lessons_per_week=5,
        is_sw=False,
    )
    assert len(rows) == 1
    row = rows[0]
    assert set(row.keys()) == SCHEME_ROW_KEYS
    assert row["week"] == 1
    assert row["lesson"] == 1
    assert row["strand"] == "Geometry"
    assert row["subStrand"] == "Shapes"
    assert row["specificLearningOutcome"].startswith("By the end of the lesson")
    assert "Learner is guided to" in row["learningExperiences"]
    assert "KLB Visionary" in row["learningResources"]
    assert row["assessmentMethods"]  # defaulted, non-empty
    assert "What became clearer" in row["reflection"]


# ── generate_for_sub_strand (end-to-end with fake provider) ───────────────
def test_generate_for_sub_strand_returns_scheme_rows():
    canned = (
        '[\n'
        '  {"week": 1, "lesson": 1, "strand": "Numbers", "subStrand": "WN",\n'
        '   "specificLearningOutcome": "By the end of the lesson, the learner should be able to:\\na) identify whole numbers up to 100\\nb) draw place-value charts\\nc) appreciate numbers in daily life",\n'
        '   "keyInquiryQuestion": "Why are numbers important?",\n'
        '   "learningExperiences": "Learner is guided to:\\na) discuss whole numbers\\nb) count objects\\nc) match numbers to objects\\nd) share favourite number",\n'
        '   "learningResources": "chart",\n'
        '   "assessmentMethods": "oral questions",\n'
        '   "reflection": ""}\n'
        ']'
    )
    provider = _FakeProvider(canned)
    result = asyncio.run(
        generate_for_sub_strand(
            provider,
            grade="Grade 2",
            subject="Mathematics",
            strand="Numbers",
            sub_strand={"name": "Whole Numbers 1-100", "lessons": 1},  # type: ignore[arg-type]
            lessons_per_week=5,
        )
    )
    assert provider.calls == 1
    assert result["weeksUsed"] == 1
    rows = result["rows"]
    assert len(rows) == 1
    assert set(rows[0].keys()) == SCHEME_ROW_KEYS
    assert rows[0]["subStrand"] == "Whole Numbers 1-100"
