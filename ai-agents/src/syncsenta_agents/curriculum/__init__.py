"""KICD CBC curriculum registry.

Hand-ported from scheme-scribe-ai/src/data/curriculum/index.ts. Pulls together
the auto-generated grade/subject modules (under lower_primary/ and
upper_primary/) into a single lookup keyed by ``"Grade X|Subject"``.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional

from .types import StrandInfo, SubStrandInfo, SchemeRow, LiteracyCurriculumEnvelope
from .ai_literacy import AI_BLOCKCHAIN_PROGRESSION, AI_LITERACY_VERSION, grade6AILiteracy
from .ai_identifiers import grade7AIIdentifiers, grade8AIIdentifiers, grade9AIIdentifiers, grade10AIIdentifiers, grade11AIIdentifiers, grade12AIIdentifiers
from .blockchain_literacy import (
    grade6BlockchainLiteracy, grade7BlockchainLiteracy, grade8BlockchainLiteracy,
    grade9BlockchainLiteracy, grade10BlockchainLiteracy, grade11BlockchainLiteracy,
    grade12BlockchainLiteracy,
)

LITERACY_SCHEMA_VERSION = "2026-09-22.phase1.v1"
BLOCKCHAIN_LITERACY_VERSION = "2026-09-22.blockchain-literacy.v1"
_LITERACY_PROVENANCE = "Syncsenta authored AI and Blockchain Literacy progression"
_LITERACY_PROHIBITED_OPERATIONS = [
    "credentials", "personal_identity_data", "precise_location_data",
    "wallets", "tokens", "seed_phrases", "private_keys", "trading",
    "real_transactions", "unsupervised_external_ai",
]

# --- Grade/subject data -------------------------------------------------

from .lower_primary.creative_activities import (
    grade1CreativeActivities,
    grade2CreativeActivities,
    grade3CreativeActivities,
)
from .lower_primary.cre import grade1CRE, grade2CRE, grade3CRE
from .lower_primary.english_activities import (
    grade1EnglishActivities,
    grade2EnglishActivities,
    grade3EnglishActivities,
)
from .lower_primary.environmental_activities import (
    grade1EnvironmentalActivities,
    grade2EnvironmentalActivities,
    grade3EnvironmentalActivities,
)
from .lower_primary.hre import grade1HRE, grade2HRE, grade3HRE
from .lower_primary.ire import grade1IRE, grade2IRE, grade3IRE
from .lower_primary.kiswahili import (
    grade1Kiswahili,
    grade2Kiswahili,
    grade3Kiswahili,
)
from .lower_primary.mathematics import (
    grade1Mathematics,
    grade2Mathematics,
    grade3Mathematics,
)
from .upper_primary.agriculture import grade6Agriculture
from .upper_primary.agriculture_grade4 import grade4Agriculture
from .upper_primary.creative_arts import grade4CreativeArts
from .upper_primary.creative_arts_grade5 import grade5CreativeArts
from .upper_primary.cre import grade4CRE
from .upper_primary.english import grade4English, grade5English, grade6English
from .upper_primary.indigenous_language import (
    grade4IndigenousLanguage,
    grade5IndigenousLanguage,
    grade6IndigenousLanguage,
)
from .upper_primary.kiswahili import grade4Kiswahili
from .upper_primary.kiswahili_grade6 import grade6Kiswahili
from .upper_primary.mathematics_grade5 import grade5Mathematics
from .upper_primary.mathematics_grade6 import grade6Mathematics
from .upper_primary.science_technology_grade4 import grade4ScienceTechnology
from .upper_primary.social_studies import grade4SocialStudies
from .upper_primary.social_studies_grade6 import grade6SocialStudies


_HARDCODED_STRANDS: Dict[str, List[StrandInfo]] = {
    "Grade 1|Creative Activities": grade1CreativeActivities,
    "Grade 2|Creative Activities": grade2CreativeActivities,
    "Grade 3|Creative Activities": grade3CreativeActivities,
    "Grade 1|CRE": grade1CRE,
    "Grade 2|CRE": grade2CRE,
    "Grade 3|CRE": grade3CRE,
    "Grade 1|HRE": grade1HRE,
    "Grade 2|HRE": grade2HRE,
    "Grade 3|HRE": grade3HRE,
    "Grade 1|IRE": grade1IRE,
    "Grade 2|IRE": grade2IRE,
    "Grade 3|IRE": grade3IRE,
    "Grade 1|Kiswahili": grade1Kiswahili,
    "Grade 2|Kiswahili": grade2Kiswahili,
    "Grade 3|Kiswahili": grade3Kiswahili,
    "Grade 1|Environmental Activities": grade1EnvironmentalActivities,
    "Grade 2|Environmental Activities": grade2EnvironmentalActivities,
    "Grade 3|Environmental Activities": grade3EnvironmentalActivities,
    "Grade 1|English Activities": grade1EnglishActivities,
    "Grade 2|English Activities": grade2EnglishActivities,
    "Grade 3|English Activities": grade3EnglishActivities,
    "Grade 1|Mathematics": grade1Mathematics,
    "Grade 2|Mathematics": grade2Mathematics,
    "Grade 3|Mathematics": grade3Mathematics,
    "Grade 4|CRE": grade4CRE,
    "Grade 4|Creative Arts": grade4CreativeArts,
    "Grade 5|Creative Arts": grade5CreativeArts,
    "Grade 4|English": grade4English,
    "Grade 4|Indigenous Language": grade4IndigenousLanguage,
    "Grade 4|Social Studies": grade4SocialStudies,
    "Grade 5|English": grade5English,
    "Grade 5|Indigenous Language": grade5IndigenousLanguage,
    "Grade 6|Indigenous Language": grade6IndigenousLanguage,
    "Grade 6|English": grade6English,
    "Grade 4|Agriculture": grade4Agriculture,
    "Grade 6|Agriculture": grade6Agriculture,
    "Grade 4|Science & Technology": grade4ScienceTechnology,
    "Grade 4|Kiswahili": grade4Kiswahili,
    "Grade 6|Kiswahili": grade6Kiswahili,
    "Grade 5|Mathematics": grade5Mathematics,
    "Grade 6|Mathematics": grade6Mathematics,
    "Grade 6|Social Studies": grade6SocialStudies,
    "Grade 6|AI": grade6AILiteracy,
    "Grade 6|AI Literacy": grade6AILiteracy,
    "Grade 7|AI Literacy": grade7AIIdentifiers,
    "Grade 8|AI Literacy": grade8AIIdentifiers,
    "Grade 9|AI Literacy": grade9AIIdentifiers,
    "Grade 10|AI Literacy": grade10AIIdentifiers,
    "Grade 11|AI Literacy": grade11AIIdentifiers,
    "Grade 12|AI Literacy": grade12AIIdentifiers,
    "Grade 6|Blockchain Literacy": grade6BlockchainLiteracy,
    "Grade 7|Blockchain Literacy": grade7BlockchainLiteracy,
    "Grade 8|Blockchain Literacy": grade8BlockchainLiteracy,
    "Grade 9|Blockchain Literacy": grade9BlockchainLiteracy,
    "Grade 10|Blockchain Literacy": grade10BlockchainLiteracy,
    "Grade 11|Blockchain Literacy": grade11BlockchainLiteracy,
    "Grade 12|Blockchain Literacy": grade12BlockchainLiteracy,
}


def get_hardcoded_strands(grade: str, subject: str) -> Optional[List[StrandInfo]]:
    """Return the official KICD strand list for a grade+subject, or None."""
    return _HARDCODED_STRANDS.get(f"{grade}|{subject}")


def get_literacy_envelope(
    grade: str, subject: str
) -> Optional[LiteracyCurriculumEnvelope]:
    """Return the canonical shared envelope for an authored literacy pack."""
    canonical_grade = normalize_grade_label(grade)
    canonical_subject = normalize_subject_label(subject)
    if canonical_subject not in {"AI Literacy", "Blockchain Literacy"}:
        return None
    if f"{canonical_grade}|{canonical_subject}" not in CURRICULUM_REGISTRY:
        return None
    number = int(canonical_grade.split()[-1])
    grade_band = (
        "upper_primary" if number <= 6 else
        "junior_secondary" if number <= 9 else
        "senior_school"
    )
    version = AI_LITERACY_VERSION if canonical_subject == "AI Literacy" else BLOCKCHAIN_LITERACY_VERSION
    return {
        "curriculumId": f"{canonical_grade}|{canonical_subject}",
        "schemaVersion": LITERACY_SCHEMA_VERSION,
        "curriculumVersion": version,
        "grade": canonical_grade,
        "subject": canonical_subject,
        "gradeBand": grade_band,
        "lessonsPerWeek": get_lessons_per_week(canonical_grade, canonical_subject),
        "sourceType": "authored",
        "provenance": _LITERACY_PROVENANCE,
        "evidenceRequired": True,
        "teacherMediationRequired": True,
        "syntheticDataOnly": True,
        "externalActionsAllowed": False,
        "prohibitedOperations": list(_LITERACY_PROHIBITED_OPERATIONS),
        "releaseState": "teacher_review",
    }


def get_sub_strands_for_strand(
    grade: str, subject: str, strand_name: str
) -> Optional[List[SubStrandInfo]]:
    """Return sub-strands for a given strand, or None if not found."""
    strands = get_hardcoded_strands(grade, subject)
    if not strands:
        return None
    found = next((s for s in strands if s["name"] == strand_name), None)
    return found["subStrands"] if found else None


# --- Shared constants ---------------------------------------------------

COLUMN_HEADERS: Dict[str, List[str]] = {
    "en": [
        "WK", "LSN", "Strand", "Sub-Strand",
        "Lesson Learning Outcomes", "Lesson Learning Experiences",
        "Key Inquiry Question", "Learning Resources",
        "Assessment", "Refl",
    ],
    "sw": [
        "WIKI", "SOMO", "MADA", "MADA NDOGO",
        "MATOKEO MAALUM YANAYOTARAJIWA", "MAPENDEKEZO YA SHUGHULI ZA UJIFUNZAJI",
        "SWALI DADISI", "MAREJELEO",
        "TATHMINI", "MAONI",
    ],
}

KISWAHILI_SUBJECTS = ["Kiswahili"]


# Official KICD lesson allocation per week.
_LOWER_PRIMARY_LESSONS: Dict[str, int] = {
    "Indigenous Language": 2,
    "Kiswahili": 4,
    "English Activities": 5,
    "Mathematics": 5,
    "CRE": 3, "HRE": 3, "IRE": 3,
    "Environmental Activities": 4,
    "Creative Activities": 7,
}

_UPPER_PRIMARY_LESSONS: Dict[str, int] = {
    "AI": 2,
    "AI Literacy": 2,
    "Blockchain Literacy": 2,
    "English": 5,
    "Kiswahili": 4,
    "Mathematics": 5,
    "Science & Technology": 4,
    "Social Studies": 3,
    "Agriculture": 4,
    "Creative Arts": 6,
    "CRE": 3, "HRE": 3, "IRE": 3,
    "Arabic": 2, "French": 2, "German": 2, "Mandarin": 2,
    "Indigenous Language": 2,
}

_JUNIOR_SECONDARY_LESSONS: Dict[str, int] = {
    "AI Literacy": 2,
    "Blockchain Literacy": 2,
    "English": 5,
    "Kiswahili": 4,
    "Mathematics": 5,
    "Integrated Science": 4,
    "Social Studies": 3,
    "Agriculture": 2,
    "Creative Arts": 3,
    "Pre-Technical Studies": 3,
    "CRE": 3, "HRE": 3, "IRE": 3,
    "Arabic": 2, "French": 2, "German": 2, "Mandarin": 2,
    "Indigenous Language": 2,
}


def get_lessons_per_week(grade: str, subject: str) -> int:
    try:
        num = int(grade.replace("Grade ", ""))
    except ValueError:
        return 5
    if 1 <= num <= 3:
        m = _LOWER_PRIMARY_LESSONS
    elif 4 <= num <= 6:
        m = _UPPER_PRIMARY_LESSONS
    else:
        m = _JUNIOR_SECONDARY_LESSONS
    return m.get(subject, 5)


GRADES = [
    "Grade 1", "Grade 2", "Grade 3",
    "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9",
    "Grade 10", "Grade 11", "Grade 12",
]


def normalize_grade_label(grade: str) -> str:
    """Return the canonical spaced grade label used by registry lookups."""
    value = str(grade).strip()
    match = re.fullmatch(r"Grade\s*(\d+)", value, flags=re.IGNORECASE)
    return f"Grade {int(match.group(1))}" if match else value


def normalize_subject_label(subject: str) -> str:
    """Resolve compatibility aliases without creating a second curriculum key."""
    value = " ".join(str(subject).strip().split())
    return "AI Literacy" if value == "AI" else value

_LOWER_PRIMARY_SUBJECTS = [
    "Creative Activities", "CRE", "English Activities",
    "Environmental Activities", "HRE", "IRE", "Kiswahili", "Mathematics",
]

_UPPER_PRIMARY_SUBJECTS = [
    "AI", "AI Literacy", "Blockchain Literacy", "Agriculture", "Arabic", "Creative Arts", "CRE", "English", "French",
    "German", "HRE", "Indigenous Language", "IRE", "Kiswahili", "Mandarin",
    "Mathematics", "Science & Technology", "Social Studies",
]

_JUNIOR_SECONDARY_SUBJECTS = [
    "AI Literacy", "Blockchain Literacy", "Agriculture", "Arabic", "Creative Arts", "CRE", "English", "French",
    "German", "HRE", "Indigenous Language", "Integrated Science", "IRE",
    "Kiswahili", "Mandarin", "Mathematics", "Pre-Technical Studies",
    "Social Studies",
]


def get_subjects_for_grade(grade: str) -> List[str]:
    try:
        num = int(grade.replace("Grade ", ""))
    except ValueError:
        return _UPPER_PRIMARY_SUBJECTS
    if 1 <= num <= 3:
        return _LOWER_PRIMARY_SUBJECTS
    if 4 <= num <= 6:
        return _UPPER_PRIMARY_SUBJECTS
    if 7 <= num <= 12:
        return _JUNIOR_SECONDARY_SUBJECTS
    return _UPPER_PRIMARY_SUBJECTS


# Alias for external use
CURRICULUM_REGISTRY = _HARDCODED_STRANDS


# --- Curriculum-validation subsystem -----------------------------------
# Validator types live in ``models`` and reuse the ``StrandInfo`` /
# ``SubStrandInfo`` names with a different shape (snake_case dataclasses vs
# the legacy camelCase TypedDicts above). Expose them under non-conflicting
# aliases so callers can pick the contract they want.

from .models import (
    Topic,
    AlternativeTopic,
    ValidationResult,
    MisalignedTopic,
    CurriculumData,
    StrandInfo as ValidatorStrandInfo,
    SubStrandInfo as ValidatorSubStrandInfo,
    ContentType,
    ValidationStatus,
)
from .cache import CurriculumCache
from .extractor import TopicExtractor
from .validator import CurriculumValidator


__all__ = [
    # Legacy registry (used by LessonArchitectAgent.generate_scheme)
    "StrandInfo", "SubStrandInfo", "LiteracyCurriculumEnvelope", "SchemeRow",
    "get_hardcoded_strands", "get_sub_strands_for_strand",
    "get_lessons_per_week", "get_subjects_for_grade", "get_literacy_envelope",
    "COLUMN_HEADERS", "KISWAHILI_SUBJECTS", "GRADES",
    "CURRICULUM_REGISTRY", "AI_LITERACY_VERSION", "AI_BLOCKCHAIN_PROGRESSION",
    "BLOCKCHAIN_LITERACY_VERSION", "LITERACY_SCHEMA_VERSION",
    # Curriculum-validation subsystem
    "Topic", "AlternativeTopic", "MisalignedTopic", "ValidationResult",
    "CurriculumData", "ValidatorStrandInfo", "ValidatorSubStrandInfo",
    "ContentType", "ValidationStatus",
    "CurriculumCache", "TopicExtractor", "CurriculumValidator",
]
