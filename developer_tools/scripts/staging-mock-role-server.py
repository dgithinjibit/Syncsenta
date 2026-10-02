#!/usr/bin/env python3
"""Local-only mock role health server for the Syncsenta staging gate.

This server intentionally does not implement authentication. It accepts only
opaque fixture strings supplied by the local test harness and must never be
deployed or pointed at a real Supabase URL.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import os

TOKENS = {
    "/api/health/student": "syncsenta-local-only-student-v1",
    "/api/health/teacher": "syncsenta-local-only-teacher-v1",
    "/api/health/head": "syncsenta-local-only-head-v1",
    "/api/health/parent": "syncsenta-local-only-parent-v1",
}

class Handler(BaseHTTPRequestHandler):
    server_version = "SyncsentaLocalMock/1.0"

    def do_GET(self):
        expected = TOKENS.get(self.path)
        supplied = self.headers.get("Authorization", "")
        valid = expected is not None and supplied == f"Bearer {expected}"
        status = 200 if valid else 401
        body = b'{"status":"healthy","mode":"local-mock","role":"authenticated-fixture"}' if valid else b'{"error":"unauthorized"}'
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Never log authorization headers or request details.
        return

if __name__ == "__main__":
    host = os.environ.get("MOCK_AUTH_HOST", "127.0.0.1")
    port = int(os.environ.get("MOCK_AUTH_PORT", "8787"))
    if host not in {"127.0.0.1", "localhost"}:
        raise SystemExit("refusing to bind mock auth server outside localhost")
    HTTPServer((host, port), Handler).serve_forever()
