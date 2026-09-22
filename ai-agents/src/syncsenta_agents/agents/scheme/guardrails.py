"""KICD/CBC guardrails for LLM-produced scheme rows.

Each function corresponds to a numbered guardrail in
``_inventory/scheme-scribe-ai/supabase/functions/generate-scheme/index.ts``.
The TS line numbers are noted alongside each function so we can re-port if the
upstream contract changes. The order of operations in
``validate_and_sanitize_rows`` is load-bearing — key normalization must run
first, then strand/numbering, then per-row content fixes, then SLO alignment
against KICD outcomes, then KSA verb enforcement, then deduplication, then a
final renumbering pass.

Guardrails 7 and 8 (refuse-without-official-data) are intentionally **not**
implemented as hard refusals here — the workspace ``.claude/CLAUDE.md``
documents ``CURRICULUM_REGISTRY`` as "optional guardrails, not a gate". The
LessonArchitectAgent already handles the soft-warning path; this module only
contains the deterministic content fixups.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from .normalize import SchemeRow, normalize_row_keys

log = logging.getLogger(__name__)

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


def _grade_num(grade: str) -> int:
    """Pull the numeric grade out of ``"Grade N"``; returns ``0`` if absent."""
    m = re.search(r"\d+", grade or "")
    return int(m.group(0)) if m else 0


# ────────────────────────────────────────────────────────────────────────────
# Helper: KLB Visionary Learner's Book titles (used by ensure_no_empty_fields
# and by the LLM prompt that mentions it as the first resource).
# Source: generate-scheme/index.ts:89-108
# ────────────────────────────────────────────────────────────────────────────
def get_klb_book_title(subject: str, grade: str) -> str:
    grade_num = _grade_num(grade)
    is_sw = subject in _KISWAHILI_SUBJECTS

    if 1 <= grade_num <= 3:
        titles: Dict[str, str] = {
            "English Activities": f"KLB Visionary English Literacy Activities {grade}",
            "Kiswahili": f"KLB Visionary Kiswahili Gredi {grade_num}",
            "Mathematics": f"KLB Visionary Mathematical Activities {grade}",
            "Environmental Activities": f"KLB Visionary Environmental Activities {grade}",
            "Creative Activities": f"KLB Visionary Creative Activities {grade}",
            "CRE": f"KLB Visionary CRE Activities {grade}",
            "IRE": f"KLB Visionary IRE Activities {grade}",
            "HRE": f"KLB Visionary HRE Activities {grade}",
            "Indigenous Language": f"KLB Visionary Indigenous Language Activities {grade}",
        }
        return titles.get(subject, f"KLB Visionary {subject} {grade}")

    if is_sw:
        return f"KLB Visionary Kiswahili Gredi {grade_num}"
    return f"KLB Visionary {subject} {grade}"


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 1: deterministic week/lesson numbering.
# Source: generate-scheme/index.ts:110-123
# ────────────────────────────────────────────────────────────────────────────
def enforce_week_lesson_numbering(
    rows: List[SchemeRow], week_start: int, lessons_per_week: int
) -> List[SchemeRow]:
    """Rewrite week and lesson numbers in place-by-copy.

    The LLM is unreliable at counting; deterministic numbering means the table
    always reads 1..N within each week and rolls over correctly. Pure: returns
    new dicts, does not mutate.
    """
    current_week = week_start
    current_lesson = 1
    out: List[SchemeRow] = []
    for row in rows:
        fixed: SchemeRow = {**row, "week": current_week, "lesson": current_lesson}  # type: ignore[typeddict-item]
        out.append(fixed)
        current_lesson += 1
        if current_lesson > lessons_per_week:
            current_lesson = 1
            current_week += 1
    return out


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 2: clamp strand/subStrand to the requested values.
# Source: generate-scheme/index.ts:126-128
# ────────────────────────────────────────────────────────────────────────────
def enforce_strand_names(
    rows: List[SchemeRow], strand: str, sub_strand_name: str
) -> List[SchemeRow]:
    return [{**row, "strand": strand, "subStrand": sub_strand_name} for row in rows]  # type: ignore[misc]


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 3: validate & fix the Specific Learning Outcome shape.
# Source: generate-scheme/index.ts:131-176
# ────────────────────────────────────────────────────────────────────────────
def validate_and_fix_slo(slo: str, is_sw: bool) -> str:
    if not slo or not slo.strip():
        if is_sw:
            return (
                "**Kufikia mwisho wa somo mwanafunzi aweze:**\n"
                "-kutambua [maarifa]\n"
                "-kutekeleza [ujuzi]\n"
                "-kufurahia [mitazamo]"
            )
        return (
            "By the end of the lesson, the learner should be able to:\n"
            "a) [Knowledge outcome]\n"
            "b) [Skills outcome]\n"
            "c) [Attitudes/Values outcome]"
        )

    if is_sw:
        has_header = re.search(r"kufikia mwisho wa somo", slo, re.IGNORECASE) is not None
        has_dashes = re.search(r"-ku", slo) is not None
        if has_header and has_dashes:
            return slo.strip()
        fixed = slo
        if not has_header:
            fixed = "**Kufikia mwisho wa somo mwanafunzi aweze:**\n" + fixed.strip()
        # Convert a) b) c) → dashes
        fixed = re.sub(r"\n\s*[a-c]\)\s*", "\n-", fixed, flags=re.IGNORECASE)
        return fixed

    has_a = "a)" in slo
    has_b = "b)" in slo
    has_c = "c)" in slo
    fixed = slo
    if has_a and has_b and has_c:
        if "by the end of the lesson" not in fixed.lower():
            fixed = "By the end of the lesson, the learner should be able to:\n" + fixed.strip()
        return fixed

    # Try to repair from numbered or unprefixed lines.
    lines = [
        line.strip()
        for line in re.split(r"\n|(?=\d\.\s)", slo)
        if line.strip()
    ]
    content = [line for line in lines if "by the end" not in line.lower()]
    if len(content) >= 3:
        cleaned = [
            re.sub(r"^[a-c]\)\s*|^\d+[\.\)]\s*", "", line, flags=re.IGNORECASE)
            for line in content[:3]
        ]
        return (
            "By the end of the lesson, the learner should be able to:\n"
            f"a) {cleaned[0]}\n"
            f"b) {cleaned[1]}\n"
            f"c) {cleaned[2]}"
        )
    log.warning("SLO format could not be auto-fixed: %s", slo[:80])
    return slo


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 4: validate & fix Learning Experiences.
# Source: generate-scheme/index.ts:179-224
# ────────────────────────────────────────────────────────────────────────────
def validate_and_fix_experiences(exp: str, is_sw: bool) -> str:
    if not exp or not exp.strip():
        if is_sw:
            return (
                "**Mwanafunzi aweze:-**\n"
                "-kujadili [maarifa]\n"
                "-kutekeleza [ujuzi]\n"
                "-kutumia [utumiaji]\n"
                "-kuthamini [mitazamo]"
            )
        return (
            "Learner is guided to:\n"
            "a) [Knowledge activity]\n"
            "b) [Skills activity]\n"
            "c) [Application activity]\n"
            "d) [Attitudes/Values activity]"
        )

    if is_sw:
        has_header = re.search(r"mwanafunzi aweze", exp, re.IGNORECASE) is not None
        has_dashes = re.search(r"-ku", exp) is not None
        if has_header and has_dashes:
            return exp.strip()
        fixed = exp
        if not has_header:
            fixed = "**Mwanafunzi aweze:-**\n" + fixed.strip()
        fixed = re.sub(r"\n\s*[a-d]\)\s*", "\n-", fixed, flags=re.IGNORECASE)
        return fixed

    has_guided = re.search(r"learner is guided to", exp, re.IGNORECASE) is not None
    has_a = "a)" in exp
    has_b = "b)" in exp
    has_c = "c)" in exp
    has_d = "d)" in exp
    fixed = exp.strip()
    if has_guided and has_a and has_b and has_c and has_d:
        return fixed
    if not has_guided:
        fixed = "Learner is guided to:\n" + fixed
    if not (has_a and has_b and has_c and has_d):
        lines = [
            line.strip()
            for line in re.split(r"\n|(?<=\.)\s+", fixed)
            if line.strip() and "learner is guided" not in line.lower()
        ]
        if len(lines) >= 4:
            cleaned = [
                re.sub(r"^[a-d]\)\s*|^[-•]\s*", "", line, flags=re.IGNORECASE)
                for line in lines[:4]
            ]
            return (
                "Learner is guided to:\n"
                f"a) {cleaned[0]}\n"
                f"b) {cleaned[1]}\n"
                f"c) {cleaned[2]}\n"
                f"d) {cleaned[3]}"
            )
    return fixed


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 5: fill required fields with sensible defaults.
# Source: generate-scheme/index.ts:227-239
# ────────────────────────────────────────────────────────────────────────────
def ensure_no_empty_fields(row: SchemeRow, grade: str, subject: str) -> SchemeRow:
    return SchemeRow(
        week=row.get("week", 1),
        lesson=row.get("lesson", 1),
        strand=row.get("strand") or subject,
        subStrand=row.get("subStrand") or "",
        specificLearningOutcome=row.get("specificLearningOutcome") or "",
        keyInquiryQuestion=row.get("keyInquiryQuestion") or "What have we learned today?",
        learningExperiences=row.get("learningExperiences") or "",
        learningResources=row.get("learningResources") or get_klb_book_title(subject, grade),
        assessmentMethods=row.get("assessmentMethods") or "Oral questions, observation",
        reflection=row.get("reflection") or "What became clearer, and what should the learner practise next?",
    )


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 9: enforce exact lesson count — trim only, never pad.
# Source: generate-scheme/index.ts:286-298
# ────────────────────────────────────────────────────────────────────────────
def enforce_lesson_count(
    rows: List[SchemeRow],
    expected_lessons: int,
    week_start: int,
    lessons_per_week: int,
) -> List[SchemeRow]:
    if len(rows) == expected_lessons:
        return rows
    if len(rows) > expected_lessons:
        log.warning(
            "Guardrail 9: trimming %d rows to expected %d",
            len(rows),
            expected_lessons,
        )
        trimmed = rows[:expected_lessons]
        return enforce_week_lesson_numbering(trimmed, week_start, lessons_per_week)
    # Short → keep what we have. Padding with "continued" lessons is worse
    # than missing rows because the LLM tends to repeat itself.
    log.warning(
        "Guardrail 9: have %d rows but expected %d. Keeping all unique rows.",
        len(rows),
        expected_lessons,
    )
    return enforce_week_lesson_numbering(rows, week_start, lessons_per_week)


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 10: SLO must overlap an official KICD learning outcome.
# Source: generate-scheme/index.ts:304-350
# ────────────────────────────────────────────────────────────────────────────
def validate_slo_alignment(
    rows: List[SchemeRow],
    official_outcomes: Optional[Sequence[str]],
    is_sw: bool,
) -> List[SchemeRow]:
    if not official_outcomes:
        return rows

    outcome_keywords: List[set[str]] = [
        {w for w in outcome.lower().split() if len(w) >= 3}
        for outcome in official_outcomes
    ]

    def matches_any(slo_text: str) -> bool:
        slo_lower = slo_text.lower()
        for kws in outcome_keywords:
            if not kws:
                continue
            hits = sum(1 for kw in kws if kw in slo_lower)
            if hits / len(kws) >= 0.4:
                return True
        return False

    outcome_index = 0
    out: List[SchemeRow] = []
    for idx, row in enumerate(rows):
        if matches_any(row.get("specificLearningOutcome", "")):
            out.append(row)
            continue
        log.warning(
            "Guardrail 10: SLO for lesson %d doesn't align with KICD outcomes — rewriting.",
            idx + 1,
        )
        primary = official_outcomes[outcome_index % len(official_outcomes)]
        secondary = official_outcomes[(outcome_index + 1) % len(official_outcomes)]
        tertiary = official_outcomes[(outcome_index + 2) % len(official_outcomes)]
        outcome_index += 1
        if is_sw:
            new_slo = (
                "**Kufikia mwisho wa somo mwanafunzi aweze:**\n"
                f"-{primary}\n-{secondary}\n-{tertiary}"
            )
        else:
            new_slo = (
                "By the end of the lesson, the learner should be able to:\n"
                f"a) {primary}\nb) {secondary}\nc) {tertiary}"
            )
        out.append({**row, "specificLearningOutcome": new_slo})  # type: ignore[misc]
    return out


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 11: rigid KSA structure. a)=K, b)=S, c)=A. Reorder if needed.
# Source: generate-scheme/index.ts:354-487
# ────────────────────────────────────────────────────────────────────────────
_KNOWLEDGE_VERBS_EN: Tuple[str, ...] = (
    "identify", "define", "describe", "name", "outline", "state", "recognize",
    "explain", "list", "label", "recall", "summarize", "distinguish",
    "illustrate", "compare", "classify",
)
_SKILLS_VERBS_EN: Tuple[str, ...] = (
    "demonstrate", "perform", "practice", "practise", "model", "draw",
    "calculate", "manipulate", "use", "collaborate", "execute", "construct",
    "sing", "measure", "sketch", "solve", "trace", "cut", "colour", "paint",
    "observe", "record", "differentiate", "interpret", "suggest", "role-play",
    "conduct", "participate", "sort", "express", "create", "conserve",
)
_ATTITUDE_VERBS_EN: Tuple[str, ...] = (
    "appreciate", "value", "show", "care", "demonstrate responsibility",
    "acknowledge", "enjoy", "uphold", "persist", "commit", "adhere",
    "advocate", "respect", "empathize", "prioritize", "develop",
)
_KNOWLEDGE_VERBS_SW: Tuple[str, ...] = (
    "kutambua", "kutaja", "kuorodhesha", "kueleza", "kufafanua",
    "kulinganisha", "kutofautisha", "kuelezea", "kubainisha",
)
_SKILLS_VERBS_SW: Tuple[str, ...] = (
    "kutekeleza", "kutumia", "kujenga", "kuonyesha", "kuchora", "kuhesabu",
    "kupima", "kutatua", "kuimba", "kukata", "kupaka", "kushiriki",
    "kufanya mazoezi", "kupanga", "kurekodi", "kucheza jukumu", "kuunda",
)
_ATTITUDE_VERBS_SW: Tuple[str, ...] = (
    "kufurahia", "kuheshimu", "kuthamini", "kushirikiana", "kuzingatia",
    "kuendeleza", "kutetea", "kujali", "kujitolea", "kuweka kipaumbele",
)
_BANNED_VERBS_EN: Tuple[str, ...] = (
    "know", "understand", "be aware", "learn to", "have a positive attitude",
    "carry out", "find out", "look at", "get to know", "learn about",
    "talk about", "go through",
)
_BANNED_VERBS_SW: Tuple[str, ...] = ("kujua", "kuelewa")


def _starts_with_verb(text: str, verbs: Iterable[str]) -> bool:
    lower = text.lower().strip()
    return any(lower.startswith(v) for v in verbs)


def _contains_banned_verb(text: str, banned: Iterable[str]) -> Optional[str]:
    lower = text.lower()
    for v in banned:
        if v in lower:
            return v
    return None


def _replace_banned_verbs(text: str, is_sw: bool) -> str:
    fixed = text
    if not is_sw:
        replacements: Tuple[Tuple[str, str], ...] = (
            (r"\bknow\b", "identify"),
            (r"\bunderstand\b", "describe"),
            (r"\bbe aware of\b", "recognize"),
            (r"\blearn to\b", ""),
            (r"\bhave a positive attitude\b", "appreciate"),
            (r"\bcarry out\b", "practice"),
            (r"\bfind out\b", "identify"),
            (r"\blook at\b", "observe"),
            (r"\bget to know\b", "recognize"),
            (r"\blearn about\b", "identify"),
            (r"\btalk about\b", "describe"),
            (r"\bgo through\b", "explore"),
        )
    else:
        replacements = (
            (r"\bkujua\b", "kutambua"),
            (r"\bkuelewa\b", "kueleza"),
        )
    for pattern, replacement in replacements:
        fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)
    return fixed


def _reassemble_slo(original_slo: str, parts: List[str], is_sw: bool) -> str:
    """Stitch the K/S/A parts back into a SchemeRow-ready SLO string.

    Source: generate-scheme/index.ts:479-487.
    """
    if is_sw:
        header = original_slo.split("\n")[0]
        return f"{header}\n-{parts[0]}\n-{parts[1]}\n-{parts[2]}"
    header_match = re.match(r"(.*?)\n\s*a\)", original_slo, re.DOTALL)
    header = (
        header_match.group(1).strip()
        if header_match
        else "By the end of the lesson, the learner should be able to:"
    )
    return f"{header}\na) {parts[0]}\nb) {parts[1]}\nc) {parts[2]}"


def validate_ksa_structure(rows: List[SchemeRow], is_sw: bool) -> List[SchemeRow]:
    k_verbs = _KNOWLEDGE_VERBS_SW if is_sw else _KNOWLEDGE_VERBS_EN
    s_verbs = _SKILLS_VERBS_SW if is_sw else _SKILLS_VERBS_EN
    a_verbs = _ATTITUDE_VERBS_SW if is_sw else _ATTITUDE_VERBS_EN
    banned = _BANNED_VERBS_SW if is_sw else _BANNED_VERBS_EN

    out: List[SchemeRow] = []
    for idx, row in enumerate(rows):
        slo = row.get("specificLearningOutcome", "")
        if not slo or len(slo.strip()) < 20:
            out.append(row)
            continue

        # Extract the 3 parts.
        parts: List[str] = []
        if is_sw:
            lines = [
                line for line in slo.split("\n") if line.strip().startswith("-")
            ]
            parts = [re.sub(r"^-\s*", "", line).strip() for line in lines]
        else:
            a_match = re.search(r"a\)\s*(.+?)(?=\nb\)|$)", slo, re.DOTALL)
            b_match = re.search(r"b\)\s*(.+?)(?=\nc\)|$)", slo, re.DOTALL)
            c_match = re.search(r"c\)\s*(.+)", slo, re.DOTALL)
            if a_match:
                parts.append(a_match.group(1).strip())
            if b_match:
                parts.append(b_match.group(1).strip())
            if c_match:
                parts.append(c_match.group(1).strip())

        if len(parts) < 3:
            out.append(row)
            continue

        # Replace banned verbs in each part first.
        cleaned_parts: List[str] = []
        for p in parts:
            hit = _contains_banned_verb(p, banned)
            if hit:
                log.warning(
                    "Guardrail 11: lesson %d — banned verb %r found, replacing.",
                    idx + 1,
                    hit,
                )
                cleaned_parts.append(_replace_banned_verbs(p, is_sw))
            else:
                cleaned_parts.append(p)
        parts = cleaned_parts

        # If already a=K, b=S, c=A, just reassemble (the parts may have been
        # rewritten by banned-verb replacement).
        a_is_k = _starts_with_verb(parts[0], k_verbs)
        b_is_s = _starts_with_verb(parts[1], s_verbs)
        c_is_a = _starts_with_verb(parts[2], a_verbs)
        if a_is_k and b_is_s and c_is_a:
            out.append({**row, "specificLearningOutcome": _reassemble_slo(slo, parts, is_sw)})  # type: ignore[misc]
            continue

        # Reorder: find the K, S, A parts.
        k_part = ""
        s_part = ""
        a_part = ""
        for p in parts:
            if not k_part and _starts_with_verb(p, k_verbs):
                k_part = p
            elif not s_part and _starts_with_verb(p, s_verbs):
                s_part = p
            elif not a_part and _starts_with_verb(p, a_verbs):
                a_part = p

        # Assign unmatched parts to whatever slots remain empty, preserving
        # the LLM's content rather than discarding it.
        unmatched = [p for p in parts if p not in (k_part, s_part, a_part)]
        if not k_part and unmatched:
            k_part = unmatched.pop(0)
        if not s_part and unmatched:
            s_part = unmatched.pop(0)
        if not a_part and unmatched:
            a_part = unmatched.pop(0)

        new_parts = [k_part or parts[0], s_part or parts[1], a_part or parts[2]]
        if new_parts != parts:
            log.warning(
                "Guardrail 11: lesson %d — KSA order was wrong. Rearranged K=%r S=%r A=%r",
                idx + 1,
                new_parts[0][:30],
                new_parts[1][:30],
                new_parts[2][:30],
            )
        out.append(
            {**row, "specificLearningOutcome": _reassemble_slo(slo, new_parts, is_sw)}  # type: ignore[misc]
        )
    return out


# ────────────────────────────────────────────────────────────────────────────
# Guardrail 12: lower-primary non-language subjects need age-appropriate verbs.
# Source: generate-scheme/index.ts:517-576
# ────────────────────────────────────────────────────────────────────────────
_LOWER_PRIMARY_REPLACEMENTS_EN: Tuple[Tuple[str, str], ...] = (
    (r"\bwrite\b", "draw"),
    (r"\bwriting\b", "drawing"),
    (r"\bread\b", "observe"),
    (r"\breading\b", "observing"),
    (r"\bsummarize\b", "describe"),
    (r"\bsummarise\b", "describe"),
    (r"\bcompose\b", "show"),
    (r"\banalyse\b", "sort"),
    (r"\banalyze\b", "sort"),
    (r"\bevaluate\b", "show"),
    (r"\bsynthesize\b", "group"),
    (r"\bhypothesize\b", "suggest"),
    (r"\bformulate\b", "suggest"),
    (r"\bcompile\b", "collect"),
    (r"\bcarry out\b", "practice"),
    (r"\bcarrying out\b", "practicing"),
    (r"\bfind out\b", "identify"),
    (r"\bfinding out\b", "identifying"),
    (r"\blearn about\b", "identify"),
    (r"\blearning about\b", "identifying"),
    (r"\btalk about\b", "describe"),
    (r"\btalking about\b", "describing"),
    (r"\blook at\b", "observe"),
    (r"\blooking at\b", "observing"),
    (r"\bgo through\b", "explore"),
    (r"\bgoing through\b", "exploring"),
    (r"\bget to know\b", "recognize"),
    (r"\bgetting to know\b", "recognizing"),
    (r"\bdo\b(?=\s+(?:a|an|the|some|simple))", "conduct"),
)
_LOWER_PRIMARY_REPLACEMENTS_SW: Tuple[Tuple[str, str], ...] = (
    (r"\bkuandika\b", "kuchora"),
    (r"\bkusoma\b", "kutazama"),
    (r"\bkufupisha\b", "kutaja"),
    (r"\bkutunga\b", "kuonyesha"),
    (r"\bkufanya shughuli\b", "kushiriki"),
    (r"\bkujua kuhusu\b", "kutambua"),
    (r"\bkuangalia tu\b", "kuangalia"),
    (r"\bkupitia\b", "kuchunguza"),
)


def _apply_lower_primary_verb_replacements(
    rows: List[SchemeRow], grade: str, subject: str, is_sw: bool
) -> List[SchemeRow]:
    grade_num = _grade_num(grade)
    if not (1 <= grade_num <= 3) or subject in _LANGUAGE_SUBJECTS:
        return rows

    replacements = (
        _LOWER_PRIMARY_REPLACEMENTS_SW if is_sw else _LOWER_PRIMARY_REPLACEMENTS_EN
    )

    out: List[SchemeRow] = []
    for idx, row in enumerate(rows):
        slo = row.get("specificLearningOutcome", "")
        exp = row.get("learningExperiences", "")
        changed = False
        for pattern, replacement in replacements:
            if re.search(pattern, slo, re.IGNORECASE):
                slo = re.sub(pattern, replacement, slo, flags=re.IGNORECASE)
                changed = True
            if re.search(pattern, exp, re.IGNORECASE):
                exp = re.sub(pattern, replacement, exp, flags=re.IGNORECASE)
                changed = True
        if changed:
            log.warning(
                "Guardrail 12: lesson %d — replaced inappropriate verbs for %s %s",
                idx + 1,
                grade,
                subject,
            )
        out.append({**row, "specificLearningOutcome": slo, "learningExperiences": exp})  # type: ignore[misc]
    return out


# ────────────────────────────────────────────────────────────────────────────
# MASTER ORCHESTRATOR: apply every guardrail in the documented order.
# Source: generate-scheme/index.ts:492-591
# ────────────────────────────────────────────────────────────────────────────
def validate_and_sanitize_rows(
    raw_rows: Sequence[Dict],
    *,
    strand: str,
    sub_strand_name: str,
    grade: str,
    subject: str,
    week_start: int,
    lessons_per_week: int,
    is_sw: bool,
    official_outcomes: Optional[Sequence[str]] = None,
) -> List[SchemeRow]:
    """Run the full guardrail chain. Order matters — see module docstring."""
    log.info("Guardrails: processing %d raw rows", len(raw_rows))

    # 6 (key normalization) → 2 (strand names) → 1 (numbering)
    rows: List[SchemeRow] = [normalize_row_keys(dict(r)) for r in raw_rows]
    rows = enforce_strand_names(rows, strand, sub_strand_name)
    rows = enforce_week_lesson_numbering(rows, week_start, lessons_per_week)

    # 5 (no empty fields) → 3 (SLO shape) → 4 (experiences shape), per row.
    fixed_rows: List[SchemeRow] = []
    for row in rows:
        filled = ensure_no_empty_fields(row, grade, subject)
        fixed_rows.append(
            {  # type: ignore[misc]
                **filled,
                "specificLearningOutcome": validate_and_fix_slo(
                    filled.get("specificLearningOutcome", ""), is_sw
                ),
                "learningExperiences": validate_and_fix_experiences(
                    filled.get("learningExperiences", ""), is_sw
                ),
            }
        )
    rows = fixed_rows

    # 10 (SLO alignment with KICD outcomes)
    rows = validate_slo_alignment(rows, official_outcomes, is_sw)
    # 11 (rigid KSA structure)
    rows = validate_ksa_structure(rows, is_sw)
    # 12 (lower-primary verb replacement)
    rows = _apply_lower_primary_verb_replacements(rows, grade, subject, is_sw)

    # Dedup by SLO prefix — duplicates almost always indicate the LLM
    # repeated itself across batches.
    seen: set[str] = set()
    deduped: List[SchemeRow] = []
    for row in rows:
        key = row.get("specificLearningOutcome", "")[:100]
        if key in seen:
            log.warning("Guardrails: found duplicate row, removing")
            continue
        seen.add(key)
        deduped.append(row)

    final = enforce_week_lesson_numbering(deduped, week_start, lessons_per_week)
    log.info(
        "Guardrails: %d rows passed validation (from %d raw)",
        len(final),
        len(raw_rows),
    )
    return final
