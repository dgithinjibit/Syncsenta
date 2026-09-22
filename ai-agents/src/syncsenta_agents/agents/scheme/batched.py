"""Batched scheme-row generation against an LLM provider.

Ported from
``_inventory/scheme-scribe-ai/supabase/functions/generate-scheme/index.ts``:

- ``MAX_LESSONS_PER_BATCH = 5`` (line 593) — do not raise. Llama-class models
  truncate JSON above ~5 rows for the 10-column CBC shape; ``extract_json_array``
  has recovery logic but it's lossy.
- ``generateBatch`` (lines 595-891) — one Groq call → one batch of ≤5 rows.
  The system prompt is reproduced verbatim (English + Kiswahili variants),
  including the lower-primary non-language verb restriction block.
- ``generateForSubStrand`` (lines 893-950) — outer loop, retries up to 3× on
  generic errors, raises through ``RATE_LIMIT`` and ``NO_OFFICIAL_DATA``,
  finishes with ``validate_and_sanitize_rows`` + ``enforce_lesson_count``.

The provider interface mirrors ``LessonArchitectAgent`` — pass an awaitable
``generate(prompt, *, system=...)`` returning the raw string. The TS module
calls Groq directly with ``meta-llama/llama-4-scout-17b-16e-instruct``; in
Ascendra we route through whichever model the ``LLMProvider`` is configured
for (default ``llama-3.1-70b-versatile``).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional, Protocol, Sequence, Tuple, TypedDict

from .guardrails import (
    enforce_lesson_count,
    ensure_no_empty_fields,
    get_klb_book_title,
    validate_and_fix_experiences,
    validate_and_fix_slo,
    validate_and_sanitize_rows,
)
from .normalize import SchemeRow, extract_json_array, normalize_row_keys

log = logging.getLogger(__name__)

MAX_LESSONS_PER_BATCH = 5
_RATE_LIMIT_SENTINEL = "RATE_LIMIT"
_NO_OFFICIAL_DATA_PREFIX = "NO_OFFICIAL_DATA:"

_KISWAHILI_SUBJECTS = {"Kiswahili"}
_LANGUAGE_SUBJECTS = {
    "Kiswahili",
    "English Activities",
    "English",
    "Indigenous Language",
    "Arabic",
    "French",
    "German",
    "Mandarin",
}

# Kiswahili thematic skill areas that don't require official learning outcomes
# in the registry — the Mada (theme) name + skill-area name already give the
# LLM enough context. Source: generate-scheme/index.ts:640.
_KISWAHILI_THEMATIC_SUB_STRANDS = {
    "Kusikiliza na Kuzungumza",
    "Kusoma",
    "Kuandika",
    "Sarufi",
}


class LLMProvider(Protocol):
    """Awaitable text-in/text-out interface; mirrors the agent's provider."""

    async def generate(self, prompt: str, *, system: Optional[str] = None) -> str: ...


class SubStrandInfo(TypedDict, total=False):
    name: str
    lessons: int
    learningOutcomes: Sequence[str]
    suggestedExperiences: Sequence[str]
    keyInquiryQuestion: str


class RateLimitError(RuntimeError):
    """Raised when the upstream LLM returns a 429 / rate-limit response.

    Mirrors the ``throw new Error("RATE_LIMIT")`` pattern in the TS source —
    callers should catch this at the orchestrator level and decide whether to
    return partial rows. Do NOT retry; back off and surface to the user.
    """


class NoOfficialDataError(RuntimeError):
    """Raised when a sub-strand has no official KICD data and no fallback.

    The TS source treats this as a hard refusal. In Ascendra we soften that
    via ``allow_synthetic_context=True`` because ``CURRICULUM_REGISTRY`` is
    documented as "optional guardrails, not a gate".
    """


# ────────────────────────────────────────────────────────────────────────────
# Prompt builders.  Reproduced verbatim from generate-scheme/index.ts where
# the wording matters — the LLM is heavily anchored on the exact rule text.
# ────────────────────────────────────────────────────────────────────────────
def _build_official_context(
    sub_strand: SubStrandInfo,
    *,
    strand: str,
    grade: str,
    subject: str,
    is_sw: bool,
) -> Tuple[str, bool]:
    """Return ``(context_block, has_official_data)``.

    Source: generate-scheme/index.ts:613-655. Includes the
    Kiswahili-thematic / hardcoded-curriculum fallbacks so we never refuse
    generation when the spec says we can substitute Mada context.
    """
    parts: List[str] = []
    sub_strand_name = sub_strand.get("name", "")
    total_lessons = sub_strand.get("lessons", 0)

    learning_outcomes = sub_strand.get("learningOutcomes") or []
    if learning_outcomes:
        parts.append(
            f'\n\nOFFICIAL KICD LEARNING OUTCOMES for "{sub_strand_name}":'
        )
        for i, outcome in enumerate(learning_outcomes):
            parts.append(f"  {chr(97 + i)}) {outcome}")

    kiq = sub_strand.get("keyInquiryQuestion")
    if kiq:
        parts.append(f'\nOFFICIAL KEY INQUIRY QUESTION: "{kiq}"')

    suggested = sub_strand.get("suggestedExperiences") or []
    if suggested:
        parts.append("\nOFFICIAL SUGGESTED LEARNING EXPERIENCES:")
        for exp in suggested:
            parts.append(f"  - {exp}")

    assessment_evidence = sub_strand.get("assessmentEvidence") or []
    if assessment_evidence:
        parts.append("\nTEACHER ASSESSMENT EVIDENCE — preserve these observable checks:")
        for evidence in assessment_evidence:
            parts.append(f"  - {evidence}")

    prerequisites = sub_strand.get("prerequisites") or []
    if prerequisites:
        parts.append("\nPREREQUISITES — do not skip these readiness checks:")
        for prerequisite in prerequisites:
            parts.append(f"  - {prerequisite}")

    misconceptions = sub_strand.get("misconceptions") or []
    if misconceptions:
        parts.append("\nKNOWN MISCONCEPTIONS — address these explicitly:")
        for misconception in misconceptions:
            parts.append(f"  - {misconception}")

    safety_notes = sub_strand.get("safetyNotes") or []
    if safety_notes:
        parts.append("\nNON-NEGOTIABLE SAFETY NOTES — do not weaken or omit:")
        for safety_note in safety_notes:
            parts.append(f"  - {safety_note}")

    has_official_data = bool(parts)
    official_context = "\n".join(parts)

    # Fallbacks for sub-strands without explicit official data.
    is_kiswahili_thematic = is_sw and sub_strand_name in _KISWAHILI_THEMATIC_SUB_STRANDS
    is_from_hardcoded_curriculum = total_lessons > 0 and bool(sub_strand_name)

    if not has_official_data and is_from_hardcoded_curriculum and not is_kiswahili_thematic:
        official_context = (
            f"\n\nKICD CURRICULUM: {grade} {subject}\n"
            f'Strand: "{strand}"\n'
            f'Sub-strand: "{sub_strand_name}"\n'
            f"Allocated lessons: {total_lessons}\n"
            "This sub-strand is from the official KICD CBC curriculum design. "
            "Generate accurate, age-appropriate content aligned with the Kenyan "
            f"CBC framework for {grade} learners.\n"
        )
    elif is_kiswahili_thematic and not has_official_data:
        official_context = (
            f'\n\nKICD MADA (Thematic Topic): "{strand}"\n'
            f'Sub-strand skill area: "{sub_strand_name}"\n'
            "This is a standard Kiswahili language skill area under the given Mada. "
            f"Generate age-appropriate content for {grade} learners practicing "
            f'"{sub_strand_name}" within the theme of "{strand}".\n'
        )

    return official_context, has_official_data


def _build_verb_restriction_blocks(
    grade: str, subject: str
) -> Tuple[str, str]:
    """Return ``(en_block, sw_block)`` for the lower-primary verb restriction.

    Empty strings if not applicable. Source: generate-scheme/index.ts:669-720.
    The text is reproduced verbatim because the LLM is tuned to these exact
    phrasings.
    """
    import re as _re

    m = _re.search(r"\d+", grade)
    grade_num = int(m.group(0)) if m else 0
    is_lower_primary = 1 <= grade_num <= 3
    is_language_subject = subject in _LANGUAGE_SUBJECTS

    if not (is_lower_primary and not is_language_subject):
        return "", ""

    verb_restriction_en = f"""
CRITICAL — KSA VERB FRAMEWORK FOR {grade} {subject}:
Since this is a non-language subject for lower primary, Lesson Learning Outcomes MUST use verbs from the official CBE Knowledge-Skills-Attitudes (KSA) framework. DO NOT invent informal phrases like "carry out" or "find out about".

KNOWLEDGE (Cognitive) verbs — use for understanding/information outcomes:
  identify, explain, describe, recognize, compare, classify, define, list, name, state, outline, summarize

SKILLS (Psychomotor) verbs — use for practical/hands-on outcomes:
  observe, record, differentiate, use, interpret, suggest, role-play, practice, conduct, demonstrate, participate, sort, measure, express, create, construct

ATTITUDES (Affective) verbs — use for values/dispositions outcomes:
  appreciate, value, show (curiosity/respect/responsibility), commit, prioritize, develop, care, respect, empathize

RULES:
- Each Lesson Learning Outcome MUST start with a proper KSA verb from the lists above.
- NEVER use informal/vague phrases: "carry out", "find out", "look at", "do", "make", "get to know", "learn about", "talk about", "go through".
- NEVER use literacy verbs for non-language subjects: "write", "read", "compose", "draft", "author", "journal".
- NEVER use overly advanced verbs for Grade 1-3: "analyse", "evaluate", "critique", "synthesize", "hypothesize", "infer", "deduce".
- For Grade 1-2, prefer simpler KSA verbs: identify, name, describe, observe, sort, demonstrate, appreciate, show, participate, practice.
- For Grade 3, you may also use: explain, compare, classify, suggest, interpret, value, commit, recognize.
- Lesson Learning Experiences should use activity verbs: observe, explore, collect, sort, group, discuss (orally), sing, role-play, visit, draw, colour, play, share, demonstrate, point to, name, show, participate, practice, measure.
- All activities must be HANDS-ON, CONCRETE, and OBSERVABLE.
"""

    verb_restriction_sw = f"""
MUHIMU SANA — MFUMO WA VITENZI VYA KSA KWA {grade} {subject}:
Hii ni somo lisilo la lugha kwa shule ya chini, kwa hivyo Matokeo ya Ujifunzaji LAZIMA yatumie vitenzi kutoka mfumo rasmi wa CBE wa Maarifa-Ujuzi-Mitazamo (KSA). USITUMIE maneno yasiyo rasmi kama "fanya", "jua kuhusu".

MAARIFA (vitenzi vya kufahamu):
  kutambua, kueleza, kuelezea, kutambua tofauti, kulinganisha, kupanga, kufafanua, kuorodhesha, kutaja, kusema, kufupisha

UJUZI (vitenzi vya vitendo):
  kuangalia, kurekodi, kutofautisha, kutumia, kufasiri, kupendekeza, kucheza jukumu, kufanya mazoezi, kuendesha, kuonyesha, kushiriki, kupanga, kupima, kueleza hisia, kuunda, kujenga

MITAZAMO (vitenzi vya thamani):
  kuthamini, kuthamini thamani, kuonyesha (udadisi/heshima/uwajibikaji), kujitolea, kuweka kipaumbele, kukuza, kutunza, kuheshimu, kuonyesha huruma

KANUNI:
- Kila Tokeo la Ujifunzaji LAZIMA lianze na kitenzi sahihi cha KSA.
- USITUMIE maneno yasiyo rasmi: "fanya shughuli", "jua kuhusu", "angalia tu", "pita".
- USITUMIE vitenzi vya lugha: "kuandika", "kusoma", "kutunga".
- Shughuli lazima ziwe za VITENDO, ZINAZOONEKANA, na ZINAZOSHIKIKA.
"""
    return verb_restriction_en, verb_restriction_sw


def _build_indigenous_language_block(
    indigenous_language: Optional[str], subject: str
) -> str:
    if not indigenous_language or subject != "Indigenous Language":
        return ""
    return f"""

INDIGENOUS LANGUAGE: {indigenous_language}
All content MUST be contextualized for the {indigenous_language} language. This means:
- Use examples, vocabulary, and cultural references specific to the {indigenous_language}-speaking community
- Reading passages, stories, and dialogues should reflect {indigenous_language} cultural contexts (names, places, traditions, foods, activities)
- Phonics/pronunciation exercises should reference {indigenous_language} sound patterns
- Creative writing and oral exercises should draw from {indigenous_language} proverbs, songs, riddles, and oral traditions
- The learning resources should include {indigenous_language} textbooks, storybooks, and community elders as resource persons
- While the scheme structure follows KICD standards, the CONTENT must feel authentically {indigenous_language}
"""


def _build_system_prompt(
    *,
    grade: str,
    subject: str,
    batch_lessons: int,
    total_lessons: int,
    week_start: int,
    lessons_per_week: int,
    is_sw: bool,
    official_context: str,
    verb_restriction_en: str,
    verb_restriction_sw: str,
) -> str:
    """Reproduce the verbatim CBC system prompts from the TS source.

    Source: generate-scheme/index.ts:722-839. The rule numbering and phrasing
    is load-bearing for KSA enforcement — do not rewrite.
    """
    klb_title = get_klb_book_title(subject, grade)

    if is_sw:
        return f"""Wewe ni mtaalamu wa mtaala wa CBC Kenya (KICD). Unatengeneza Mpango wa Kazi rasmi ambao unafuata viwango vya KICD kwa usahihi.

SHARTI MUHIMU: Lazima utumie data rasmi ya KICD iliyotolewa hapa chini PEKEE. USIBUNI, USITENGENEZE, au USIZUSHE matokeo ya kujifunza, majina ya strand, majina ya sub-strand, au maudhui ya mtaala ambayo hayapo katika mfumo wa KICD.

UMAHIRI WA CBC: Kila somo lazima lijeneze UMAHIRI — uwezo wa kutumia mchanganyiko wa Maarifa, Ujuzi, na Mitazamo (KSA) kutekeleza kazi.

STADI MUHIMU ZA CBC (zingatia katika shughuli za kujifunza):
- Mawasiliano na Ushirikiano (k.m., "Kufanya kazi kwa jozi...", "Kujadili katika vikundi...")
- Kufikiri kwa Kina na Utatuzi wa Matatizo (k.m., "Kutafuta suluhisho la...", "Kulinganisha...")
- Ujuzi wa Kidijitali (k.m., "Kutumia simu/kompyuta kutafuta...", "Kutazama video...")
- Ubunifu na Uvumbuzi (k.m., "Kubuni muundo kwa kutumia...", "Kuunda mfano wa...")

MAADILI YA CBC (zingatia katika matokeo ya Mitazamo):
Heshima, Uwajibikaji, Upendo, Umoja, Amani, Uadilifu, Uzalendo, Haki ya Kijamii.

KANUNI MUHIMU:
1. Tengeneza HASA somo {batch_lessons} kwa wanafunzi wa {grade}.
2. Kila somo liwe FUPI, sahili, na linalofaa umri wa watoto.
3. **MATOKEO MAALUM YANAYOTARAJIWA** — Lazima ianze na "**Kufikia mwisho wa somo mwanafunzi aweze:**" kisha orodhesha matokeo HASA 3 kwa kutumia alama ya dashi (-), kila moja kutoka eneo moja la KSA KWA MPANGILIO HUU:
   - Tokeo la 1 = MAARIFA TU. Lazima lianze na kitenzi cha maarifa: kutambua, kutaja, kuorodhesha, kueleza, kufafanua, kulinganisha, kutofautisha, kuelezea, kubainisha.
     MARUFUKU kwa tokeo la 1: kutekeleza, kutumia, kuonyesha, kufurahia, kuthamini, kuheshimu.
   - Tokeo la 2 = UJUZI TU. Lazima lianze na kitenzi cha ujuzi: kutekeleza, kutumia, kujenga, kuonyesha, kuchora, kuhesabu, kupima, kutatua, kuimba, kushiriki, kufanya mazoezi, kupanga, kucheza jukumu, kuunda.
     MARUFUKU kwa tokeo la 2: kutambua, kutaja, kueleza, kufurahia, kuthamini.
   - Tokeo la 3 = MITAZAMO TU. Lazima lianze na kitenzi cha mitazamo: kufurahia, kuheshimu, kuthamini, kushirikiana, kuzingatia, kuendeleza, kutetea, kujali, kujitolea.
     MARUFUKU kwa tokeo la 3: kutambua, kutaja, kueleza, kutekeleza, kutumia, kuonyesha.
   - HILI HALIWEZI KUBADILISHWA. Kila tokeo LAZIMA liwe katika mpangilio huu.
   - Kila tokeo liwe MAHUSUSI sana na linatokana na data rasmi ya KICD ikiwa imetolewa hapa chini.
   - USIBUNI au UTENGENEZE matokeo ambayo hayapo katika mfumo rasmi wa KICD.

4. **MAPENDEKEZO YA SHUGHULI ZA UJIFUNZAJI** — Lazima ianze na "**Mwanafunzi aweze:-**" kisha orodhesha shughuli 3-5 kwa kutumia alama ya dashi (-).
   - Shughuli ziwe MAHUSUSI na ZENYE VITENDO: kutathmini, kujadili, kutazama, kuchora, kuimba, kucheza, kuandika, kusoma, kutatua, kuorodhesha
   - Usiwe na maneno kama "kujifunza" — badala yake tumia shughuli zinazoonekana
   - Tumia mapendekezo rasmi ya KICD yaliyo hapa chini kama chanzo. USIBUNI shughuli mpya zinazozidi mfumo wa KICD.
   - Zingatia mazingira mbalimbali ya kujifunza (shuleni, nje, nyumbani)

5. **SWALI DADISI** — Tumia swali rasmi la KICD lililotolewa, au unda swali linalofanana. Swali liwe sahili kwa umri wa mtoto.
6. **MAREJELEO** — Lazima yawe MAHUSUSI na YENYE MAELEZO — si majina ya jumla tu.
    Daima anza na "{klb_title}" kisha ongeza rasilimali 2-4 mahususi zinazohusiana na matokeo ya somo.
7. **TATHMINI** — Njia za kutathmini: "Kuuliza na kujibu maswali, uchunguzi" au ongeza "zoezi la kuandika, evaluation ya kazi, tathmini ya wenzao".
8. **MAONI** — Daima "".
9. Nambari za wiki zianze kutoka {week_start}. Wiki moja = masomo {lessons_per_week}. Nambari za somo ZIANZIE UPYA kila wiki: 1, 2, 3... mpaka {lessons_per_week}, kisha rudi 1 kwa wiki inayofuata.
10. Masomo {total_lessons} yote yawe na mwelekeo wa kuendelea: TAMBULISHA dhana → ZOEZA ujuzi → TUMIA katika muktadha → KAGUA na tathmini.{verb_restriction_sw}{official_context}

Rudisha JSON array pekee ya vitu {batch_lessons}. Hakuna maandishi mengine."""

    # English
    return f"""You are an expert educational consultant specializing in the Kenyan Competency-Based Curriculum (CBC), aligned with the Ministry of Education and KICD (Kenya Institute of Curriculum Development) standards.

YOUR GOAL: Generate detailed, pedagogically sound Schemes of Work that develop learner COMPETENCY — the ability to apply a combination of Knowledge, Skills, and Attitudes (KSA) to perform a task. Output must be structured for official school records.

CRITICAL CONSTRAINT: You MUST ONLY use the official KICD data provided below. NEVER fabricate, invent, or hallucinate learning outcomes, strand names, sub-strand names, or curriculum content. If no official data is provided for a field, leave it generic but DO NOT make up specific curriculum content that does not exist in the KICD framework.

ABSOLUTE RULE FOR NON-LANGUAGE SUBJECTS (Environmental Activities, Mathematics, CRE, IRE, HRE, Creative Activities, Social Studies, Agriculture, Science & Technology):
- Your lesson learning outcomes MUST be DIRECTLY DERIVED from the official KICD learning outcomes listed below. Do NOT invent new outcomes or add concepts not in the KICD design.
- For example, if the KICD outcomes for "Heat" say "list sources of heat", "identify uses of heat", "carry out activities to conserve heat" — you MUST NOT add content about "measuring temperature with a thermometer", "conducting experiments", or ANY concept not explicitly stated in the official outcomes.
- Each lesson's SLOs must be a SUBSET or RESTATEMENT of the official KICD outcomes — never an expansion or invention.
- The learning experiences must ONLY use the KICD suggested experiences listed below. You may rephrase them but NEVER invent new activities that go beyond what the KICD design prescribes.

ENGLISH LANGUAGE ACTIVITIES — LETTER SOUND ALLOCATION RULE:
- For sub-strands involving letter sounds (e.g., "Pronunciation and Vocabulary", "Word Reading", "Fluency"), each lesson MUST focus on ONE specific letter or letter-sound combination.
- Allocate letter sounds sequentially across lessons: Lesson 1 = letter sound 1, Lesson 2 = letter sound 2, etc.
- Never lump multiple letter sounds into one lesson. Each lesson introduces, practises, and assesses ONE sound.
- Example for 60 lessons: s, a, t, i, p, n, e, d, r, m, g, o, c, k, u, l, f, b, h, j, v, w, x, y, z, sh, ch, th, wh, ck, ng, ai, ee, oo, ar, or, etc.

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

RULES:
1. Generate EXACTLY {batch_lessons} lesson rows for {grade} learners.
2. Keep everything SIMPLE, age-appropriate, and inclusive of diverse learning needs and environments.
3. **Lesson Learning Outcomes** — EXACTLY 3 outcomes per lesson, strictly one from each KSA domain IN THIS EXACT ORDER. Use the official KICD outcomes below as source material — do NOT invent new ones.
   MANDATORY FORMAT — no other format is acceptable:
   "By the end of the lesson, the learner should be able to:\\na) [Knowledge outcome — MUST start with a Knowledge verb]\\nb) [Skills outcome — MUST start with a Skills verb]\\nc) [Attitudes/Values outcome — MUST start with an Attitudes verb]"

   a) = KNOWLEDGE ONLY (The "What"). The FIRST WORD must be one of these verbs: identify, define, describe, name, outline, state, recognize, explain, list, label, recall, compare, classify, distinguish, illustrate, summarize.
      BANNED from a): practice, demonstrate, draw, create, observe, appreciate, value, show, enjoy, carry out, find out, learn about.

   b) = SKILLS ONLY (The "How"). The FIRST WORD must be one of these verbs: demonstrate, perform, practice, practise, draw, calculate, manipulate, use, construct, sing, measure, sketch, solve, trace, cut, colour, paint, observe, record, sort, conduct, participate, role-play, conserve, create, model, explore.
      BANNED from b): identify, define, describe, name, state, explain, list, appreciate, value, enjoy, know, understand.

   c) = ATTITUDES/VALUES ONLY (The "Value/Belief"). The FIRST WORD must be one of these verbs: appreciate, value, show, care, enjoy, uphold, persist, commit, respect, empathize, prioritize, develop, acknowledge.
      BANNED from c): identify, describe, name, explain, list, practice, demonstrate, draw, create, observe, carry out.

   THIS IS NON-NEGOTIABLE. If a) starts with "practice" or "observe" — THAT IS WRONG. If c) starts with "identify" or "describe" — THAT IS WRONG.
   Every lesson MUST have exactly a), b), c) — one knowledge, one skill, one attitude. No more, no less.
4. **Lesson Learning Experiences**: MUST begin with "Learner is guided to:" followed by EXACTLY 4 lettered activities, one for each domain plus application.
   - a) must relate to the KNOWLEDGE outcome (a) — e.g. if SLO a) says "identify locally available materials used as beddings", then experience a) should be "discuss locally available materials used as beddings"
   - b) must relate to the SKILLS outcome (b) — e.g. if SLO b) says "draw items used as beddings", then experience b) should be "draw items used as beddings" or a hands-on activity
   - c) must be an APPLICATION activity — applying the knowledge and skills in a real-world or practical context
   - d) must relate to the ATTITUDES/VALUES outcome (c) — an activity that develops the desired attitude or value
   MANDATORY FORMAT — no other format is acceptable:
   "Learner is guided to:\\na) [activity mirroring SLO a - knowledge]\\nb) [activity mirroring SLO b - skills]\\nc) [application activity]\\nd) [attitudes/values activity]"
   Use the official suggested experiences below as source material for the activities. Do NOT invent activities beyond what the KICD design provides.
   Activities must account for diverse learning environments and integrate CBC core competencies.
5. **Key Inquiry Question**: Use the official KICD question provided, or create a closely related child-friendly variant per lesson. Must be age-appropriate and trigger thinking (open-ended).
6. **Learning Resources**: MUST be SPECIFIC and DETAILED — not just generic names. Every resource must describe WHAT it contains relevant to the lesson's sub-strand and topic. Examples:
   - Instead of "audio clips" → "audio clips of word pronunciation for fluency practice"
   - Instead of "flash cards" → "flash cards with CVC words featuring target letter-sound combinations"
   - Instead of "charts" → "wall chart showing sources of heat in the environment"
    - Instead of "textbooks" → "{klb_title}, Learner's Book pages [relevant topic]"
    Always include "{klb_title}" as the first resource, then add 2-4 specific contextual resources relevant to the lesson's learning outcomes.
7. **Assessment**: Methods to evaluate learning — "oral questions, observation" or add "written exercise, portfolio, peer assessment" as appropriate. Must match the learning outcome.
8. **Reflection**: always "".
9. Week numbering starts from {week_start}. Fit exactly {lessons_per_week} lessons per week. Lesson numbers RESET each week: 1, 2, 3... up to {lessons_per_week}, then back to 1 for the next week. Example: Week 1 has lessons 1,2,3,4,5; Week 2 has lessons 1,2,3,4,5 — NOT lesson 6,7,8.
10. Progress gradually across {total_lessons} total lessons: INTRODUCE concepts → PRACTISE skills → APPLY in context → REVIEW and assess. Each lesson should build on the previous one.{verb_restriction_en}{official_context}

Return ONLY a valid JSON array of {batch_lessons} objects. No other text."""


def _build_user_prompt(
    *,
    grade: str,
    subject: str,
    strand: str,
    sub_strand_name: str,
    total_lessons: int,
    batch_lessons: int,
    batch_index: int,
    week_start: int,
    context: str,
    additional_info: Optional[str],
) -> str:
    """Source: generate-scheme/index.ts:842-855."""
    batch_desc = (
        f" (continuing from lesson {batch_index * MAX_LESSONS_PER_BATCH + 1} "
        "— do NOT repeat any content from previous lessons)"
        if batch_index > 0
        else ""
    )
    context_line = f"\n- Additional Resources: {context}" if context else ""
    add_line = f"\n- Additional Teacher Notes/Context: {additional_info}" if additional_info else ""
    return f"""Generate {batch_lessons} lesson rows for:
- Grade: {grade}, Subject: {subject}
- Strand: {strand}
- Sub-strand: {sub_strand_name} ({total_lessons} total lessons, this batch: {batch_lessons}){batch_desc}{context_line}{add_line}

CRITICAL: Every lesson MUST be unique. Do NOT repeat learning outcomes, experiences, or content from any other lesson. Do NOT create "continued practice" or "revision" lessons — each lesson must introduce NEW content or a NEW skill progression.

Each row: week, lesson, strand, subStrand, specificLearningOutcome, keyInquiryQuestion, learningExperiences, learningResources, assessmentMethods, reflection.
The "strand" field = "{strand}", the "subStrand" field = "{sub_strand_name}".
Start week numbering from {week_start}.

Return ONLY a JSON array of exactly {batch_lessons} objects."""


def _is_rate_limit_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return (
        "rate_limit" in msg
        or "rate limit" in msg
        or "429" in msg
        or "ratelimit" in msg
    )


# ────────────────────────────────────────────────────────────────────────────
# generateBatch — one Groq call, up to MAX_LESSONS_PER_BATCH rows.
# Source: generate-scheme/index.ts:595-891
# ────────────────────────────────────────────────────────────────────────────
async def generate_batch(
    provider: LLMProvider,
    *,
    grade: str,
    subject: str,
    strand: str,
    sub_strand: SubStrandInfo,
    batch_lessons: int,
    context: str,
    is_sw: bool,
    week_start: int,
    lessons_per_week: int,
    batch_index: int,
    indigenous_language: Optional[str] = None,
    additional_info: Optional[str] = None,
    allow_synthetic_context: bool = True,
) -> List[Dict[str, Any]]:
    """Generate one batch of raw scheme rows. Raises ``RateLimitError`` on 429.

    ``allow_synthetic_context=True`` (Ascendra default) bypasses Guardrail 8's
    hard refusal — if no official KICD data exists, we synthesize a curriculum
    context block from the strand/sub-strand names and let the LLM generate
    from there. Set to ``False`` to match scheme-scribe-ai's stricter behaviour.
    """
    sub_strand_name = sub_strand.get("name", "")
    total_lessons = sub_strand.get("lessons", batch_lessons)

    official_context, has_official_data = _build_official_context(
        sub_strand, strand=strand, grade=grade, subject=subject, is_sw=is_sw
    )

    # Guardrail 8 — sub-strand has no usable context at all.
    if not official_context and not allow_synthetic_context:
        raise NoOfficialDataError(
            f"{_NO_OFFICIAL_DATA_PREFIX} No verified KICD curriculum data "
            f'available for "{sub_strand_name}". Cannot generate without '
            "official learning outcomes."
        )

    official_context += _build_indigenous_language_block(
        indigenous_language, subject
    )

    verb_restriction_en, verb_restriction_sw = _build_verb_restriction_blocks(
        grade, subject
    )

    system_prompt = _build_system_prompt(
        grade=grade,
        subject=subject,
        batch_lessons=batch_lessons,
        total_lessons=total_lessons,
        week_start=week_start,
        lessons_per_week=lessons_per_week,
        is_sw=is_sw,
        official_context=official_context,
        verb_restriction_en=verb_restriction_en,
        verb_restriction_sw=verb_restriction_sw,
    )
    user_prompt = _build_user_prompt(
        grade=grade,
        subject=subject,
        strand=strand,
        sub_strand_name=sub_strand_name,
        total_lessons=total_lessons,
        batch_lessons=batch_lessons,
        batch_index=batch_index,
        week_start=week_start,
        context=context,
        additional_info=additional_info,
    )

    try:
        raw = await provider.generate(user_prompt, system=system_prompt)
    except Exception as exc:  # noqa: BLE001 — provider exceptions vary
        if _is_rate_limit_error(exc):
            log.warning(
                "Rate-limit hit for %s batch %d", sub_strand_name, batch_index
            )
            raise RateLimitError(_RATE_LIMIT_SENTINEL) from exc
        raise

    if not raw or not raw.strip():
        raise RuntimeError(
            f"AI returned empty response for {sub_strand_name} batch {batch_index}"
        )

    rows = extract_json_array(raw)
    log.info(
        "Batch %d: generated %d rows for %s (expected %d)%s",
        batch_index,
        len(rows),
        sub_strand_name,
        batch_lessons,
        " [with official KICD context]" if has_official_data else "",
    )
    return rows


# ────────────────────────────────────────────────────────────────────────────
# generateForSubStrand — outer loop, accumulates batches, then sanitizes.
# Source: generate-scheme/index.ts:893-950
# ────────────────────────────────────────────────────────────────────────────
async def generate_for_sub_strand(
    provider: LLMProvider,
    *,
    grade: str,
    subject: str,
    strand: str,
    sub_strand: SubStrandInfo,
    context: str = "",
    is_sw: Optional[bool] = None,
    week_start: int = 1,
    lessons_per_week: int = 5,
    indigenous_language: Optional[str] = None,
    additional_info: Optional[str] = None,
    allow_synthetic_context: bool = True,
    max_attempts: int = 3,
    retry_backoff_seconds: float = 2.0,
) -> Dict[str, Any]:
    """Generate the full lesson set for one sub-strand.

    Returns ``{"rows": SchemeRow[], "weeksUsed": int}`` matching the TS shape.
    ``RateLimitError`` and ``NoOfficialDataError`` propagate to the caller —
    the orchestrator decides whether to return partial rows or fail.
    """
    if is_sw is None:
        is_sw = subject in _KISWAHILI_SUBJECTS

    all_rows: List[Dict[str, Any]] = []
    remaining = sub_strand.get("lessons", 0)
    batch_index = 0

    while remaining > 0:
        batch_size = min(remaining, MAX_LESSONS_PER_BATCH)
        rows: Optional[List[Dict[str, Any]]] = None
        attempts = 0
        current_batch_size = batch_size

        while rows is None and attempts < max_attempts:
            attempts += 1
            try:
                rows = await generate_batch(
                    provider,
                    grade=grade,
                    subject=subject,
                    strand=strand,
                    sub_strand=sub_strand,
                    batch_lessons=current_batch_size,
                    context=context,
                    is_sw=is_sw,
                    week_start=week_start,
                    lessons_per_week=lessons_per_week,
                    batch_index=batch_index,
                    indigenous_language=indigenous_language,
                    additional_info=additional_info,
                    allow_synthetic_context=allow_synthetic_context,
                )
            except (RateLimitError, NoOfficialDataError):
                raise  # Never retry these; surface immediately.
            except ValueError as exc:
                # JSON recovery failed - try with smaller batch size
                error_msg = str(exc)
                if "Cannot recover truncated JSON" in error_msg or "No valid objects found" in error_msg:
                    if current_batch_size > 1 and attempts < max_attempts:
                        # Reduce batch size and retry
                        current_batch_size = max(1, current_batch_size // 2)
                        log.warning(
                            "JSON recovery failed for batch %d, reducing batch size to %d and retrying (attempt %d/%d)",
                            batch_index,
                            current_batch_size,
                            attempts,
                            max_attempts
                        )
                        await asyncio.sleep(retry_backoff_seconds)
                        continue
                    elif attempts >= max_attempts:
                        log.error(
                            "Failed to generate batch %d after %d attempts with batch sizes down to %d",
                            batch_index,
                            attempts,
                            current_batch_size
                        )
                        raise
                else:
                    # Other ValueError, retry normally
                    if attempts >= max_attempts:
                        raise
                    await asyncio.sleep(retry_backoff_seconds)
            except Exception:
                if attempts >= max_attempts:
                    raise
                # Brief pause before retry.
                await asyncio.sleep(retry_backoff_seconds)

        if rows:
            all_rows.extend(rows)
        remaining -= batch_size
        batch_index += 1

    # MASTER GUARDRAIL: validate & sanitize all rows.
    fixed_rows = validate_and_sanitize_rows(
        all_rows,
        strand=strand,
        sub_strand_name=sub_strand.get("name", ""),
        grade=grade,
        subject=subject,
        week_start=week_start,
        lessons_per_week=lessons_per_week,
        is_sw=is_sw,
        official_outcomes=sub_strand.get("learningOutcomes"),
    )

    # GUARDRAIL 9: enforce exact lesson count.
    final_rows = enforce_lesson_count(
        fixed_rows,
        sub_strand.get("lessons", len(fixed_rows)),
        week_start,
        lessons_per_week,
    )

    log.info(
        'Sub-strand "%s": expected %d lessons, delivering %d',
        sub_strand.get("name", ""),
        sub_strand.get("lessons", 0),
        len(final_rows),
    )

    # Ceiling division mirrors `Math.ceil(finalRows.length / lessonsPerWeek)`.
    total_weeks = (len(final_rows) + lessons_per_week - 1) // lessons_per_week if lessons_per_week else 0
    return {"rows": final_rows, "weeksUsed": total_weeks}
