import pytest

from syncsenta_agents.agents.lesson_planning.scheme_generator import SchemeGenerator, SchemeMode
from syncsenta_agents.core.exceptions import AgentError
from syncsenta_agents.curriculum.literacy_validation import validate_literacy_scheme_rows


def _safe_row():
    return {
        "specificLearningOutcome": "Explain the concept and apply it to a fictional example.",
        "keyInquiryQuestion": "What evidence supports our explanation?",
        "learningExperiences": "Listen to a teacher model, complete guided practice, retrieve the idea, and complete an independent transfer task.",
        "learningResources": "Paper cards and a teacher-created fictional scenario.",
        "assessmentMethods": "Observation, mastery check, and exit ticket.",
        "reflection": "Reflect on what became clearer and what to practise next.",
    }


def test_safe_fictional_rows_pass_literacy_validation():
    validate_literacy_scheme_rows([_safe_row()], grade="Grade 6", subject="Blockchain Literacy")


def test_prohibited_wallet_content_is_rejected():
    row = _safe_row()
    row["learningExperiences"] += " Never connect a wallet or enter a seed phrase."

    with pytest.raises(AgentError, match="prohibited content"):
        validate_literacy_scheme_rows([row], grade="Grade 7", subject="Blockchain Literacy")


def test_missing_retrieval_or_transfer_pattern_is_rejected():
    row = _safe_row()
    row["learningExperiences"] = "Listen to the teacher model and complete guided practice."

    with pytest.raises(AgentError, match="retrieval"):
        validate_literacy_scheme_rows([row], grade="Grade 7", subject="AI Literacy")
