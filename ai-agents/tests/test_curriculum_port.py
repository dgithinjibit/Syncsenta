"""Verify the auto-transpiled curriculum data matches the TypeScript source.

The transpiler at scripts/transpile_curriculum.py converts
scheme-scribe-ai/src/data/curriculum/**/*.ts into Python modules under
syncsenta_agents/curriculum/. These tests assert structural equivalence:
strand counts, sub-strand counts, lesson totals, and the registry mapping.

If the upstream curriculum data changes, re-run the transpiler and these
tests should still pass (or be updated to reflect intentional changes).
"""

from __future__ import annotations

import sys
import types
from pathlib import Path

import pytest

# Stub the parent package so we can import syncsenta_agents.curriculum
# WITHOUT triggering syncsenta_agents/__init__.py (which imports the
# orchestrator and pulls in heavy deps like structlog).
ROOT = Path(__file__).resolve().parents[1] / "src"
if "syncsenta_agents" not in sys.modules:
    pkg = types.ModuleType("syncsenta_agents")
    pkg.__path__ = [str(ROOT / "syncsenta_agents")]
    sys.modules["syncsenta_agents"] = pkg
sys.path.insert(0, str(ROOT))

from syncsenta_agents.curriculum import (  # noqa: E402
    GRADES,
    KISWAHILI_SUBJECTS,
    get_hardcoded_strands,
    get_lessons_per_week,
    get_subjects_for_grade,
    get_sub_strands_for_strand,
)
from syncsenta_agents.curriculum.term_mappings import (  # noqa: E402
    get_term_allocation,
    get_term_lesson_count,
    is_lower_primary_kiswahili,
)


# Expected (strands, sub-strands, lessons) per registry key. Values were
# computed by loading the generated Python modules directly; if a future
# upstream change shifts these, regenerate the expected map and update.
EXPECTED_TOTALS = {
    "Grade 1|Creative Activities": (3, 16, 210),
    "Grade 2|Creative Activities": (3, 15, 210),
    "Grade 3|Creative Activities": (3, 15, 210),
    "Grade 1|CRE": (5, 17, 90),
    "Grade 2|CRE": (5, 23, 90),
    "Grade 3|CRE": (5, 22, 90),
    "Grade 1|HRE": (6, 16, 90),
    "Grade 2|HRE": (6, 16, 92),
    "Grade 3|HRE": (6, 16, 90),
    "Grade 1|IRE": (7, 15, 90),
    "Grade 2|IRE": (7, 17, 82),
    "Grade 3|IRE": (7, 17, 90),
    "Grade 1|Kiswahili": (10, 40, 120),
    "Grade 2|Kiswahili": (10, 40, 120),
    "Grade 3|Kiswahili": (10, 40, 120),
    "Grade 1|Environmental Activities": (3, 11, 120),
    "Grade 2|Environmental Activities": (3, 12, 120),
    "Grade 3|Environmental Activities": (3, 12, 120),
    "Grade 1|English Activities": (4, 13, 150),
    "Grade 2|English Activities": (4, 10, 150),
    "Grade 3|English Activities": (4, 10, 150),
    "Grade 1|Mathematics": (3, 11, 150),
    "Grade 2|Mathematics": (3, 14, 161),
    "Grade 3|Mathematics": (3, 14, 166),
    "Grade 4|CRE": (6, 35, 105),
    "Grade 4|Creative Arts": (3, 11, 165),
    "Grade 5|Creative Arts": (3, 12, 165),
    "Grade 4|English": (4, 10, 150),
    "Grade 4|Indigenous Language": (4, 16, 60),
    "Grade 4|Social Studies": (5, 19, 90),
    "Grade 5|English": (4, 12, 150),
    "Grade 5|Indigenous Language": (4, 18, 60),
    "Grade 6|Indigenous Language": (4, 16, 60),
    "Grade 6|English": (4, 10, 150),
    "Grade 4|Agriculture": (4, 13, 120),
    "Grade 6|Agriculture": (4, 10, 120),
    "Grade 4|Science & Technology": (3, 9, 120),
    "Grade 4|Kiswahili": (4, 52, 121),
    "Grade 6|Kiswahili": (4, 53, 120),
    "Grade 5|Mathematics": (4, 19, 150),
    "Grade 6|Mathematics": (4, 16, 150),
    "Grade 6|Social Studies": (5, 22, 89),
}


def _stats(strand_list):
    n_strands = len(strand_list)
    n_substrands = sum(len(s["subStrands"]) for s in strand_list)
    n_lessons = sum(
        ss.get("lessons", 0) for s in strand_list for ss in s["subStrands"]
    )
    return n_strands, n_substrands, n_lessons


@pytest.mark.parametrize("key,expected", sorted(EXPECTED_TOTALS.items()))
def test_grade_subject_counts(key, expected):
    grade, subject = key.split("|", 1)
    strands = get_hardcoded_strands(grade, subject)
    assert strands is not None, f"no data registered for {key}"
    assert _stats(strands) == expected


def test_registry_completeness():
    """Every (strands, ss, lessons) tuple in EXPECTED_TOTALS must round-trip."""
    for key in EXPECTED_TOTALS:
        grade, subject = key.split("|", 1)
        assert get_hardcoded_strands(grade, subject) is not None, key


def test_unknown_combo_returns_none():
    assert get_hardcoded_strands("Grade 9", "Mathematics") is None
    assert get_hardcoded_strands("Grade 1", "Pre-Technical Studies") is None


def test_substrand_lookup():
    subs = get_sub_strands_for_strand("Grade 2", "Mathematics", "1.0 Numbers")
    assert subs is not None
    assert len(subs) >= 1
    assert all("name" in ss and "lessons" in ss for ss in subs)


def test_lessons_per_week():
    assert get_lessons_per_week("Grade 1", "Mathematics") == 5
    assert get_lessons_per_week("Grade 2", "Creative Activities") == 7
    assert get_lessons_per_week("Grade 5", "Kiswahili") == 4
    assert get_lessons_per_week("Grade 7", "Integrated Science") == 4
    assert get_lessons_per_week("Grade 5", "NotARealSubject") == 5


def test_subjects_per_grade_band():
    g1 = get_subjects_for_grade("Grade 1")
    g5 = get_subjects_for_grade("Grade 5")
    g8 = get_subjects_for_grade("Grade 8")
    assert "Environmental Activities" in g1
    assert "Environmental Activities" not in g5
    assert "Pre-Technical Studies" in g8
    assert "Pre-Technical Studies" not in g5


def test_kiswahili_lp_detection():
    assert is_lower_primary_kiswahili("Grade 1", "Kiswahili") is True
    assert is_lower_primary_kiswahili("Grade 4", "Kiswahili") is False
    assert is_lower_primary_kiswahili("Grade 1", "English Activities") is False


def test_kiswahili_term_allocation_returns_mada():
    alloc = get_term_allocation("Grade 1", "Kiswahili", "Term 1")
    assert alloc is not None
    assert len(alloc) >= 1
    # Each Mada has 4 sub-strands.
    for mada in alloc:
        assert len(mada["subStrands"]) == 4


def test_math_term_allocation_splits_numbers():
    """Math Term 1 + Term 2 should cover the Numbers strand; Term 3 should
    cover everything else."""
    t1 = get_term_allocation("Grade 2", "Mathematics", "Term 1")
    t2 = get_term_allocation("Grade 2", "Mathematics", "Term 2")
    t3 = get_term_allocation("Grade 2", "Mathematics", "Term 3")
    assert t1 and t2 and t3
    # T1 and T2 each have one strand: Numbers.
    assert len(t1) == 1 and "Numbers" in t1[0]["strandName"]
    assert len(t2) == 1 and "Numbers" in t2[0]["strandName"]
    # T3 covers the remaining strands (none of which contain "number").
    for a in t3:
        assert "number" not in a["strandName"].lower()


def test_term_lesson_count_matches_sum():
    alloc = get_term_allocation("Grade 4", "English", "Term 1")
    assert alloc is not None
    expected = sum(ss["lessons"] for a in alloc for ss in a["subStrands"])
    assert get_term_lesson_count(alloc) == expected


def test_grades_constant():
    assert GRADES[0] == "Grade 1"
    assert GRADES[-1] == "Grade 12"
    assert len(GRADES) == 12


def test_kiswahili_subjects_constant():
    assert KISWAHILI_SUBJECTS == ["Kiswahili"]
