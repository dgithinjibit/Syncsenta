"""Lesson planning domain - CBC-compliant educational content generation.

This package contains focused modules for lesson planning tasks, extracted
from the original monolithic LessonArchitectAgent to follow deep module
principles and maintain clean separation of concerns.
"""

from .scheme_generator import SchemeGenerator
from .lesson_plan_generator import LessonPlanGenerator
from ..assessment import AssessmentAgent as AssessmentGenerator
from .repository import LessonArchitectRepository

__all__ = [
    "SchemeGenerator",
    "LessonPlanGenerator",
    "AssessmentGenerator",
    "LessonArchitectRepository",
]
