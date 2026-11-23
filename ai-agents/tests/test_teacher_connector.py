"""End-to-end tests for the student ↔ teacher AI connector.

These tests verify that AI agent interactions on the *student* side are logged
and attributed such that the *teacher* side can retrieve them to provide
personalized feedback. They cover the exact seam that was previously broken:
every AI decision used to be logged with `teacher_id = student_id`, so the
teacher feedback dashboard (which queries `ai_decisions WHERE teacher_id = X`)
never matched.

Fully offline: a stub LLM and an in-memory fake Supabase table stand in for
the network, mirroring the offline-first deployment model used elsewhere in
the suite.
"""

import os

# Importing the FastAPI server module instantiates agents at import time, some
# of which require a Groq key. Tests run fully offline, so provide a dummy one
# before the import if the environment doesn't already have it.
os.environ.setdefault("GROQ_API_KEY", "test-key-offline")

import pytest

# Teacher resolution is tested through the mounted connector behavior below;
# the removed server-side Omega orchestrator had no public resolver contract.
from syncsenta_agents.agents.tutoring import TutoringAgent
from syncsenta_agents.db import decision_logger as decision_logger_module


# ---------------------------------------------------------------------------
# Test doubles
# ---------------------------------------------------------------------------


class StubLLM:
    """Deterministic LLM provider implementing the `generate` Protocol."""

    def __init__(self, reply: str = "Think about halves: what is 1/2 + 1/2?"):
        self._reply = reply

    async def generate(self, prompt: str, *, system: str | None = None) -> str:
        return self._reply


class _FakeQuery:
    """Chainable query object that records inserts and filters selects."""

    def __init__(self, table: "_FakeTable"):
        self._table = table
        self._op = None
        self._payload = None
        self._filters: dict = {}

    # --- write path -------------------------------------------------------
    def insert(self, data):
        self._op = "insert"
        self._payload = data
        return self

    def update(self, data):
        self._op = "update"
        self._payload = data
        return self

    # --- read path --------------------------------------------------------
    def select(self, *_args, **_kwargs):
        self._op = "select"
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def limit(self, _n):
        return self

    def order(self, *_a, **_k):
        return self

    def range(self, *_a, **_k):
        return self

    def is_(self, *_a, **_k):
        return self

    def execute(self):
        if self._op == "insert":
            rows = self._payload if isinstance(self._payload, list) else [self._payload]
            self._table.rows.extend(rows)
            return _FakeResponse(rows)

        if self._op == "update":
            matched = [r for r in self._table.rows if self._matches(r)]
            for r in matched:
                r.update(self._payload)
            return _FakeResponse(matched)

        # select
        matched = [r for r in self._table.rows if self._matches(r)]
        return _FakeResponse(matched)

    def _matches(self, row) -> bool:
        return all(row.get(k) == v for k, v in self._filters.items())


class _FakeResponse:
    def __init__(self, data):
        self.data = data


class _FakeTable:
    def __init__(self):
        self.rows: list = []

    # Every table method returns a fresh query bound to this table.
    def insert(self, data):
        return _FakeQuery(self).insert(data)

    def update(self, data):
        return _FakeQuery(self).update(data)

    def select(self, *a, **k):
        return _FakeQuery(self).select(*a, **k)


class FakeSupabase:
    """Minimal Supabase stand-in with per-name tables."""

    def __init__(self):
        self._tables: dict[str, _FakeTable] = {}

    def table(self, name):
        return self._tables.setdefault(name, _FakeTable())


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


STUDENT_ID = "student-uuid-1"
TEACHER_ID = "teacher-uuid-1"


@pytest.fixture
def fake_supabase():
    return FakeSupabase()


@pytest.fixture(autouse=True)
def _reset_decision_logger_singleton():
    """The decision logger is a process-wide singleton; reset it so each test
    gets one bound to that test's fake Supabase client."""
    decision_logger_module._decision_logger = None
    yield
    decision_logger_module._decision_logger = None


# ---------------------------------------------------------------------------
# 1. Server-side teacher resolution (the "Both / fallback" strategy)
# ---------------------------------------------------------------------------


class TestResolveTeacherId:
    def test_prefers_client_supplied(self, fake_supabase):
        # Client already knows the teacher — no DB lookup needed.
        resolved = _resolve_teacher_id(
            fake_supabase, student_id=STUDENT_ID, client_supplied=TEACHER_ID
        )
        assert resolved == TEACHER_ID

    def test_ignores_client_value_equal_to_student(self, fake_supabase):
        # A client that echoes the student id must NOT be trusted; fall through
        # to the mapping (which is empty here -> None).
        resolved = _resolve_teacher_id(
            fake_supabase, student_id=STUDENT_ID, client_supplied=STUDENT_ID
        )
        assert resolved is None

    def test_resolves_from_mapping(self, fake_supabase):
        fake_supabase.table("teacher_students").insert(
            {"teacher_id": TEACHER_ID, "student_id": STUDENT_ID, "status": "active"}
        ).execute()

        resolved = _resolve_teacher_id(fake_supabase, student_id=STUDENT_ID)
        assert resolved == TEACHER_ID

    def test_ignores_inactive_mapping(self, fake_supabase):
        fake_supabase.table("teacher_students").insert(
            {"teacher_id": TEACHER_ID, "student_id": STUDENT_ID, "status": "inactive"}
        ).execute()

        resolved = _resolve_teacher_id(fake_supabase, student_id=STUDENT_ID)
        assert resolved is None

    def test_anonymous_student_resolves_none(self, fake_supabase):
        assert _resolve_teacher_id(fake_supabase, student_id="anonymous") is None

    def test_no_supabase_resolves_none(self):
        assert _resolve_teacher_id(None, student_id=STUDENT_ID) is None


# ---------------------------------------------------------------------------
# 2. End-to-end connector: student interaction -> logged decision -> teacher read
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_student_interaction_is_logged_for_the_teacher(fake_supabase):
    """A student's tutoring interaction must produce an ai_decisions row that
    the teacher can later retrieve, carrying the personalized-feedback payload."""

    agent = TutoringAgent(llm_provider=StubLLM(), supabase_client=fake_supabase)

    result = await agent.execute_task(
        request="I keep getting 1/2 + 1/2 wrong",
        context={
            "grade": "Grade 4",
            "subject": "Mathematics",
            "language": "english",
            "student_id": STUDENT_ID,
            "teacher_id": TEACHER_ID,  # resolved upstream in /agents/chat
            "competency": "MATH.NUMBERS.FRACTIONS",
            "session_id": "session-1",
            # Telemetry that should fire pedagogical rules (frustration signal).
            "telemetry": {"erasure_count": 5, "dwell_time_seconds": 75},
        },
    )

    # The student got a response and a decision id to correlate feedback against.
    assert result["response"]
    assert result["decision_id"]

    # --- The connector wrote exactly one decision, owned by the teacher -----
    decisions = fake_supabase.table("ai_decisions").rows
    assert len(decisions) == 1
    decision = decisions[0]

    assert decision["teacher_id"] == TEACHER_ID, (
        "AI decision must be attributed to the student's teacher, not the "
        "student — otherwise the teacher dashboard never sees it."
    )
    assert decision["student_id"] == STUDENT_ID
    assert decision["decision_type"] == "tutoring_response"
    assert decision["competency"] == "MATH.NUMBERS.FRACTIONS"
    assert decision["subject"] == "Mathematics"
    assert decision["grade"] == "Grade 4"

    # --- Personalized-feedback payload the teacher UI renders ---------------
    assert decision["ai_response"].strip(), "response text must be persisted"
    assert decision["fired_rules"], "pedagogical rules should be captured"
    assert decision["scaffolding_level"] is not None
    assert "student_telemetry" in decision


@pytest.mark.asyncio
async def test_teacher_can_query_back_student_decisions(fake_supabase):
    """Simulate the teacher-feedback dashboard query and confirm the student's
    decision is returned for exactly the right teacher (and no one else)."""

    agent = TutoringAgent(llm_provider=StubLLM(), supabase_client=fake_supabase)
    await agent.execute_task(
        request="Help with fractions",
        context={
            "grade": "Grade 4",
            "subject": "Mathematics",
            "student_id": STUDENT_ID,
            "teacher_id": TEACHER_ID,
            "competency": "MATH.NUMBERS.FRACTIONS",
        },
    )

    # This mirrors teacher_feedback_api.get_teacher_decisions().
    owned = (
        fake_supabase.table("ai_decisions")
        .select("*")
        .eq("teacher_id", TEACHER_ID)
        .execute()
    )
    assert len(owned.data) == 1
    assert owned.data[0]["student_id"] == STUDENT_ID

    # A different teacher sees nothing.
    other = (
        fake_supabase.table("ai_decisions")
        .select("*")
        .eq("teacher_id", "some-other-teacher")
        .execute()
    )
    assert other.data == []


@pytest.mark.asyncio
async def test_unresolved_teacher_is_not_misattributed_to_student(fake_supabase):
    """Regression guard: when no teacher is resolved, the decision must NOT be
    logged under the student's id (the original bug)."""

    agent = TutoringAgent(llm_provider=StubLLM(), supabase_client=fake_supabase)
    await agent.execute_task(
        request="Help with fractions",
        context={
            "grade": "Grade 4",
            "subject": "Mathematics",
            "student_id": STUDENT_ID,
            "teacher_id": None,  # unresolved
            "competency": "MATH.NUMBERS.FRACTIONS",
        },
    )

    decision = fake_supabase.table("ai_decisions").rows[0]
    assert decision["teacher_id"] != STUDENT_ID
