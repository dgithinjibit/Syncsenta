"""Curriculum-specific release checks for AI and Blockchain Literacy schemes.

This module does not replace the Rust policy engine. It enforces the authored
literacy contract after ordinary scheme guardrails and before a scheme is
returned to the teacher-facing caller.
"""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from ..core.exceptions import AgentError


_PROHIBITED_TERMS = (
    "password", "pin", "one-time code", "otp", "seed phrase", "private key",
    "wallet", "token", "cryptocurrency", "crypto trading", "real transaction",
    "buy crypto", "trade crypto", "precise location", "identity record",
    "private financial", "unsupervised external ai", "connect an external system",
)
_GRADE6_ADDITIONAL_TERMS = (
    "write code", "programming task", "model building", "train a model",
    "build a model", "create a classifier",
)
_REQUIRED_PATTERNS = {
    "modelling": ("model", "demonstrate", "listen"),
    "guided_practice": ("guided", "practise", "practice"),
    "retrieval": ("retrieval", "retrieve", "recall", "review"),
    "mastery": ("mastery", "master", "check", "exit ticket"),
    "transfer": ("transfer", "apply", "explain to", "independent"),
    "reflection": ("reflection", "reflect", "what became", "what did you learn"),
}
_CONTENT_FIELDS = (
    "specificLearningOutcome", "keyInquiryQuestion", "learningExperiences",
    "learningResources", "assessmentMethods", "reflection",
)


def _content(rows: Iterable[Mapping[str, Any]]) -> str:
    return " ".join(
        str(row.get(field, ""))
        for row in rows
        for field in _CONTENT_FIELDS
    ).lower()


def _has_pattern(content: str, patterns: tuple[str, ...]) -> bool:
    return any(pattern in content for pattern in patterns)


def validate_literacy_scheme_rows(
    rows: list[Mapping[str, Any]], *, grade: str, subject: str
) -> None:
    """Raise AgentError unless literacy rows satisfy the release contract."""
    if subject not in {"AI Literacy", "Blockchain Literacy"}:
        return
    if not rows:
        raise AgentError(f"{grade} {subject} produced no rows for teacher review.")

    content = _content(rows)
    prohibited = [term for term in _PROHIBITED_TERMS if term in content]
    numeric_grade = int(grade.split()[-1])
    if numeric_grade == 6:
        prohibited.extend(term for term in _GRADE6_ADDITIONAL_TERMS if term in content)
    if prohibited:
        terms = ", ".join(sorted(set(prohibited)))
        raise AgentError(
            f"{grade} {subject} failed literacy safety validation: prohibited content {terms}."
        )

    missing = [
        name for name, patterns in _REQUIRED_PATTERNS.items()
        if not _has_pattern(content, patterns)
    ]
    if missing:
        raise AgentError(
            f"{grade} {subject} failed literacy pedagogy validation; missing "
            f"observable patterns: {', '.join(missing)}."
        )
