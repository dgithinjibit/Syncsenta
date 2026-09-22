from syncsenta_agents.curriculum import (
    AI_BLOCKCHAIN_PROGRESSION,
    AI_LITERACY_VERSION,
    get_hardcoded_strands,
    get_lessons_per_week,
    get_subjects_for_grade,
)


def test_grade6_ai_pack_is_registered_and_versioned():
    strands = get_hardcoded_strands("Grade 6", "AI")

    assert strands is not None
    assert AI_LITERACY_VERSION == "2026-09-22.grade6.lovable-import.v1"
    assert len(strands) == 5
    assert strands[0]["name"] == "1.0 Foundations of Intelligence"
    assert strands[-1]["name"] == "5.0 Ethics, Society and AI Policy"


def test_grade6_ai_pack_has_66_lessons_and_is_two_lessons_per_week():
    strands = get_hardcoded_strands("Grade 6", "AI")

    assert strands is not None
    assert sum(sub["lessons"] for strand in strands for sub in strand["subStrands"]) == 66
    assert get_lessons_per_week("Grade 6", "AI") == 2
    assert "AI" in get_subjects_for_grade("Grade 6")


def test_progression_hardens_without_external_actions():
    grade6 = AI_BLOCKCHAIN_PROGRESSION["Grade 6"]
    junior = AI_BLOCKCHAIN_PROGRESSION["Grade 7-9"]

    assert grade6["requires_teacher_mediation"] is True
    assert grade6["external_actions"] is False
    assert junior["ai_level"] != grade6["ai_level"]
    assert junior["blockchain_level"] != grade6["blockchain_level"]
    assert "real_wallets" in junior["prohibited"]
