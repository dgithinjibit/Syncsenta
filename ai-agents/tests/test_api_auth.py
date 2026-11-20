import os

import pytest
from fastapi.testclient import TestClient

from syncsenta_agents.api.server import app


@pytest.fixture(autouse=True)
def offline_import_keys(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key-offline")
    monkeypatch.setenv("SYNCSENTA_AI_AGENTS_API_KEY", "test-service-key")


def test_healthz_does_not_require_a_service_key():
    response = TestClient(app).get("/healthz")
    assert response.status_code == 200


def test_agent_route_rejects_missing_service_key():
    response = TestClient(app).post(
        "/agents/chat",
        json={"message": "Help me with fractions", "role": "student"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


def test_agent_route_rejects_wrong_service_key():
    response = TestClient(app).post(
        "/agents/chat",
        headers={"Authorization": "Bearer wrong-key"},
        json={"message": "Help me with fractions", "role": "student"},
    )
    assert response.status_code == 401


def test_agent_route_accepts_bearer_service_key():
    response = TestClient(app).get(
        "/lesson-architect/healthz",
        headers={"Authorization": "Bearer test-service-key"},
    )
    assert response.status_code != 401
    assert response.status_code != 503


def test_missing_server_key_fails_closed(monkeypatch):
    monkeypatch.delenv("SYNCSENTA_AI_AGENTS_API_KEY", raising=False)

    response = TestClient(app).post(
        "/agents/chat",
        headers={"Authorization": "Bearer test-service-key"},
        json={"message": "Help me with fractions", "role": "student"},
    )
    assert response.status_code == 503
    assert response.json() == {"detail": "AI service authentication is not configured"}
