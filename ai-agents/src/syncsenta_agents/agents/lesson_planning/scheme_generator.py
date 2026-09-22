"""Scheme of Work generator - CBC-compliant term planning.

Generates structured schemes of work aligned with KICD curriculum standards,
with support for multiple modes (standard, weekly, term, Mada cycle) and
cultural localization.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol

from ...core.exceptions import AgentError
from ...core.logging import AgentLogger
from ...curriculum import (
    CURRICULUM_REGISTRY,
    get_hardcoded_strands,
    get_lessons_per_week,
    normalize_grade_label,
    normalize_subject_label,
)
from ...curriculum.term_mappings import get_term_allocation
from ..scheme.batched import (
    NoOfficialDataError,
    RateLimitError,
    generate_for_sub_strand,
)


class LLMProvider(Protocol):
    """Protocol for LLM providers."""

    async def generate(self, prompt: str, *, system: str | None = None) -> str:
        ...


class SchemeMode(str, Enum):
    """Scheme generation modes."""

    STANDARD = "standard"  # Full term scheme
    WEEKLY = "weekly"  # Week-by-week breakdown
    TERM = "term"  # Term overview
    MADA = "mada"  # Kiswahili Mada cycle (3-week units)


class SchemeGenerator:
    """Generates CBC-compliant schemes of work.
    
    Provides a focused interface for creating term-long educational plans
    aligned with KICD curriculum standards. Handles strand selection,
    personalization, and row generation while maintaining CBC compliance.
    """

    def __init__(self, llm_provider: LLMProvider) -> None:
        """Initialize scheme generator.
        
        Args:
            llm_provider: LLM provider instance for content generation.
        """
        self.llm_provider = llm_provider
        self.logger = AgentLogger("scheme_generator")

    async def generate_scheme(
        self,
        *,
        grade: str,
        subject: str,
        term: str,
        mode: SchemeMode = SchemeMode.STANDARD,
        teacher_id: str,
        language: str = "english",
        selected_strands: Optional[List[Dict[str, Any]]] = None,
        teacher_inputs: Optional[Dict[str, str]] = None,
        indigenous_language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a scheme of work.
        
        Args:
            grade: Grade level (e.g., "Grade 4").
            subject: Subject name (e.g., "Mathematics").
            term: Term identifier (e.g., "Term 1").
            mode: Scheme generation mode.
            teacher_id: Teacher's unique identifier.
            language: Content language (english or kiswahili).
            selected_strands: Optional teacher-selected strands/sub-strands.
            teacher_inputs: Optional personalization inputs.
            indigenous_language: Optional indigenous language context.
            
        Returns:
            Scheme dictionary with metadata and rows.
            
        Raises:
            AgentError: If generation fails.
        """
        try:
            grade = normalize_grade_label(grade)
            subject = normalize_subject_label(subject)
            self.logger.info(
                "Generating scheme",
                grade=grade,
                subject=subject,
                term=term,
                mode=mode,
            )

            # Lookup curriculum data (optional guardrails, not a gate)
            curriculum_key = f"{grade}|{subject}"
            registry_hit = curriculum_key in CURRICULUM_REGISTRY
            if not registry_hit:
                for alt_key in (
                    f"Grade {grade.split()[-1]}|{subject}",
                    f"{grade.replace('Grade ', 'Grade')}|{subject}",
                ):
                    if alt_key in CURRICULUM_REGISTRY:
                        curriculum_key = alt_key
                        registry_hit = True
                        break

            strands = get_hardcoded_strands(grade, subject) if registry_hit else None
            lessons_per_week = get_lessons_per_week(grade, subject)
            term_allocation = (
                get_term_allocation(grade, subject, term) if registry_hit else None
            )

            if not term_allocation:
                # No curated data — synthesize minimal scaffold
                self.logger.warning(
                    "No curriculum data — generating scheme from scratch",
                    grade=grade,
                    subject=subject,
                    term=term,
                )
                total_lessons = lessons_per_week * 12  # ~12 weeks per term
                per_substrand = max(1, total_lessons // 6)
                term_allocation = [
                    {
                        "strandName": f"{subject} Strand {s}",
                        "subStrands": [
                            {"name": f"Sub-strand {s}.{ss}", "lessons": per_substrand}
                            for ss in range(1, 3)
                        ],
                    }
                    for s in range(1, 4)
                ]

            term_allocation = self._apply_strand_selection(
                term_allocation,
                selected_strands or [],
            )

            if not term_allocation:
                raise AgentError(
                    "The selected strands and sub-strands do not match "
                    "the available curriculum allocation."
                )

            personalization_context = self._build_personalization_context(
                teacher_inputs or {},
                indigenous_language=indigenous_language,
            )

            # Generate scheme rows
            scheme_rows = await self._generate_scheme_rows(
                grade=grade,
                subject=subject,
                term=term,
                strands=strands,
                term_allocation=term_allocation,
                lessons_per_week=lessons_per_week,
                mode=mode,
                language=language,
                personalization_context=personalization_context,
            )

            # Create scheme metadata
            scheme_id = f"scheme_{uuid.uuid4().hex[:12]}"
            scheme = {
                "scheme_id": scheme_id,
                "title": f"{grade} {subject} - {term}",
                "grade": grade,
                "subject": subject,
                "term": term,
                "mode": mode,
                "teacher_id": teacher_id,
                "language": language,
                "created_at": datetime.now().isoformat(),
                "total_weeks": len(scheme_rows),
                "lessons_per_week": lessons_per_week,
                "rows": scheme_rows,
            }

            self.logger.info(
                "Scheme generated",
                scheme_id=scheme_id,
                weeks=len(scheme_rows),
            )

            return {
                "agent": "lesson_architect",
                "action": "generate_scheme",
                "response": (
                    f"Generated {len(scheme_rows)}-lesson scheme for "
                    f"{grade} {subject} ({term})"
                ),
                "scheme": scheme,
            }

        except Exception as exc:
            self.logger.error("Scheme generation failed", error=str(exc))
            raise AgentError(f"Scheme generation failed: {exc}") from exc

    async def _generate_scheme_rows(
        self,
        *,
        grade: str,
        subject: str,
        term: str,
        strands: Optional[List[Dict[str, Any]]],
        term_allocation: List[Dict[str, Any]],
        lessons_per_week: int,
        mode: SchemeMode,
        language: str,
        personalization_context: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Generate individual scheme rows (lesson-by-lesson breakdown)."""
        rows = []
        week_num = 1
        lesson_num = 1

        for strand_dict in term_allocation:
            strand_name = strand_dict.get("strandName") or strand_dict.get("name")
            if not strand_name:
                self.logger.warning(f"No strand name in {strand_dict}")
                continue

            sub_strands_list = strand_dict.get("subStrands", [])
            if not sub_strands_list:
                self.logger.warning(f"No sub-strands for strand '{strand_name}'")
                continue

            for sub_strand in sub_strands_list:
                lesson_rows = await self._generate_lessons_for_substrand(
                    grade=grade,
                    subject=subject,
                    strand=strand_name,
                    sub_strand=sub_strand,
                    week_start=week_num,
                    lesson_start=lesson_num,
                    lessons_per_week=lessons_per_week,
                    language=language,
                    personalization_context=personalization_context,
                )

                rows.extend(lesson_rows)

                # Update counters
                total_lessons_added = len(lesson_rows)
                lesson_num += total_lessons_added

                while lesson_num > lessons_per_week:
                    lesson_num -= lessons_per_week
                    week_num += 1

                if week_num > 13:  # Stop at typical term length
                    break

            if week_num > 13:
                break

        return rows

    async def _generate_lessons_for_substrand(
        self,
        *,
        grade: str,
        subject: str,
        strand: str,
        sub_strand: Dict[str, Any],
        week_start: int,
        lesson_start: int,
        lessons_per_week: int,
        language: str,
        personalization_context: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Generate individual lesson rows for a sub-strand.

        Delegates to the batched generator with all KICD guardrails applied.
        """
        is_kiswahili = "kiswahili" in subject.lower()

        try:
            result = await generate_for_sub_strand(
                self.llm_provider,
                grade=grade,
                subject=subject,
                strand=strand,
                sub_strand=sub_strand,  # type: ignore[arg-type]
                is_sw=is_kiswahili,
                week_start=week_start,
                lessons_per_week=lessons_per_week,
                additional_info=personalization_context,
                allow_synthetic_context=True,
            )
        except RateLimitError as exc:
            self.logger.warning(
                "Rate limited generating sub-strand",
                sub_strand=sub_strand.get("name"),
            )
            raise AgentError(
                "Groq API rate limit reached. Please wait a few minutes and try again."
            ) from exc
        except NoOfficialDataError as exc:
            self.logger.warning(
                "No official KICD data for sub-strand",
                sub_strand=sub_strand.get("name"),
            )
            raise AgentError(str(exc)) from exc

        return result["rows"]

    @staticmethod
    def _apply_strand_selection(
        term_allocation: List[Dict[str, Any]],
        selected_strands: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Keep only teacher-selected official strands/sub-strands when supplied."""
        if not selected_strands:
            return term_allocation

        selected_by_strand: Dict[str, set[str]] = {}
        for item in selected_strands:
            strand = str(item.get("strand", "")).strip()
            sub_strands = item.get("subStrands", item.get("sub_strands", []))
            if not strand or not isinstance(sub_strands, list):
                continue
            selected_by_strand[strand.casefold()] = {
                str(sub_strand).strip().casefold()
                for sub_strand in sub_strands
                if str(sub_strand).strip()
            }

        if not selected_by_strand:
            return term_allocation

        filtered: List[Dict[str, Any]] = []
        for allocation in term_allocation:
            strand_name = str(
                allocation.get("strandName", allocation.get("name", ""))
            ).strip()
            allowed_sub_strands = selected_by_strand.get(strand_name.casefold())
            if allowed_sub_strands is None:
                continue
            matched_sub_strands = [
                sub_strand
                for sub_strand in allocation.get("subStrands", [])
                if str(sub_strand.get("name", "")).strip().casefold()
                in allowed_sub_strands
            ]
            if matched_sub_strands:
                filtered.append(
                    {
                        **allocation,
                        "subStrands": matched_sub_strands,
                    }
                )
        return filtered

    @staticmethod
    def _build_personalization_context(
        teacher_inputs: Dict[str, str],
        *,
        indigenous_language: Optional[str] = None,
    ) -> Optional[str]:
        """Turn optional teacher detail fields into bounded prompt guidance."""
        labels = {
            "keyInquiryQuestions": "Teacher-preferred key inquiry questions",
            "learningOutcomes": "Teacher-preferred learning outcomes",
            "learningExperiences": "Teacher-preferred learning experiences",
            "learningResources": "Available learning resources",
            "assessmentMethods": "Teacher-preferred assessment methods",
        }
        lines = []
        for key, label in labels.items():
            value = teacher_inputs.get(key, "").strip()
            if value:
                lines.append(f"- {label}: {value[:1500]}")

        source_material = teacher_inputs.get("sourceMaterial", "").strip()
        if source_material:
            from ...rag import retrieve_relevant_chunks

            query = " ".join(v for v in teacher_inputs.values() if v)[:1000]
            retrieved = retrieve_relevant_chunks(source_material, query)
            if retrieved:
                lines.append(
                    "- Retrieved source-material excerpts "
                    "(use these as grounded context):\n"
                    + "\n\n".join(retrieved)
                )

        if indigenous_language:
            lines.append(
                f"- Indigenous language context: use culturally respectful "
                f"examples for {indigenous_language}."
            )

        if not lines:
            return None

        return (
            "Teacher personalization guidance (follow it when it does not "
            "conflict with official KICD curriculum):\n" + "\n".join(lines)
        )
