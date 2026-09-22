"""Core data models for SyncSenta AI Agents."""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MessageType(str, Enum):
    """Types of messages between agents."""
    QUERY = "query"
    RESPONSE = "response"
    COORDINATION = "coordination"
    ERROR = "error"


class AgentType(str, Enum):
    """Types of SyncSenta AI agents."""
    ORCHESTRATOR = "orchestrator"
    SOCRATIC_TUTOR = "socratic_tutor"
    CBC_CURRICULUM = "cbc_curriculum"
    LESSON_ARCHITECT = "lesson_architect"
    ASSESSMENT = "assessment"
    SCHOOL_INTELLIGENCE = "school_intelligence"
    CAREER_PATHWAYS = "career_pathways"


class RequestPriority(int, Enum):
    """Priority levels for agent requests."""
    LOW = 1
    MEDIUM = 3
    HIGH = 5


@dataclass
class AgentMessage:
    """Message passed between agents."""
    message_id: str
    sender_agent: str
    recipient_agent: str
    message_type: MessageType
    payload: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    priority: RequestPriority = RequestPriority.MEDIUM


class AgentRequest(BaseModel):
    """Request to the agent system."""
    message: str
    context: Dict[str, Any] = Field(default_factory=dict)
    user_id: str
    session_id: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    role: Optional[str] = "student"  # student, teacher, parent, admin
    type: Optional[str] = None  # tutoring, curriculum, lesson_planning, assessment
    priority: RequestPriority = RequestPriority.MEDIUM


class AgentResponse(BaseModel):
    """Response from the agent system."""
    success: bool
    response: str
    primary_agent: str
    agents_used: List[str]
    response_time_ms: int
    cached: bool = False
    context_aware: bool = False
    subject_switch: Optional[bool] = None
    previous_context: Optional[str] = None
    coordination: Optional[Dict[str, Any]] = None
    curriculum_validation: Optional[Dict[str, Any]] = None
    fallback_used: bool = False
    priority: Optional[RequestPriority] = None
    error: Optional[str] = None
    suggestions: List[str] = Field(default_factory=list)


class ConversationContext(BaseModel):
    """Context for ongoing conversations."""
    user_id: str
    last_subject: Optional[str] = None
    last_grade: Optional[str] = None
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class GradeVerification(BaseModel):
    """Grade verification data for blockchain."""
    student_id: str
    subject: str
    grade: str
    score: int
    date: str
    teacher_id: str
    assessment_type: str
    
    def to_hash_dict(self) -> Dict[str, Any]:
        """Convert to standardized dict for hashing."""
        return {
            'student_id': self.student_id,
            'subject': self.subject,
            'grade': self.grade,
            'score': self.score,
            'date': self.date,
            'teacher_id': self.teacher_id,
            'assessment_type': self.assessment_type
        }


class StellarTransaction(BaseModel):
    """Stellar blockchain transaction result."""
    transaction_hash: str
    ledger: int
    verification_url: str
    grade_hash: str
    timestamp: datetime = Field(default_factory=datetime.now)


class QuestionType(str, Enum):
    """Supported quiz question types."""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"


class QuizQuestion(BaseModel):
    """A single quiz question with CBC citation."""
    question_id: str
    question: str
    question_type: QuestionType
    options: List[str] = Field(default_factory=list)  # for MC / TF
    correct_answer: str
    competency: str  # e.g. "MATH.G4.NUMBERS.FRACTIONS"
    cbc_citation: str  # e.g. "KICD CBC Mathematics G4 Strand 2.1"
    difficulty: str = "medium"  # easy | medium | hard
    points: int = 1
    rubric: Optional[List[str]] = None  # short-answer rubric criteria


class Quiz(BaseModel):
    """A generated quiz aligned to a CBC competency."""
    quiz_id: str
    title: str
    grade: str
    subject: str
    competencies: List[str]
    questions: List[QuizQuestion]
    total_points: int
    cbc_citations: List[str]
    generated_at: datetime = Field(default_factory=datetime.now)
    language: str = "english"


class StudentAnswer(BaseModel):
    """A student's answer to a single question."""
    question_id: str
    answer: str


class QuizSubmission(BaseModel):
    """A student's full quiz submission."""
    submission_id: str
    quiz_id: str
    student_id: str
    answers: List[StudentAnswer]
    submitted_at: datetime = Field(default_factory=datetime.now)


class GradedAnswer(BaseModel):
    """Grading result for a single answer."""
    question_id: str
    correct: bool
    points_earned: float
    points_possible: int
    rubric_scores: Dict[str, float] = Field(default_factory=dict)
    feedback: str
    competency: str


class CompetencyScore(BaseModel):
    """Competency-level mastery score."""
    competency: str
    points_earned: float
    points_possible: int
    mastery_pct: float  # 0..100
    mastery_level: str  # exceeding | meeting | approaching | below


class GradedSubmission(BaseModel):
    """Full grading result for a submission."""
    submission_id: str
    quiz_id: str
    student_id: str
    graded_answers: List[GradedAnswer]
    score: float
    total_points: int
    percentage: float
    grade: str  # A | B | C | D | E (CBC-style)
    competency_scores: List[CompetencyScore]
    overall_feedback: str
    next_steps: List[str]
    cbc_citations: List[str]
    graded_at: datetime = Field(default_factory=datetime.now)


class OfflineInteraction(BaseModel):
    """Agent interaction stored for offline sync."""
    interaction_id: str
    timestamp: datetime
    agent_type: str
    student_id: str
    request: Dict[str, Any]
    response: Dict[str, Any]
    offline_generated: bool = False
    sync_status: str = "pending"  # pending, synced, failed
    sync_error: Optional[str] = None