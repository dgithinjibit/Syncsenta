"""Curriculum data types ported from scheme-scribe-ai/src/data/curriculum/types.ts."""

from __future__ import annotations

from typing import List, Literal, Optional, TypedDict


class SubStrandInfo(TypedDict, total=False):
    name: str
    lessons: int
    learningOutcomes: List[str]
    suggestedExperiences: List[str]
    keyInquiryQuestion: str


class StrandInfo(TypedDict):
    name: str
    subStrands: List[SubStrandInfo]


class LiteracyCurriculumEnvelope(TypedDict):
    curriculumId: str
    schemaVersion: str
    curriculumVersion: str
    grade: str
    subject: Literal['AI Literacy', 'Blockchain Literacy']
    gradeBand: Literal['upper_primary', 'junior_secondary', 'senior_school']
    lessonsPerWeek: int
    sourceType: Literal['authored']
    provenance: str
    evidenceRequired: bool
    teacherMediationRequired: bool
    syntheticDataOnly: bool
    externalActionsAllowed: Literal[False]
    prohibitedOperations: List[str]
    releaseState: Literal['draft', 'teacher_review', 'verified']


class LiteracyScheduleAudit(TypedDict):
    authoredLessons: int
    lessonsPerWeek: int
    requiredWeeks: int
    standardAnnualWeeks: int
    annualCapacity: int
    consolidationWeeks: int
    overrunWeeks: int
    status: Literal['fits', 'requires_extension']


class SchemeRow(TypedDict):
    week: int
    lesson: int
    strand: str
    subStrand: str
    specificLearningOutcome: str
    keyInquiryQuestion: str
    learningExperiences: str
    learningResources: str
    assessmentMethods: str
    reflection: str


__all__ = ["SubStrandInfo", "StrandInfo", "LiteracyCurriculumEnvelope", "LiteracyScheduleAudit", "SchemeRow"]
