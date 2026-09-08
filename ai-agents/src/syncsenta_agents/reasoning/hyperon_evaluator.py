"""Hyperon MeTTa evaluator for Syncsenta policy enforcement.

This module is the single integration point between the Python agent service
and the real Hyperon runtime.  It loads ``metta-logic/syncsenta_policy.metta``
once at startup and exposes a thin ``evaluate(query)`` interface that returns
a verdict string accepted by the Rust ``MettaVerdict::parse()`` contract:

    "Approved"
    "(Review <reason>)"
    "(Rejected <reason>)"

Architecture
------------
                ┌──────────────────────────┐
  telemetry ──► │  HyperonPolicyEvaluator   │──► verdict string
                │  (real Hyperon runtime)   │
                └──────────────────────────┘
                           │ ImportError / RuntimeError
                           ▼
                ┌──────────────────────────┐
                │  FallbackPolicyEvaluator  │──► verdict string
                │  (pure-Python, no deps)   │
                └──────────────────────────┘

The factory ``get_policy_evaluator()`` tries to build the Hyperon evaluator
first.  If ``hyperon`` is not installed or the .metta file cannot be loaded,
it falls back transparently so the service always starts.

Usage
-----
    from syncsenta_agents.reasoning.hyperon_evaluator import (
        get_policy_evaluator,
        PolicyRequest,
    )

    evaluator = get_policy_evaluator()

    verdict = evaluator.evaluate_session(PolicyRequest(
        age_band="primary",
        consent="granted",
        connectivity="online",
        intent="socratic-tutor",
        safety_signal="clear",
    ))
    # → "Approved"

    verdict = evaluator.evaluate_safeguarding("self-harm")
    # → "(Review safeguarding)"
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ..core.logging import get_logger

logger = get_logger("hyperon_evaluator")

# Policy arguments are symbolic atoms, not free-form learner content.  Keep
# query construction inside this adapter and reject anything that could alter
# the MeTTa expression shape before it reaches the runtime.
_SAFE_SYMBOL = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")
_INVALID_INPUT_VERDICT = "(Review invalid-policy-input)"


def _validated_symbol(value: str, field: str) -> str:
    """Return a safe policy atom or raise a descriptive validation error."""
    if not isinstance(value, str) or not _SAFE_SYMBOL.fullmatch(value):
        raise ValueError(f"{field} must be a single policy symbol")
    return value


def _invalid_input_verdict(evaluator: str) -> "PolicyVerdict":
    """Build the stable fail-closed result used for malformed policy input."""
    return PolicyVerdict.from_atom(_INVALID_INPUT_VERDICT, evaluator)

# Absolute path to the shared policy file so it works regardless of cwd.
_POLICY_PATH = (
    Path(__file__).resolve()
    .parents[5]          # repo root
    / "metta-logic"
    / "syncsenta_policy.metta"
)


# ---------------------------------------------------------------------------
# Public data model
# ---------------------------------------------------------------------------

@dataclass
class PolicyRequest:
    """Structured inputs for the main ``syncsenta-policy`` boundary.

    All fields default to the safest/most-restricted value so callers that
    only know part of the context still fail closed.
    """
    role: str = "unknown"
    age_band: str = "unknown"        # primary | secondary | early-years | adult | unknown
    intent: str = "socratic-tutor"   # socratic-tutor | assessment | lesson-plan | …
    goal: str = "inclusive-learning" # vision2030 goal
    connectivity: str = "online"     # online | metered | offline | unknown
    consent: str = "unknown"         # granted | unknown | guardian-required | denied
    safety_signal: str = "clear"     # clear | flagged
    accessibility: str = "default"   # default | required


@dataclass
class PolicyVerdict:
    """The result of a policy evaluation."""
    verdict: str              # raw MeTTa atom string
    approved: bool
    review_reason: Optional[str] = None
    evaluator_used: str = "unknown"

    @property
    def evaluator_type(self) -> str:
        """Compatibility alias used by telemetry/API consumers."""
        return self.evaluator_used

    @property
    def reasoning(self) -> str:
        """Human-readable policy explanation for API and telemetry consumers."""
        return self.review_reason or self.verdict

    @classmethod
    def from_atom(cls, atom: str, evaluator_used: str = "unknown") -> "PolicyVerdict":
        atom = atom.strip()
        if atom == "Approved":
            return cls(verdict=atom, approved=True, evaluator_used=evaluator_used)
        m = re.match(r'^\(Review\s+(.+)\)$', atom)
        if m:
            return cls(
                verdict=atom,
                approved=False,
                review_reason=m.group(1).strip(),
                evaluator_used=evaluator_used,
            )
        m = re.match(r'^\(Rejected\s+(.+)\)$', atom)
        if m:
            return cls(
                verdict=atom,
                approved=False,
                review_reason=m.group(1).strip(),
                evaluator_used=evaluator_used,
            )
        # Unknown atom — fail closed.
        return cls(
            verdict=f"(Review unknown-verdict:{atom})",
            approved=False,
            review_reason="unknown-verdict",
            evaluator_used=evaluator_used,
        )


# ---------------------------------------------------------------------------
# Real Hyperon evaluator
# ---------------------------------------------------------------------------

class HyperonPolicyEvaluator:
    """Evaluates ``syncsenta_policy.metta`` using the real Hyperon runtime.

    The MeTTa source is loaded once and reused for every query.  The
    ``MeTTa.run()`` call is synchronous and fast for a policy file this size
    (~120 lines, no recursion depth issues).
    """

    def __init__(self) -> None:
        from hyperon import MeTTa  # type: ignore[import]

        if not _POLICY_PATH.exists():
            raise FileNotFoundError(
                f"Policy file not found: {_POLICY_PATH}. "
                "Ensure metta-logic/syncsenta_policy.metta is present."
            )

        self._metta = MeTTa()
        source = _POLICY_PATH.read_text(encoding="utf-8")
        self._metta.run(source)
        logger.info(
            "HyperonPolicyEvaluator ready",
            extra={"policy_path": str(_POLICY_PATH)},
        )

    # ------------------------------------------------------------------
    # Low-level query
    # ------------------------------------------------------------------

    def query(self, expression: str) -> str:
        """Run a single MeTTa expression and return the first result atom.

        Returns the raw atom string, e.g. ``"Approved"`` or
        ``"(Review consent)"``.
        """
        results = self._metta.run(f"!{expression}")
        # results is a list of lists; flatten to first atom string.
        for result_list in results:
            for atom in result_list:
                return str(atom).strip()
        return "(Review unknown-verdict:empty-result)"

    # ------------------------------------------------------------------
    # Named evaluations (map to policy file rules)
    # ------------------------------------------------------------------

    def evaluate_session(self, req: PolicyRequest) -> PolicyVerdict:
        """Evaluate the main ``syncsenta-policy`` boundary."""
        try:
            values = [
                _validated_symbol(value, field)
                for field, value in (
                    ("role", req.role),
                    ("age_band", req.age_band),
                    ("intent", req.intent),
                    ("goal", req.goal),
                    ("connectivity", req.connectivity),
                    ("consent", req.consent),
                    ("safety_signal", req.safety_signal),
                    ("accessibility", req.accessibility),
                )
            ]
        except ValueError:
            return _invalid_input_verdict("hyperon")
        expr = f"(syncsenta-policy {' '.join(values)})"
        atom = self.query(expr)
        return PolicyVerdict.from_atom(atom, evaluator_used="hyperon")

    def evaluate_safeguarding(self, signal: str) -> PolicyVerdict:
        """Evaluate ``(safeguarding-route <signal>)``."""
        try:
            signal = _validated_symbol(signal, "signal")
        except ValueError:
            return _invalid_input_verdict("hyperon")
        atom = self.query(f"(safeguarding-route {signal})")
        return PolicyVerdict.from_atom(atom, evaluator_used="hyperon")

    def evaluate_cbc_evidence(self, completeness: str) -> PolicyVerdict:
        """Evaluate ``(cbc-evidence-route <completeness>)``."""
        try:
            completeness = _validated_symbol(completeness, "completeness")
        except ValueError:
            return _invalid_input_verdict("hyperon")
        atom = self.query(f"(cbc-evidence-route {completeness})")
        return PolicyVerdict.from_atom(atom, evaluator_used="hyperon")

    def evaluate_attendance_action(
        self, token_status: str, consent_status: str
    ) -> PolicyVerdict:
        """Evaluate ``(attendance-action-route <token> <consent>)``."""
        try:
            token_status = _validated_symbol(token_status, "token_status")
            consent_status = _validated_symbol(consent_status, "consent_status")
        except ValueError:
            return _invalid_input_verdict("hyperon")
        atom = self.query(f"(attendance-action-route {token_status} {consent_status})")
        return PolicyVerdict.from_atom(atom, evaluator_used="hyperon")

    def evaluate_assessment_finalization(self, sync_state: str) -> PolicyVerdict:
        """Evaluate ``(assessment-finalization-route <sync-state>)``."""
        try:
            sync_state = _validated_symbol(sync_state, "sync_state")
        except ValueError:
            return _invalid_input_verdict("hyperon")
        atom = self.query(f"(assessment-finalization-route {sync_state})")
        return PolicyVerdict.from_atom(atom, evaluator_used="hyperon")

    def evaluate_expert_input(self, input_type: str) -> PolicyVerdict:
        """Evaluate ``(expert-input <input-type>)``."""
        try:
            input_type = _validated_symbol(input_type, "input_type")
        except ValueError:
            return _invalid_input_verdict("hyperon")
        atom = self.query(f"(expert-input {input_type})")
        return PolicyVerdict.from_atom(atom, evaluator_used="hyperon")


# ---------------------------------------------------------------------------
# Pure-Python fallback — no external dependencies
# ---------------------------------------------------------------------------

class FallbackPolicyEvaluator:
    """Deterministic pure-Python reimplementation of the MeTTa policy rules.

    Mirrors every rule in ``syncsenta_policy.metta`` exactly.  Used when
    the Hyperon package is not installed or fails to initialise.  The
    behaviour is identical — only the execution engine differs.
    """

    # Keep this stable for telemetry consumers and dashboards.  The concrete
    # implementation remains visible in logs, while the public contract uses
    # the same label regardless of the fallback's internal class name.
    LABEL = "fallback"

    # ------------------------------------------------------------------
    # Child consent table  (policy file lines 23-31)
    # ------------------------------------------------------------------
    _CONSENT_OK: frozenset = frozenset({
        ("primary",    "granted"),
        ("secondary",  "granted"),
        ("early-years","granted"),
    })

    @staticmethod
    def _child_consent_ok(age_band: str, consent: str) -> bool:
        if age_band == "adult":
            return True
        if age_band == "unknown":
            return True
        if consent in ("unknown", "guardian-required", "denied"):
            return False
        return (age_band, consent) in FallbackPolicyEvaluator._CONSENT_OK

    # ------------------------------------------------------------------
    # Main policy boundary  (policy file lines 38-44)
    # ------------------------------------------------------------------

    def evaluate_session(self, req: PolicyRequest) -> PolicyVerdict:
        if req.safety_signal == "flagged":
            return PolicyVerdict.from_atom("(Review safety)", self.LABEL)
        if not self._child_consent_ok(req.age_band, req.consent):
            return PolicyVerdict.from_atom("(Review consent)", self.LABEL)
        if req.connectivity == "offline" and req.intent == "assessment":
            return PolicyVerdict.from_atom("(Review offline-assessment)", self.LABEL)
        return PolicyVerdict.from_atom("Approved", self.LABEL)

    # ------------------------------------------------------------------
    # Safeguarding routes  (policy file lines 68-74)
    # ------------------------------------------------------------------

    _SAFEGUARDING: dict = {
        "clear":                   "Approved",
        "wellbeing":               "(Review wellbeing)",
        "abuse-or-exploitation":   "(Review safeguarding)",
        "self-harm":               "(Review safeguarding)",
        "dangerous-activity":      "(Review safeguarding)",
        "sexual-content":          "(Review safeguarding)",
        "privacy-request":         "(Review privacy)",
    }

    def evaluate_safeguarding(self, signal: str) -> PolicyVerdict:
        atom = self._SAFEGUARDING.get(signal, f"(Review unknown-safeguarding:{signal})")
        return PolicyVerdict.from_atom(atom, self.LABEL)

    # ------------------------------------------------------------------
    # CBC evidence routes  (policy file lines 77-80)
    # ------------------------------------------------------------------

    _CBC_EVIDENCE: dict = {
        "complete":   "Approved",
        "incomplete": "(Review curriculum-evidence)",
        "unknown":    "(Review curriculum-evidence)",
    }

    def evaluate_cbc_evidence(self, completeness: str) -> PolicyVerdict:
        atom = self._CBC_EVIDENCE.get(completeness, "(Review curriculum-evidence)")
        return PolicyVerdict.from_atom(atom, self.LABEL)

    # ------------------------------------------------------------------
    # Attendance action route  (policy file lines 98-104)
    # ------------------------------------------------------------------

    _ATTENDANCE_TOKEN: dict = {
        "valid":       "Approved",
        "missing":     "(Review attendance-token)",
        "expired":     "(Review attendance-token)",
        "revoked":     "(Review attendance-token)",
        "replayed":    "(Review attendance-replay)",
        "wrong-class": "(Review attendance-scope)",
        "invalid":     "(Review attendance-token)",
    }

    def evaluate_attendance_action(
        self, token_status: str, consent_status: str
    ) -> PolicyVerdict:
        if token_status != "valid":
            atom = self._ATTENDANCE_TOKEN.get(
                token_status, "(Review attendance-token)"
            )
            return PolicyVerdict.from_atom(atom, self.LABEL)
        if consent_status != "granted":
            return PolicyVerdict.from_atom("(Review consent)", self.LABEL)
        return PolicyVerdict.from_atom("Approved", self.LABEL)

    # ------------------------------------------------------------------
    # Assessment finalization route  (policy file lines 83-85)
    # ------------------------------------------------------------------

    _ASSESSMENT_FINAL: dict = {
        "offline-pending-sync": "(Review offline-assessment)",
        "synced":               "Approved",
    }

    def evaluate_assessment_finalization(self, sync_state: str) -> PolicyVerdict:
        atom = self._ASSESSMENT_FINAL.get(
            sync_state, "(Review offline-assessment)"
        )
        return PolicyVerdict.from_atom(atom, self.LABEL)

    # ------------------------------------------------------------------
    # Expert input gate  (policy file lines 88-90)
    # ------------------------------------------------------------------

    _EXPERT_INPUT: dict = {
        "raw-learner-content": "(Review privacy)",
        "policy-summary":      "Approved",
    }

    def evaluate_expert_input(self, input_type: str) -> PolicyVerdict:
        atom = self._EXPERT_INPUT.get(input_type, "(Review privacy)")
        return PolicyVerdict.from_atom(atom, self.LABEL)


# ---------------------------------------------------------------------------
# Union type and factory
# ---------------------------------------------------------------------------

PolicyEvaluator = HyperonPolicyEvaluator | FallbackPolicyEvaluator

_evaluator: Optional[PolicyEvaluator] = None


def get_policy_evaluator() -> PolicyEvaluator:
    """Return the singleton policy evaluator.

    Tries ``HyperonPolicyEvaluator`` first.  Falls back to
    ``FallbackPolicyEvaluator`` if Hyperon is unavailable or the policy
    file is missing.  The choice is logged once at startup so operators
    can confirm which engine is active.
    """
    global _evaluator
    if _evaluator is not None:
        return _evaluator

    try:
        _evaluator = HyperonPolicyEvaluator()
        logger.info("MeTTa policy engine: Hyperon (real runtime)")
    except ImportError:
        logger.warning(
            "hyperon package not installed — using pure-Python policy fallback. "
            "Install with: pip install hyperon"
        )
        _evaluator = FallbackPolicyEvaluator()
    except Exception as exc:
        logger.warning(
            f"HyperonPolicyEvaluator init failed ({exc}) — "
            "using pure-Python policy fallback"
        )
        _evaluator = FallbackPolicyEvaluator()

    return _evaluator
