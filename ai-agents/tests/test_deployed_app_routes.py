"""Route-surface guard for the ASGI app that Render actually boots.

Why this exists
---------------
`render.yaml` runs `syncsenta_agents.api.server:app`. The lesson-architect
router was only ever included in `api/scheme_server.py`, a second app created
for local teacher demos and deployed nowhere. The result, measured 2026-09-27
against the live service:

    GET  https://ascendra-1.onrender.com/healthz                  -> 200
    GET  https://ascendra-1.onrender.com/lesson-architect/healthz -> 404

so every `studio/src/app/api/generate/*` proxy received a 404 and returned its
prescribed fallback rows instead — a teacher got a scheme that looked generated
and nothing anywhere reported the failure.

These tests fail if the router stops being mounted on the deployed app, or if
`/healthz` stops telling the truth about it.
"""

from __future__ import annotations

from typing import Set

from syncsenta_agents.api import server

# Every route the studio teacher surfaces call through
# `studio/src/lib/api-config.ts` (API_ENDPOINTS.LESSON_ARCHITECT_*).
REQUIRED_LESSON_ARCHITECT_PATHS: Set[str] = {
    "/lesson-architect/generate-scheme",
    "/lesson-architect/generate-lesson-plan",
    "/lesson-architect/generate-worksheet",
    "/lesson-architect/generate-text-leveler",
    "/lesson-architect/unpack-outcome",
    "/lesson-architect/generate-differentiation",
    "/lesson-architect/generate-exam",
    "/lesson-architect/schemes",
}

# The routes the student site depends on; pinned so a mount refactor cannot
# quietly drop the tutor or the assessment agent.
REQUIRED_STUDENT_PATHS: Set[str] = {
    "/healthz",
    "/agents/chat",
    "/agents/assessment/quiz",
    "/agents/assessment/grade",
}


def _app_paths() -> Set[str]:
    return {getattr(route, "path", "") for route in server.app.routes}


def test_deployed_app_mounts_the_lesson_architect_router() -> None:
    assert server.LESSON_ARCHITECT_MOUNT_ERROR is None, (
        "The lesson-architect router failed to import on the app Render boots: "
        f"{server.LESSON_ARCHITECT_MOUNT_ERROR}. Fix the import — do not remove "
        "the guard in api/server.py, and do not re-point render.yaml at "
        "api/scheme_server.py (that would drop /agents/chat for learners)."
    )


def test_lesson_architect_routes_are_registered() -> None:
    missing = REQUIRED_LESSON_ARCHITECT_PATHS - _app_paths()
    assert not missing, f"/lesson-architect routes not mounted: {sorted(missing)}"


def test_student_routes_are_still_registered() -> None:
    missing = REQUIRED_STUDENT_PATHS - _app_paths()
    assert not missing, f"student-facing routes disappeared: {sorted(missing)}"


def test_healthz_reports_the_lesson_architect_mount() -> None:
    # `healthz` is an async route; run the coroutine directly rather than pull
    # in a test client (httpx/TestClient is optional in this environment).
    import asyncio

    body = asyncio.run(server.healthz())
    assert body["status"] == "ok"
    assert "lesson_architect" in body, (
        "/healthz must report the lesson-architect mount. A 200 here while "
        "/lesson-architect/* 404s is the exact failure this guard exists to catch."
    )
    assert body["lesson_architect"]["mounted"] is (
        server.LESSON_ARCHITECT_MOUNT_ERROR is None
    )
