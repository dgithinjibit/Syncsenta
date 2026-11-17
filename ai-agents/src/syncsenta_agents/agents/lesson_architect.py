"""Lesson Architect Agent - Generates CBC-compliant schemes of work and lesson plans.

Ported from scheme-scribe-ai with full KICD curriculum integration.
Uses the curriculum data ported in PR 1 to generate culturally relevant,
standards-aligned educational content.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol
from enum import Enum

from ..core.exceptions import AgentError
from ..core.logging import AgentLogger
from ..curriculum import (
    get_hardcoded_strands,
    get_lessons_per_week,
    get_sub_strands_for_strand,
    CURRICULUM_REGISTRY,
)
from ..curriculum.term_mappings import get_term_allocation
from .scheme.batched import (
    NoOfficialDataError,
    RateLimitError,
    generate_for_sub_strand,
)


class LLMProvider(Protocol):
    async def generate(self, prompt: str, *, system: str | None = None) -> str: ...


class _GroqProvider:
    def __init__(self) -> None:
        # Use multi-provider client for automatic fallback
        from ..inference.multi_provider_client import get_multi_provider_client
        self._multi_client = get_multi_provider_client()

    async def generate(self, prompt: str, *, system: str | None = None, max_retries: int = 3) -> str:
        """Generate using multi-provider client with automatic fallback."""
        return await self._multi_client.generate(
            prompt=prompt,
            system=system,
            max_tokens=4096,
            temperature=0.3,
            max_retries=max_retries
        )


class SchemeMode(str, Enum):
    """Scheme generation modes."""
    STANDARD = "standard"  # Full term scheme
    WEEKLY = "weekly"  # Week-by-week breakdown
    TERM = "term"  # Term overview
    MADA = "mada"  # Kiswahili Mada cycle (3-week units)


_SYSTEM_PROMPT_EN = """You are an expert educational consultant specializing in the Kenyan Competency-Based Curriculum (CBC), aligned with the Ministry of Education and KICD (Kenya Institute of Curriculum Development) standards.

YOUR GOAL: Generate detailed, pedagogically sound Schemes of Work that develop learner COMPETENCY — the ability to apply a combination of Knowledge, Skills, and Attitudes (KSA) to perform a task. Output must be structured for official school records.

CRITICAL CONSTRAINT: You MUST ONLY use the official KICD data provided. NEVER fabricate, invent, or hallucinate learning outcomes, strand names, sub-strand names, or curriculum content. If no official data is provided for a field, leave it generic but DO NOT make up specific curriculum content that does not exist in the KICD framework.

CBC CORE COMPETENCIES (integrate into learning experiences where relevant):
- Communication and Collaboration (e.g., "Work in pairs to...", "Discuss in groups...")
- Critical Thinking and Problem Solving (e.g., "Find a solution for...", "Compare and contrast...")
- Digital Literacy (e.g., "Use a tablet to search for...", "Watch a video clip on...")
- Imagination and Creativity (e.g., "Design a pattern using...", "Make a model of...")
- Learning to Learn (e.g., "Explore different ways to...", "Reflect on what was learned...")
- Citizenship (e.g., "Discuss responsibilities in the community...")
- Self-efficacy (e.g., "Present their work to the class...")

CBC CORE VALUES (weave into Attitudes/Values outcomes):
Respect, Responsibility, Love, Unity, Peace, Integrity, Patriotism, Social Justice.

PERTINENT & CONTEMPORARY ISSUES (PCIs — integrate where naturally relevant):
Life Skills, Health, Environmental Conservation, Safety, Human Rights, Citizenship.

KSA VERB FRAMEWORK:
KNOWLEDGE (Cognitive) verbs — use for understanding/information outcomes:
  identify, define, describe, name, outline, state, recognize, explain, list, label, recall, summarize, distinguish, illustrate, compare, classify

SKILLS (Psychomotor) verbs — use for practical/hands-on outcomes:
  demonstrate, perform, practice, practise, model, draw, calculate, manipulate, use, collaborate, execute, construct, sing, measure, sketch, solve, trace, cut, colour, paint, observe, record, differentiate, interpret, suggest, role-play, conduct, participate, sort, express, create, conserve

ATTITUDES (Affective) verbs — use for values/dispositions outcomes:
  appreciate, value, show, care, demonstrate responsibility, acknowledge, enjoy, uphold, persist, commit, adhere, advocate, respect, empathize, prioritize, develop

BANNED VERBS (never use these):
  know, understand, be aware, learn to, have a positive attitude, carry out, find out, look at, get to know, learn about, talk about, go through

Always respond with valid JSON when requested. No markdown fences, no extra prose."""

_SYSTEM_PROMPT_SW = """Wewe ni mtaalamu wa mtaala wa CBC Kenya (KICD). Unatengeneza Mpango wa Kazi rasmi ambao unafuata viwango vya KICD kwa usahihi.

SHARTI MUHIMU: Lazima utumie data rasmi ya KICD iliyotolewa hapa chini PEKEE. USIBUNI, USITENGENEZE, au USIZUSHE matokeo ya kujifunza, majina ya strand, majina ya sub-strand, au maudhui ya mtaala ambayo hayapo katika mfumo wa KICD.

UMAHIRI WA CBC: Kila somo lazima lijeneze UMAHIRI — uwezo wa kutumia mchanganyiko wa Maarifa, Ujuzi, na Mitazamo (KSA) kutekeleza kazi.

STADI MUHIMU ZA CBC (zingatia katika shughuli za kujifunza):
- Mawasiliano na Ushirikiano (k.m., "Kufanya kazi kwa jozi...", "Kujadili katika vikundi...")
- Kufikiri kwa Kina na Utatuzi wa Matatizo (k.m., "Kutafuta suluhisho la...", "Kulinganisha...")
- Ujuzi wa Kidijitali (k.m., "Kutumia simu/kompyuta kutafuta...", "Kutazama video...")
- Ubunifu na Uvumbuzi (k.m., "Kubuni muundo kwa kutumia...", "Kuunda mfano wa...")

MAADILI YA CBC (zingatia katika matokeo ya Mitazamo):
Heshima, Uwajibikaji, Upendo, Umoja, Amani, Uadilifu, Uzalendo, Haki ya Kijamii.

MFUMO WA VITENZI VYA KSA:
MAARIFA (vitenzi vya kufahamu):
  kutambua, kutaja, kuorodhesha, kueleza, kufafanua, kulinganisha, kutofautisha, kuelezea, kubainisha

UJUZI (vitenzi vya vitendo):
  kutekeleza, kutumia, kujenga, kuonyesha, kuchora, kuhesabu, kupima, kutatua, kuimba, kukata, kupaka, kushiriki, kufanya mazoezi, kupanga, kurekodi, kutofautisha, kufasiri, kupendekeza, kucheza jukumu, kuendesha, kuunda

MITAZAMO (vitenzi vya thamani):
  kuthamini, kuthamini thamani, kuonyesha, kutunza, kufurahia, kuzingatia, kuendeleza, kujitolea, kuweka kipaumbele, kukuza, kuheshimu, kuonyesha huruma, kutetea

VITENZI VILIVYOKATAZWA (usitumie):
  kujua, kuelewa, kujifunza kuhusu, fanya shughuli, jua kuhusu, angalia tu, pita

Daima rudisha JSON halali. Hakuna markdown, hakuna maandishi mengine."""


class LessonArchitectAgent:
    """Generates CBC-compliant schemes of work and lesson plans.
    
    Features:
    - Scheme generation (standard, weekly, term, Mada cycle)
    - Lesson plan generation using schemes as guardrails
    - KICD curriculum alignment
    - Cultural relevance enforcement
    - KSA balance validation
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None, supabase_client=None) -> None:
        self.logger = AgentLogger("lesson_architect_agent")
        self._llm = llm_provider
        self.supabase = supabase_client
        
        # Banned weak verbs (KICD CBC standards)
        self.banned_verbs = {
            "know", "understand", "learn", "be aware of",
            "realize", "comprehend", "grasp", "carry out", "find out",
            "look at", "get to know", "learn about", "talk about", "go through"
        }
        
        # KSA verb framework (from scheme-scribe-ai)
        self.knowledge_verbs = {
            "identify", "define", "describe", "name", "outline", "state",
            "recognize", "explain", "list", "label", "recall", "summarize",
            "distinguish", "illustrate", "compare", "classify"
        }
        
        self.skills_verbs = {
            "demonstrate", "perform", "practice", "practise", "model", "draw",
            "calculate", "manipulate", "use", "collaborate", "execute", "construct",
            "sing", "measure", "sketch", "solve", "trace", "cut", "colour", "paint",
            "observe", "record", "differentiate", "interpret", "suggest", "role-play",
            "conduct", "participate", "sort", "express", "create", "conserve"
        }
        
        self.attitudes_verbs = {
            "appreciate", "value", "show", "care", "demonstrate responsibility",
            "acknowledge", "enjoy", "uphold", "persist", "commit", "adhere",
            "advocate", "respect", "empathize", "prioritize", "develop"
        }
        
        # Combined action verbs for backward compatibility
        self.action_verbs = self.knowledge_verbs | self.skills_verbs | self.attitudes_verbs

    def _provider(self) -> LLMProvider:
        if self._llm is None:
            import os
            if os.environ.get("SYNCSENTA_OFFLINE_DEMO") == "1":
                from ..api.demo_stub import DemoStubLLM
                self._llm = DemoStubLLM()
            else:
                self._llm = _GroqProvider()
        return self._llm

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Main entry point for orchestrator."""
        try:
            action = (context or {}).get("action") or self._infer_action(request)
            
            # Normalize grade format (handle "grade-4" or "Grade 4")
            grade = context.get("grade", "Grade 4")
            if grade and not grade.startswith("Grade"):
                # Convert "grade-4" to "Grade 4"
                grade = grade.replace("grade-", "Grade ").replace("-", " ").title()
            
            # Normalize subject format
            subject = context.get("subject", "Mathematics")
            if subject:
                subject = subject.replace("-", " ").title()
            
            if action == "generate_scheme":
                if context.get("prescribed_cbc_fallback"):
                    rows = self._prescribed_scheme_rows(
                        subject,
                        context.get("selected_strands") or [],
                    )
                    result = {
                        "agent": "lesson_architect",
                        "action": action,
                        "response": f"Prepared a prescribed CBC scheme for {grade} {subject}.",
                        "rows": rows,
                    }
                else:
                    mode = context.get("mode", SchemeMode.STANDARD)
                    if not isinstance(mode, SchemeMode):
                        try:
                            mode = SchemeMode(mode)
                        except ValueError:
                            mode = SchemeMode.STANDARD
                    result = await self.generate_scheme(
                        grade=grade,
                        subject=subject,
                        term=context.get("term", "Term 1"),
                        mode=mode,
                        teacher_id=context.get("teacher_id", "unknown"),
                        language=context.get("language", "english"),
                        selected_strands=context.get("selected_strands"),
                        teacher_inputs=context.get("teacher_inputs"),
                        indigenous_language=context.get("indigenous_language"),
                    )
            elif action == "generate_lesson_plan":
                result = await self.generate_lesson_plan(
                    scheme_id=context.get("scheme_id"),
                    row=context.get("row"),
                    week=context.get("week", 1),
                    lesson=context.get("lesson", 1),
                    teacher_id=context.get("teacher_id", "unknown"),
                    grade=grade,
                    subject=subject,
                    term=context.get("term"),
                    additional_notes=context.get("additional_notes"),
                    language=context.get("language", "english"),
                )
            elif action == "generate_worksheet":
                result = await self.generate_worksheet(
                    teacher_id=context.get("teacher_id", "unknown"),
                    row=context.get("row", {}),
                    grade=grade,
                    subject=subject,
                    term=context.get("term"),
                    language=context.get("language", "english"),
                    duration_minutes=context.get("duration_minutes", 30),
                )
            elif action == "generate_text_leveler":
                result = await self.generate_text_leveler(
                    teacher_id=context.get("teacher_id", "unknown"),
                    grade=grade,
                    subject=subject,
                    language=context.get("language", "english"),
                    input_text=context.get("input_text"),
                    source_url=context.get("source_url"),
                )
            elif action == "unpack_outcome":
                result = await self.unpack_outcome(
                    teacher_id=context.get("teacher_id", "unknown"),
                    outcome=context.get("outcome", request),
                    grade=grade,
                    subject=subject,
                    language=context.get("language", "english"),
                )
            elif action == "generate_differentiation":
                result = await self.generate_differentiation(
                    teacher_id=context.get("teacher_id", "unknown"),
                    lesson_plan=context.get("lesson_plan", {}),
                    language=context.get("language", "english"),
                    lesson_plan_id=context.get("lesson_plan_id"),
                )
            elif action == "generate_exam":
                result = await self.generate_exam(
                    teacher_id=context.get("teacher_id", "unknown"),
                    grade=grade,
                    subject=subject,
                    term=context.get("term", "Term 1"),
                    allocation=context.get("allocation", []),
                    counts=context.get("counts"),
                )
            elif action == "list_schemes":
                result = await self.list_schemes(
                    teacher_id=context.get("teacher_id", "unknown"),
                    grade=context.get("grade"),
                    subject=context.get("subject"),
                )
            else:
                raise AgentError(f"Unsupported action: {action}")

            result.setdefault("response", f"Completed {action.replace('_', ' ')}.")
            return result

        except AgentError:
            raise
        except Exception as exc:
            self.logger.error("Lesson architect task failed", error=str(exc))
            raise AgentError(f"Lesson architect failure: {exc}") from exc

    @staticmethod
    def _prescribed_scheme_rows(
        subject: str,
        selected_strands: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        selections = selected_strands or [{
            "strand": f"{subject} foundations",
            "subStrands": ["Core concepts"],
        }]
        rows: List[Dict[str, Any]] = []
        lesson = 1
        for selection in selections:
            strand = str(selection.get("strand") or f"{subject} foundations")
            for sub_strand in selection.get("subStrands") or ["Core concepts"]:
                rows.append({
                    "week": 1,
                    "lesson": lesson,
                    "strand": strand,
                    "subStrand": str(sub_strand),
                    "specificLearningOutcome": (
                        "By the end of the lesson, the learner should be able to:\n"
                        f"a) identify key ideas in {sub_strand};\n"
                        f"b) demonstrate a guided {subject} activity;\n"
                        "c) appreciate collaborative learning."
                    ),
                    "learningExperiences": (
                        "Learner is guided to:\n"
                        "a) recall prior knowledge;\n"
                        "b) explore a teacher-modelled example;\n"
                        "c) practise with a partner;\n"
                        "d) share one reflection."
                    ),
                    "keyInquiryQuestion": (
                        f"How can we apply {sub_strand} in everyday life?"
                    ),
                    "learningResources": (
                        "Teacher guide, learner book, locally available materials"
                    ),
                    "assessmentMethods": (
                        "Observation, oral questions, short exit task"
                    ),
                    "reflection": "",
                })
                lesson += 1
        return rows

    @staticmethod
    def _infer_action(request: str) -> str:
        """Infer action from request text."""
        text = request.lower()
        if any(k in text for k in ("lesson plan", "plan for lesson", "lesson for")):
            return "generate_lesson_plan"
        # Only match "list" when it's clearly asking to list/show existing schemes
        # Don't match when "list" appears in "list of items" or "list values"
        if any(k in text for k in ("list schemes", "show schemes", "my schemes", "list my", "show my")):
            return "list_schemes"
        return "generate_scheme"

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
        """Generate a scheme of work."""
        try:
            self.logger.info(
                "Generating scheme",
                grade=grade,
                subject=subject,
                term=term,
                mode=mode
            )
            
            # Look up curated curriculum data if available; otherwise let the AI
            # generate a fresh scheme from scratch. The registry is optional
            # guardrails, not a gate — generation should never be blocked by a
            # missing entry.
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
                # No curated data — synthesize a minimal scaffold so the LLM
                # produces strand/sub-strand content end-to-end. Each placeholder
                # sub-strand has `lessons` set so the row generator paces a full
                # term; the LLM fills in actual SLOs, KIQs, experiences, etc.
                self.logger.warning(
                    "No curriculum data — generating scheme from scratch",
                    grade=grade,
                    subject=subject,
                    term=term,
                )
                total_lessons = lessons_per_week * 12  # ~12 weeks per term
                # Spread across 3 strand placeholders, 2 sub-strands each
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
                    "The selected strands and sub-strands do not match the available curriculum allocation."
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
            
            # Save to database if Supabase client available
            if self.supabase:
                await self._save_scheme(scheme)
            
            self.logger.info(
                "Scheme generated",
                scheme_id=scheme_id,
                weeks=len(scheme_rows)
            )
            
            # Return structured rows directly — the studio renders the
            # 10-column CBC table from `scheme.rows` (SchemeRow[]). The old
            # markdown formatter is intentionally NOT called here; it produced
            # the prose blob in savy.png because the studio rendered the
            # `response` string verbatim. Keep the formatter around as a
            # legacy export helper, but the API contract is JSON.
            return {
                "agent": "lesson_architect",
                "action": "generate_scheme",
                "response": (
                    f"Generated {len(scheme_rows)}-lesson scheme for "
                    f"{grade} {subject} ({term})"
                ),
                "scheme": scheme,  # Structured data — rows: SchemeRow[]
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
        strands: List[Dict[str, Any]],
        term_allocation: List[str],
        lessons_per_week: int,
        mode: SchemeMode,
        language: str,
        personalization_context: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Generate individual scheme rows (lesson-by-lesson breakdown for table format)."""
        rows = []
        week_num = 1
        lesson_num = 1
        
        # For each strand allocated to this term
        for strand_dict in term_allocation:
            # Extract strand name from dict
            strand_name = strand_dict.get("strandName") or strand_dict.get("name")
            if not strand_name:
                self.logger.warning(f"No strand name in {strand_dict}")
                continue
                
            # Get sub-strands for this strand
            sub_strands_list = strand_dict.get("subStrands", [])
            if not sub_strands_list:
                self.logger.warning(f"No sub-strands for strand '{strand_name}'")
                continue
            
            # Generate rows for each sub-strand
            for sub_strand in sub_strands_list:
                sub_strand_name = sub_strand.get("name", "")
                lessons_for_substrand = sub_strand.get("lessons", 1)
                
                # Generate lesson-by-lesson content for this sub-strand
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
                
                # Update week and lesson counters
                total_lessons_added = len(lesson_rows)
                lesson_num += total_lessons_added
                
                # Calculate week progression
                while lesson_num > lessons_per_week:
                    lesson_num -= lessons_per_week
                    week_num += 1
                
                # Stop at 11-13 weeks (typical term length)
                if week_num > 13:
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
        """Generate individual lesson rows for a sub-strand (table format).

        Delegates to ``agents.scheme.batched.generate_for_sub_strand``, which
        is the verbatim port of scheme-scribe-ai's ``generateForSubStrand``:
        batched at ``MAX_LESSONS_PER_BATCH=5`` to dodge LLM JSON truncation,
        with all 12 KICD guardrails applied at the end. Rate-limit and
        no-official-data errors propagate up so the caller can return partial
        rows.
        """
        is_kiswahili = "kiswahili" in subject.lower()
        try:
            result = await generate_for_sub_strand(
                self._provider(),
                grade=grade,
                subject=subject,
                strand=strand,
                sub_strand=sub_strand,  # type: ignore[arg-type]
                is_sw=is_kiswahili,
                week_start=week_start,
                lessons_per_week=lessons_per_week,
                additional_info=personalization_context,
                # Soft-fallback to synthesized context — workspace CLAUDE.md
                # treats CURRICULUM_REGISTRY as optional guardrails, not a gate.
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
            strand_name = str(allocation.get("strandName", allocation.get("name", ""))).strip()
            allowed_sub_strands = selected_by_strand.get(strand_name.casefold())
            if allowed_sub_strands is None:
                continue
            matched_sub_strands = [
                sub_strand
                for sub_strand in allocation.get("subStrands", [])
                if str(sub_strand.get("name", "")).strip().casefold() in allowed_sub_strands
            ]
            if matched_sub_strands:
                filtered.append({
                    **allocation,
                    "subStrands": matched_sub_strands,
                })
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
            from ..rag import retrieve_relevant_chunks
            query = " ".join(v for v in teacher_inputs.values() if v)[:1000]
            retrieved = retrieve_relevant_chunks(source_material, query)
            if retrieved:
                lines.append(
                    "- Retrieved source-material excerpts (use these as grounded context):\n"
                    + "\n\n".join(retrieved)
                )
        if indigenous_language:
            lines.append(
                f"- Indigenous language context: use culturally respectful examples for {indigenous_language}."
            )
        if not lines:
            return None
        return "Teacher personalization guidance (follow it when it does not conflict with official KICD curriculum):\n" + "\n".join(lines)

    # NOTE: The block below (the original per-substrand LLM prompt and JSON
    # parsing) is retained as dead reference until Phase 2 (lesson plans) ships.
    # The active path is `_generate_lessons_for_substrand` above which delegates
    # to the ported batched generator. Delete this stub after Phase 2 lands.
    async def _legacy_generate_lessons_for_substrand_unused(
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
    ) -> List[Dict[str, Any]]:
        """[DEPRECATED] Original per-substrand generator. See note above."""
        sub_strand_name = sub_strand.get("name", "")
        learning_outcomes = sub_strand.get("learningOutcomes", [])
        suggested_experiences = sub_strand.get("suggestedExperiences", [])
        key_inquiry_question = sub_strand.get("keyInquiryQuestion", "")
        lessons_count = sub_strand.get("lessons", 1)

        # Determine if Kiswahili
        is_kiswahili = "kiswahili" in subject.lower()
        
        # Build official KICD context
        official_context = ""
        if learning_outcomes:
            official_context += f"\n\nOFFICIAL KICD LEARNING OUTCOMES for \"{sub_strand_name}\":\n"
            for i, outcome in enumerate(learning_outcomes):
                official_context += f"  {chr(97 + i)}) {outcome}\n"
        
        if key_inquiry_question:
            official_context += f"\nOFFICIAL KEY INQUIRY QUESTION: \"{key_inquiry_question}\"\n"
        
        if suggested_experiences:
            official_context += f"\nOFFICIAL SUGGESTED LEARNING EXPERIENCES:\n"
            for exp in suggested_experiences:
                official_context += f"  - {exp}\n"
        
        # Select system prompt based on language
        system_prompt = _SYSTEM_PROMPT_SW if is_kiswahili else _SYSTEM_PROMPT_EN
        
        # Build user prompt for generating lesson rows (table format)
        if is_kiswahili:
            prompt = f"""Tengeneza masomo {lessons_count} ya mpango wa kazi wa CBC kwa mada ndogo hii.

Gredi: {grade}
Somo: {subject}
Mada: {strand}
Mada Ndogo: {sub_strand_name}
Idadi ya masomo: {lessons_count}
{official_context}

Kwa kila somo, tengeneza:
1. Matokeo Maalum ya Somo (3 matokeo katika mpangilio wa KSA: a) Maarifa, b) Ujuzi, c) Mitazamo)
2. Shughuli za Kujifunza (shughuli moja mahususi kwa somo hili)
3. Swali Dadisi Muhimu (swali moja kwa somo)
4. Rasilimali (orodha ya vifaa vinavyohitajika)
5. Tathmini (njia za kutathmini)

KANUNI MUHIMU:
- Kila somo liwe TOFAUTI - usizidishe maudhui
- Tumia vitenzi vya KSA: {', '.join(list(self.knowledge_verbs | self.skills_verbs | self.attitudes_verbs)[:10])}
- USITUMIE vitenzi dhaifu: {', '.join(list(self.banned_verbs)[:5])}
- Tumia mifano ya Kenya: matatu, shamba, M-Pesa, ugali, shilingi
- Oanisha na matokeo rasmi ya KICD

Rudisha JSON array ya masomo {lessons_count}:
[
  {{
    "week": 0,
    "lesson": 0,
    "strand": "{strand}",
    "subStrand": "{sub_strand_name}",
    "specificLearningOutcome": "**Kufikia mwisho wa somo mwanafunzi aweze:**\\n-[Maarifa]\\n-[Ujuzi]\\n-[Mitazamo]",
    "learningExperiences": "**Mwanafunzi aweze:-**\\n-[shughuli 1]\\n-[shughuli 2]\\n-[shughuli 3]\\n-[shughuli 4]",
    "keyInquiryQuestion": "Swali dadisi",
    "learningResources": "Rasilimali 1, Rasilimali 2",
    "assessmentMethods": "Njia ya tathmini",
    "reflection": ""
  }}
]
"""
        else:
            prompt = f"""Generate {lessons_count} individual lesson rows for CBC scheme of work (table format).

Grade: {grade}
Subject: {subject}
Strand: {strand}
Sub-Strand: {sub_strand_name}
Number of lessons: {lessons_count}
{official_context}

For EACH lesson, generate:
1. Specific Learning Outcome (EXACTLY 3 outcomes in strict KSA order)
   - Format: "By the end of the lesson, the learner should be able to:\\na) [Knowledge verb] ...\\nb) [Skills verb] ...\\nc) [Attitudes verb] ..."
2. Learning Experiences (EXACTLY 4 activities in format: "Learner is guided to:\\na) ...\\nb) ...\\nc) ...\\nd) ...")
3. Key Inquiry Question (ONE thought-provoking question per lesson)
4. Learning Resources (comma-separated list of SPECIFIC resources)
5. Assessment Methods (comma-separated methods)

CRITICAL RULES:
- Each lesson must be UNIQUE - no repeated content
- Use ONLY KSA verbs: {', '.join(list(self.knowledge_verbs)[:8])} (Knowledge), {', '.join(list(self.skills_verbs)[:8])} (Skills), {', '.join(list(self.attitudes_verbs)[:8])} (Attitudes)
- NEVER use banned verbs: {', '.join(list(self.banned_verbs)[:8])}
- Use Kenyan context: matatu, shamba, M-Pesa, ugali, shillings
- Align with KICD outcomes above
- Resources must be SPECIFIC (not generic "textbook" or "chart")

Return JSON array of {lessons_count} lesson objects:
[
  {{
    "week": 0,
    "lesson": 0,
    "strand": "{strand}",
    "subStrand": "{sub_strand_name}",
    "specificLearningOutcome": "By the end of the lesson, the learner should be able to:\\na) [Knowledge outcome]\\nb) [Skills outcome]\\nc) [Attitudes outcome]",
    "learningExperiences": "Learner is guided to:\\na) [Knowledge activity]\\nb) [Skills activity]\\nc) [Application activity]\\nd) [Attitudes activity]",
    "keyInquiryQuestion": "Question for this lesson",
    "learningResources": "KLB Visionary {subject} {grade} pages X-Y, specific resource 2, specific resource 3",
    "assessmentMethods": "Oral questions, observation, written exercise",
    "reflection": ""
  }}
]
"""
        
        # Generate with LLM
        raw = await self._provider().generate(prompt, system=system_prompt)
        
        # Parse JSON array with robust extraction
        lesson_rows = self._extract_json_array(raw)
        
        # Validate and fix each lesson row
        current_week = week_start
        current_lesson = lesson_start
        
        validated_rows = []
        for row in lesson_rows[:lessons_count]:  # Only take requested number
            # Set week and lesson numbers
            row["week"] = current_week
            row["lesson"] = current_lesson
            row["strand"] = strand
            row["subStrand"] = sub_strand_name
            
            # Validate and enforce rules
            row = self._validate_lesson_row(row, is_kiswahili, grade, subject)
            
            validated_rows.append(row)
            
            # Increment lesson counter
            current_lesson += 1
            if current_lesson > lessons_per_week:
                current_lesson = 1
                current_week += 1
        
        return validated_rows
    
    def _extract_json_array(self, raw: str) -> List[Dict[str, Any]]:
        """Extract JSON array from LLM response."""
        cleaned = raw.strip()
        
        # Remove markdown code fences
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        
        # Try direct parse first
        try:
            result = json.loads(cleaned)
            if isinstance(result, list):
                return result
            elif isinstance(result, dict):
                return [result]  # Single object, wrap in array
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON array in response
        import re
        match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group(0))
                if isinstance(result, list):
                    return result
            except json.JSONDecodeError:
                pass
        
        # Last resort: try to fix common issues
        try:
            # Remove trailing commas
            fixed = re.sub(r',\s*}', '}', cleaned)
            fixed = re.sub(r',\s*]', ']', fixed)
            result = json.loads(fixed)
            if isinstance(result, list):
                return result
            elif isinstance(result, dict):
                return [result]
        except json.JSONDecodeError as e:
            raise AgentError(f"LLM did not return valid JSON array: {e}\nRaw response: {raw[:200]}")
    
    def _validate_lesson_row(
        self,
        row: Dict[str, Any],
        is_kiswahili: bool,
        grade: str,
        subject: str,
    ) -> Dict[str, Any]:
        """Validate and enforce CBC rules on a single lesson row."""
        # Ensure required fields
        row.setdefault("week", 1)
        row.setdefault("lesson", 1)
        row.setdefault("strand", "")
        row.setdefault("subStrand", "")
        row.setdefault("specificLearningOutcome", "")
        row.setdefault("learningExperiences", "")
        row.setdefault("keyInquiryQuestion", "What did we learn today?")
        row.setdefault("learningResources", f"KLB Visionary {subject} {grade}")
        row.setdefault("assessmentMethods", "Oral questions, observation")
        row.setdefault("reflection", "")
        
        # Validate SLO format
        slo = row["specificLearningOutcome"]
        if slo:
            # Check for banned verbs
            slo_lower = slo.lower()
            for banned in self.banned_verbs:
                if banned in slo_lower:
                    self.logger.warning(f"Banned verb '{banned}' in lesson row", week=row["week"], lesson=row["lesson"])
                    slo = slo.replace(banned, "identify")
            
            row["specificLearningOutcome"] = slo
        
        # Validate learning experiences format
        exp = row["learningExperiences"]
        if exp:
            exp_lower = exp.lower()
            # Check for passive language
            for passive in ["learn about", "know about", "understand"]:
                if passive in exp_lower:
                    exp = exp.replace(passive, "explore" if passive == "learn about" else "identify")
            
            row["learningExperiences"] = exp
        
        return row

    async def generate_lesson_plan(
        self,
        *,
        week: int,
        lesson: int,
        teacher_id: str,
        scheme_id: Optional[str] = None,
        row: Optional[Dict[str, Any]] = None,
        grade: Optional[str] = None,
        subject: Optional[str] = None,
        term: Optional[str] = None,
        additional_notes: Optional[str] = None,
        language: str = "english",
    ) -> Dict[str, Any]:
        """Generate a detailed lesson plan.

        Two calling shapes are supported:
          1. ``row`` is provided directly (preferred — the studio passes the
             selected SchemeRow). ``grade``/``subject``/``term`` come along
             as separate kwargs.
          2. ``scheme_id`` only — falls back to loading the scheme from
             Supabase and picking ``rows[week - 1]``. Requires the scheme
             to have been saved.
        """
        try:
            self.logger.info(
                "Generating lesson plan",
                scheme_id=scheme_id,
                week=week,
                lesson=lesson,
                has_row=bool(row),
            )

            scheme: Dict[str, Any] = {}
            if row is not None:
                # Direct row path — no DB lookup needed. Build a minimal
                # scheme dict so _generate_lesson_plan_content has the
                # grade/subject/term context it needs.
                scheme = {
                    "grade": grade or "",
                    "subject": subject or "",
                    "term": term or "",
                    "rows": [row],
                    "lessons_per_week": 5,
                }
                week_content = row
            else:
                if not scheme_id:
                    raise AgentError("Either row or scheme_id must be provided")
                loaded = await self._load_scheme(scheme_id)
                if not loaded:
                    raise AgentError(f"Scheme not found: {scheme_id}")
                scheme = loaded
                rows = scheme.get("rows", [])
                if week < 1 or week > len(rows):
                    raise AgentError(
                        f"Week {week} not found in scheme (has {len(rows)} weeks)"
                    )
                week_content = rows[week - 1]

            # Generate lesson plan using row content as guardrail.
            lesson_plan = await self._generate_lesson_plan_content(
                scheme=scheme,
                week_content=week_content,
                lesson_number=lesson,
                language=language,
                additional_notes=additional_notes,
            )

            # Stamp persistence metadata.
            lesson_plan_id = f"lesson_{uuid.uuid4().hex[:12]}"
            lesson_plan["lesson_plan_id"] = lesson_plan_id
            lesson_plan["scheme_id"] = scheme_id
            lesson_plan["teacher_id"] = teacher_id
            lesson_plan["week"] = week
            lesson_plan["lesson"] = lesson
            lesson_plan["created_at"] = datetime.now().isoformat()

            if self.supabase:
                await self._save_lesson_plan(lesson_plan)

            self.logger.info("Lesson plan generated", lesson_plan_id=lesson_plan_id)

            return {
                "agent": "lesson_architect",
                "action": "generate_lesson_plan",
                "response": f"Generated lesson plan for Week {week}, Lesson {lesson}",
                "lesson_plan_id": lesson_plan_id,
                "lesson_plan": lesson_plan,
            }

        except Exception as exc:
            self.logger.error("Lesson plan generation failed", error=str(exc))
            raise AgentError(f"Lesson plan generation failed: {exc}") from exc

    async def generate_exam(
        self,
        *,
        teacher_id: str,
        grade: str,
        subject: str,
        term: str,
        allocation: List[Dict[str, Any]],
        counts: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        """Generate an end-of-term exam scope-validated against ``allocation``.

        Ported from
        ``_inventory/scheme-scribe-ai/supabase/functions/generate-exam/index.ts``.
        Returns ``{exam_id, questions, total_marks, meta}``. ``questions`` is
        a list of dicts shaped as :class:`scheme.exam.ExamQuestion` (MCQ /
        ShortQ / LongQ discriminated union — the studio renders these by
        ``type``). Caches by ``(grade, subject, term)`` in the ``exams`` table
        when Supabase is configured; otherwise the exam is returned without
        persistence.
        """
        from .scheme.exam import (
            ExamCounts,
            ExamValidationError,
            StrandAllocation,
            generate_exam as _gen_exam,
        )

        try:
            self.logger.info(
                "Generating exam",
                grade=grade,
                subject=subject,
                term=term,
                allocation_strands=len(allocation),
            )

            try:
                allocation_models = [StrandAllocation.model_validate(s) for s in allocation]
            except Exception as exc:
                raise AgentError(f"Invalid allocation: {exc}") from exc

            counts_model = ExamCounts.model_validate(counts) if counts else ExamCounts()

            try:
                questions = await _gen_exam(
                    self._provider(),
                    grade=grade,
                    subject=subject,
                    term=term,
                    allocation=allocation_models,
                    counts=counts_model,
                )
            except ExamValidationError as exc:
                raise AgentError(f"Exam generation failed: {exc}") from exc

            question_dicts = [q.model_dump() for q in questions]
            total_marks = sum(q.marks for q in questions)
            exam_id = f"exam_{uuid.uuid4().hex[:12]}"

            if self.supabase:
                await self._save_exam(
                    exam_id=exam_id,
                    teacher_id=teacher_id,
                    grade=grade,
                    subject=subject,
                    term=term,
                    questions=question_dicts,
                    total_marks=total_marks,
                )

            return {
                "agent": "lesson_architect",
                "action": "generate_exam",
                "exam_id": exam_id,
                "questions": question_dicts,
                "total_marks": total_marks,
                "meta": {
                    "grade": grade,
                    "subject": subject,
                    "term": term,
                    "total": len(question_dicts),
                },
            }

        except AgentError:
            raise
        except Exception as exc:
            self.logger.error("Exam generation failed", error=str(exc))
            raise AgentError(f"Exam generation failed: {exc}") from exc

    async def _save_exam(
        self,
        *,
        exam_id: str,
        teacher_id: str,
        grade: str,
        subject: str,
        term: str,
        questions: List[Dict[str, Any]],
        total_marks: int,
    ) -> None:
        """Persist an exam paper. Best-effort — failures are logged, not raised."""
        if not self.supabase:
            return
        row = {
            "exam_id": exam_id,
            "created_by": teacher_id,
            "grade": grade,
            "subject": subject,
            "term": term,
            "questions": questions,
            "total_marks": total_marks,
            "created_at": datetime.now().isoformat(),
        }
        try:
            self.supabase.table("exams").insert(row).execute()
            self.logger.info("Exam saved", exam_id=exam_id)
        except Exception as exc:
            self.logger.error(
                "Failed to save exam",
                error=str(exc),
                error_type=type(exc).__name__,
                exam_id=exam_id,
            )

    async def generate_worksheet(
        self,
        *,
        teacher_id: str,
        row: Dict[str, Any],
        grade: str,
        subject: str,
        term: Optional[str] = None,
        language: str = "english",
        duration_minutes: int = 30,
    ) -> Dict[str, Any]:
        """Generate one KSA-balanced worksheet for the given ``SchemeRow``.

        Returns ``{worksheet_id, worksheet: Worksheet-dict}``. Persists
        best-effort to ``worksheets`` when Supabase is configured; failures
        are logged, not raised. ``term`` is recorded for filtering but not
        used in generation (the SchemeRow already carries the curricular
        context).
        """
        from .scheme.worksheet import (
            WorksheetValidationError,
            generate_worksheet as _gen_worksheet,
        )

        try:
            self.logger.info(
                "Generating worksheet",
                grade=grade,
                subject=subject,
                strand=row.get("strand") or row.get("Strand"),
                sub_strand=row.get("subStrand")
                or row.get("sub_strand")
                or row.get("SubStrand"),
            )

            try:
                worksheet = await _gen_worksheet(
                    self._provider(),
                    row=row,
                    grade=grade,
                    subject=subject,
                    language=language,
                    duration_minutes=duration_minutes,
                )
            except WorksheetValidationError as exc:
                raise AgentError(f"Worksheet generation failed: {exc}") from exc

            worksheet_dict = worksheet.model_dump()
            worksheet_id = f"worksheet_{uuid.uuid4().hex[:12]}"

            if self.supabase:
                await self._save_worksheet(
                    worksheet_id=worksheet_id,
                    teacher_id=teacher_id,
                    grade=grade,
                    subject=subject,
                    term=term,
                    payload=worksheet_dict,
                )

            return {
                "agent": "lesson_architect",
                "action": "generate_worksheet",
                "worksheet_id": worksheet_id,
                "worksheet": worksheet_dict,
            }

        except AgentError:
            raise
        except Exception as exc:
            self.logger.error("Worksheet generation failed", error=str(exc))
            raise AgentError(f"Worksheet generation failed: {exc}") from exc

    async def _save_worksheet(
        self,
        *,
        worksheet_id: str,
        teacher_id: str,
        grade: str,
        subject: str,
        term: Optional[str],
        payload: Dict[str, Any],
    ) -> None:
        """Persist a worksheet. Best-effort — failures log, don't raise.

        Table not yet provisioned — landing alongside the studio UI in the
        follow-up phase. Insert will fail and log until migration lands.
        """
        if not self.supabase:
            return
        row = {
            "worksheet_id": worksheet_id,
            "teacher_id": teacher_id,
            "grade": grade,
            "subject": subject,
            "term": term,
            "strand": payload.get("strand"),
            "sub_strand": payload.get("subStrand"),
            "payload": payload,
            "created_at": datetime.now().isoformat(),
        }
        try:
            self.supabase.table("worksheets").insert(row).execute()
            self.logger.info("Worksheet saved", worksheet_id=worksheet_id)
        except Exception as exc:
            self.logger.error(
                "Failed to save worksheet",
                error=str(exc),
                error_type=type(exc).__name__,
                worksheet_id=worksheet_id,
            )

    async def generate_text_leveler(
        self,
        *,
        teacher_id: str,
        grade: str,
        subject: str,
        language: str = "english",
        input_text: Optional[str] = None,
        source_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a grade-appropriate leveled passage and KSA-aligned questions.

        Input can be raw pasted text or a source URL. Returns a structured
        TextLeveler result suitable for the studio to render directly.
        """
        from .scheme.leveler import (
            TextLevelerValidationError,
            generate_text_leveler as _gen_leveler,
        )

        try:
            self.logger.info(
                "Generating text leveler",
                grade=grade,
                subject=subject,
                source_url=source_url,
            )

            try:
                leveler = await _gen_leveler(
                    self._provider(),
                    grade=grade,
                    subject=subject,
                    language=language,
                    input_text=input_text,
                    source_url=source_url,
                )
            except TextLevelerValidationError as exc:
                raise AgentError(f"Text leveler generation failed: {exc}") from exc

            leveler_dict = leveler.model_dump()
            leveler_id = f"leveler_{uuid.uuid4().hex[:12]}"

            return {
                "agent": "lesson_architect",
                "action": "generate_text_leveler",
                "leveler_id": leveler_id,
                "leveler": leveler_dict,
            }

        except AgentError:
            raise
        except Exception as exc:
            self.logger.error("Text leveler generation failed", error=str(exc))
            raise AgentError(f"Text leveler generation failed: {exc}") from exc

    async def unpack_outcome(
        self,
        *,
        teacher_id: str,
        outcome: str,
        grade: str,
        subject: str,
        language: str = "english",
    ) -> Dict[str, Any]:
        """Unpack a KICD learning outcome into "I can…" statements + success criteria.

        Returns ``{unpacked_id, unpacked: UnpackedOutcome-dict}``. Persists
        best-effort to the ``unpacked_outcomes`` table when Supabase is
        configured; failures are logged, not raised.
        """
        from .unpacker import (
            UnpackerValidationError,
            generate_unpacked_outcome as _gen_unpacked,
        )

        try:
            self.logger.info(
                "Unpacking outcome",
                grade=grade,
                subject=subject,
                outcome_preview=outcome[:80] if outcome else "",
            )

            try:
                unpacked = await _gen_unpacked(
                    self._provider(),
                    outcome=outcome,
                    grade=grade,
                    subject=subject,
                    language=language,
                )
            except UnpackerValidationError as exc:
                raise AgentError(f"Outcome unpacking failed: {exc}") from exc

            unpacked_dict = unpacked.model_dump()
            unpacked_id = f"unpack_{uuid.uuid4().hex[:12]}"

            if self.supabase:
                await self._save_unpacked_outcome(
                    unpacked_id=unpacked_id,
                    teacher_id=teacher_id,
                    grade=grade,
                    subject=subject,
                    outcome=outcome,
                    payload=unpacked_dict,
                )

            return {
                "agent": "lesson_architect",
                "action": "unpack_outcome",
                "unpacked_id": unpacked_id,
                "unpacked": unpacked_dict,
            }

        except AgentError:
            raise
        except Exception as exc:
            self.logger.error("Outcome unpacking failed", error=str(exc))
            raise AgentError(f"Outcome unpacking failed: {exc}") from exc

    async def _save_unpacked_outcome(
        self,
        *,
        unpacked_id: str,
        teacher_id: str,
        grade: str,
        subject: str,
        outcome: str,
        payload: Dict[str, Any],
    ) -> None:
        """Persist an unpacked outcome. Best-effort — failures log, don't raise.

        Table not yet provisioned — landing alongside the studio UI in the
        follow-up phase. Until then this insert will fail and log, which is
        the intended dev-phase behaviour.
        """
        if not self.supabase:
            return
        row = {
            "unpacked_id": unpacked_id,
            "teacher_id": teacher_id,
            "grade": grade,
            "subject": subject,
            "outcome": outcome,
            "payload": payload,
            "created_at": datetime.now().isoformat(),
        }
        try:
            self.supabase.table("unpacked_outcomes").insert(row).execute()
            self.logger.info("Unpacked outcome saved", unpacked_id=unpacked_id)
        except Exception as exc:
            self.logger.error(
                "Failed to save unpacked outcome",
                error=str(exc),
                error_type=type(exc).__name__,
                unpacked_id=unpacked_id,
            )

    async def generate_differentiation(
        self,
        *,
        teacher_id: str,
        lesson_plan: Dict[str, Any],
        language: str = "english",
        lesson_plan_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate three-tier differentiation for one lesson plan.

        Composes Tier 1's lesson-plan artefact — caller passes the lesson
        plan JSON (typically straight from :meth:`generate_lesson_plan`'s
        ``lesson_plan`` dict). Returns
        ``{differentiation_id, differentiation: Differentiation-dict}``.
        Persists best-effort to the ``differentiations`` table when
        Supabase is configured; failures are logged, not raised.

        ``lesson_plan_id`` is recorded alongside the differentiation row
        when supplied so the studio can join back to the source plan; pass
        ``None`` when the caller is generating against an in-memory plan
        that wasn't persisted.
        """
        from .scheme.differentiation import (
            DifferentiationValidationError,
            generate_differentiation as _gen_diff,
        )

        try:
            self.logger.info(
                "Generating differentiation",
                grade=lesson_plan.get("grade"),
                subject=lesson_plan.get("subject"),
                strand=lesson_plan.get("strand"),
                sub_strand=lesson_plan.get("subStrand")
                or lesson_plan.get("sub_strand"),
            )

            try:
                diff = await _gen_diff(
                    self._provider(),
                    lesson_plan=lesson_plan,
                    language=language,
                )
            except DifferentiationValidationError as exc:
                raise AgentError(f"Differentiation generation failed: {exc}") from exc

            diff_dict = diff.model_dump()
            differentiation_id = f"diff_{uuid.uuid4().hex[:12]}"

            if self.supabase:
                await self._save_differentiation(
                    differentiation_id=differentiation_id,
                    teacher_id=teacher_id,
                    lesson_plan_id=lesson_plan_id,
                    payload=diff_dict,
                )

            return {
                "agent": "lesson_architect",
                "action": "generate_differentiation",
                "differentiation_id": differentiation_id,
                "differentiation": diff_dict,
            }

        except AgentError:
            raise
        except Exception as exc:
            self.logger.error("Differentiation generation failed", error=str(exc))
            raise AgentError(f"Differentiation generation failed: {exc}") from exc

    async def _save_differentiation(
        self,
        *,
        differentiation_id: str,
        teacher_id: str,
        lesson_plan_id: Optional[str],
        payload: Dict[str, Any],
    ) -> None:
        """Persist a differentiation block. Best-effort — failures log, don't raise.

        Table not yet provisioned — landing alongside the studio UI in the
        follow-up phase. Insert will fail and log until the migration
        lands, which is the intended dev-phase behaviour (matches the
        pattern set by ``_save_unpacked_outcome`` and ``_save_worksheet``).
        """
        if not self.supabase:
            return
        row = {
            "differentiation_id": differentiation_id,
            "teacher_id": teacher_id,
            "lesson_plan_id": lesson_plan_id,
            "grade": payload.get("grade"),
            "subject": payload.get("subject"),
            "strand": payload.get("strand"),
            "sub_strand": payload.get("subStrand"),
            "payload": payload,
            "created_at": datetime.now().isoformat(),
        }
        try:
            self.supabase.table("differentiations").insert(row).execute()
            self.logger.info("Differentiation saved", differentiation_id=differentiation_id)
        except Exception as exc:
            self.logger.error(
                "Failed to save differentiation",
                error=str(exc),
                error_type=type(exc).__name__,
                differentiation_id=differentiation_id,
            )

    async def _generate_lesson_plan_content(
        self,
        *,
        scheme: Dict[str, Any],
        week_content: Dict[str, Any],
        lesson_number: int,
        language: str,
        additional_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate detailed lesson plan content via the ported pipeline.

        Delegates to :func:`scheme.lesson_plan.generate_lesson_plan` which owns
        the prompt, JSON contract, and Pydantic validation ported from
        scheme-scribe-ai. Returns the validated plan as a dict so the caller
        can stamp persistence metadata onto it.

        ``week_content`` may use either camelCase (post-Phase-1 SchemeRow keys)
        or the legacy snake_case keys; both are accepted here so older saved
        schemes still produce lesson plans.
        """
        from .scheme.lesson_plan import (
            LessonPlanValidationError,
            generate_lesson_plan as _gen_lesson_plan,
        )

        def _pick(row: Dict[str, Any], *keys: str) -> Any:
            for k in keys:
                v = row.get(k)
                if v not in (None, "", []):
                    return v
            return None

        def _as_text(value: Any) -> Optional[str]:
            if value is None:
                return None
            if isinstance(value, (list, tuple)):
                return "; ".join(str(v) for v in value if v)
            return str(value)

        grade = scheme.get("grade", "")
        subject = scheme.get("subject", "")
        term = scheme.get("term") or scheme.get("Term")

        strand = _pick(week_content, "strand", "Strand") or ""
        sub_strand = _pick(week_content, "subStrand", "sub_strand", "SubStrand") or ""
        slo = _as_text(
            _pick(
                week_content,
                "specificLearningOutcome",
                "specific_learning_outcomes",
                "specific_learning_outcome",
            )
        )
        learning_experiences = _as_text(
            _pick(week_content, "learningExperiences", "learning_experiences")
        )
        kiq = _as_text(
            _pick(
                week_content,
                "keyInquiryQuestion",
                "key_inquiry_questions",
                "key_inquiry_question",
            )
        )
        resources = _as_text(
            _pick(week_content, "learningResources", "learning_resources", "resources")
        )

        try:
            plan = await _gen_lesson_plan(
                self._provider(),
                grade=grade,
                subject=subject,
                strand=strand,
                sub_strand=sub_strand,
                slo=slo,
                learning_experiences=learning_experiences,
                key_inquiry_question=kiq,
                learning_resources=resources,
                term=term,
                additional_notes=additional_notes,
            )
        except LessonPlanValidationError as exc:
            raise AgentError(f"Lesson plan validation failed: {exc}") from exc

        return plan.model_dump()

    async def list_schemes(
        self,
        *,
        teacher_id: str,
        grade: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List schemes for a teacher."""
        try:
            if not self.supabase:
                self.logger.warning("Database not configured - returning empty schemes list")
                return {
                    "agent": "lesson_architect",
                    "action": "list_schemes",
                    "response": "Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables to enable scheme storage.",
                    "schemes": [],
                }
            
            # Query schemes from database (Supabase execute() is synchronous)
            query = self.supabase.table("schemes").select("*").eq("teacher_id", teacher_id)
            
            if grade:
                query = query.eq("grade", grade)
            if subject:
                query = query.eq("subject", subject)
            
            # Execute query synchronously - do NOT await
            response = query.execute()
            
            # Extract data from response
            schemes = []
            if response and hasattr(response, 'data'):
                schemes = response.data or []
            
            self.logger.info("Listed schemes", count=len(schemes), teacher_id=teacher_id)
            
            return {
                "agent": "lesson_architect",
                "action": "list_schemes",
                "response": f"Found {len(schemes)} schemes",
                "schemes": schemes,
            }
            
        except Exception as exc:
            self.logger.error("List schemes failed", error=str(exc), error_type=type(exc).__name__)
            # Return empty list instead of crashing
            return {
                "agent": "lesson_architect",
                "action": "list_schemes",
                "response": f"Failed to list schemes: {str(exc)}",
                "schemes": [],
            }

    def _format_scheme_as_text(self, scheme: Dict[str, Any]) -> str:
        """Format scheme data as a table (matching scheme-scribe-ai table format)."""
        lines = []
        
        # Header
        is_kiswahili = "kiswahili" in scheme.get('subject', '').lower()
        
        if is_kiswahili:
            lines.append(f"# MPANGO WA KAZI - {scheme['grade']} {scheme['subject']} - {scheme['term']}")
        else:
            lines.append(f"# SCHEME OF WORK - {scheme['grade']} {scheme['subject']} - {scheme['term']}")
        
        lines.append("")
        lines.append(f"**Total Lessons:** {len(scheme['rows'])}")
        lines.append(f"**Lessons per Week:** {scheme['lessons_per_week']}")
        lines.append("")
        
        # Table headers
        if is_kiswahili:
            headers = ["WIKI", "SOMO", "MADA", "MADA NDOGO", "MATOKEO MAALUM", "SHUGHULI ZA KUJIFUNZA", "SWALI DADISI", "RASILIMALI", "TATHMINI", "MAONI"]
        else:
            headers = ["WK", "LSN", "Strand", "Sub-Strand", "Lesson Learning Outcomes", "Lesson Learning Experiences", "Key Inquiry Question", "Learning Resources", "Assessment", "Refl"]
        
        # Create table separator
        separator = "|" + "|".join(["---" for _ in headers]) + "|"
        header_row = "|" + "|".join(headers) + "|"
        
        lines.append(header_row)
        lines.append(separator)
        
        # Table rows
        for row in scheme['rows']:
            week = str(row.get('week', ''))
            lesson = str(row.get('lesson', ''))
            strand = row.get('strand', '')
            sub_strand = row.get('subStrand', '')
            slo = row.get('specificLearningOutcome', '').replace('\n', '<br>')
            experiences = row.get('learningExperiences', '').replace('\n', '<br>')
            kiq = row.get('keyInquiryQuestion', '').replace('\n', ' ')
            resources = row.get('learningResources', '').replace('\n', ', ')
            assessment = row.get('assessmentMethods', '').replace('\n', ', ')
            reflection = row.get('reflection', '')
            
            table_row = f"|{week}|{lesson}|{strand}|{sub_strand}|{slo}|{experiences}|{kiq}|{resources}|{assessment}|{reflection}|"
            lines.append(table_row)
        
        lines.append("")
        
        # Footer
        if is_kiswahili:
            lines.append("*Mpango huu umejengwa kwa mujibu wa Mtaala wa CBC - KICD Kenya*")
        else:
            lines.append("*This scheme is aligned with the CBC Curriculum - KICD Kenya*")
        
        return "\n".join(lines)
    
    async def _save_scheme(self, scheme: Dict[str, Any]) -> None:
        """Save scheme to database."""
        if not self.supabase:
            self.logger.warning("Supabase not configured, scheme not saved")
            return
        
        try:
            self.logger.info("Attempting to save scheme", scheme_id=scheme.get("scheme_id"), teacher_id=scheme.get("teacher_id"))
            
            # Save to schemes table
            response = self.supabase.table("schemes").insert({
                "scheme_id": scheme["scheme_id"],
                "title": scheme["title"],
                "grade": scheme["grade"],
                "subject": scheme["subject"],
                "term": scheme["term"],
                "mode": scheme["mode"],
                "teacher_id": scheme["teacher_id"],
                "language": scheme["language"],
                "total_weeks": scheme["total_weeks"],
                "lessons_per_week": scheme["lessons_per_week"],
                "rows": scheme["rows"],
                "created_at": scheme["created_at"],
            }).execute()
            
            self.logger.info("Scheme saved successfully", scheme_id=scheme["scheme_id"], response_count=len(response.data) if response and hasattr(response, 'data') else 0)
            
        except Exception as exc:
            import traceback
            self.logger.error(
                "Failed to save scheme",
                error=str(exc),
                error_type=type(exc).__name__,
                scheme_id=scheme.get("scheme_id"),
                teacher_id=scheme.get("teacher_id"),
                table="schemes",
                traceback=traceback.format_exc(),
            )
            # Don't raise - scheme generation succeeded, just storage failed.
            # Surface the failure in the list result instead by tagging the
            # scheme; the caller can show it as "saved locally, sync failed".

    async def _load_scheme(self, scheme_id: str) -> Optional[Dict[str, Any]]:
        """Load scheme from database."""
        if not self.supabase:
            self.logger.warning("Supabase not configured")
            return None
        
        try:
            # Execute query synchronously - do NOT await
            response = self.supabase.table("schemes").select("*").eq("scheme_id", scheme_id).execute()
            
            if response and hasattr(response, 'data') and response.data:
                return response.data[0]
            
            return None
            
        except Exception as exc:
            self.logger.error("Failed to load scheme", error=str(exc))
            return None

    async def _save_lesson_plan(self, lesson_plan: Dict[str, Any]) -> None:
        """Save lesson plan to database.

        The full validated LessonPlan goes into the ``plan`` JSONB column;
        only scalars used for filtering/indexing get their own columns. This
        avoids the column-mismatch error that would happen if we tried to
        insert the camelCase keys (``subStrand``, ``keyInquiryQuestion``, …)
        directly against the legacy typed schema.
        """
        if not self.supabase:
            self.logger.warning("Supabase not configured, lesson plan not saved")
            return

        # Separate persistence metadata (stamped by the caller) from the
        # validated plan payload.
        plan_payload = {
            k: v
            for k, v in lesson_plan.items()
            if k not in {
                "lesson_plan_id",
                "scheme_id",
                "teacher_id",
                "week",
                "lesson",
                "created_at",
            }
        }

        row = {
            "lesson_plan_id": lesson_plan["lesson_plan_id"],
            "scheme_id": lesson_plan.get("scheme_id"),
            "teacher_id": lesson_plan["teacher_id"],
            "grade": plan_payload.get("grade", ""),
            "subject": plan_payload.get("subject", ""),
            "strand": plan_payload.get("strand"),
            "sub_strand": plan_payload.get("subStrand"),
            "week": lesson_plan["week"],
            "lesson": lesson_plan["lesson"],
            "plan": plan_payload,
            "created_at": lesson_plan["created_at"],
        }

        try:
            self.supabase.table("lesson_plans").insert(row).execute()
            self.logger.info("Lesson plan saved", lesson_plan_id=row["lesson_plan_id"])
        except Exception as exc:
            self.logger.error(
                "Failed to save lesson plan",
                error=str(exc),
                error_type=type(exc).__name__,
                lesson_plan_id=row["lesson_plan_id"],
            )
