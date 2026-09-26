"""Laya-backed affect and escalation classifier.

Scope — read this before wiring anything up
-------------------------------------------
This module replaces **one boolean**, the ``frustrationSignal`` that
``studio/src/lib/chat/subject-session.ts`` feeds into
``evaluateTutoringDecision``. It does **not** replace that function. The
scaffolding rule is deterministic, runs in microseconds in the browser, and has
a byte-for-byte contract with ``rust-core/src/agent_runtime.rs``; a neural
model cannot sit inside it without breaking both properties. See
``docs/architecture/laya-decision-router.md``.

Guarantees
----------
1. **Never raises.** Any model error, timeout, missing dependency or
   unparseable output falls open to the keyword baseline and is reported as
   ``source="keyword_baseline"`` with a ``fallback_reason``.
2. **Never runs unless switched on.** The class stays inert until
   ``LAYA_AFFECT_ENABLED=1``. Off by default, so this PoC cannot change
   behaviour for anyone.
3. **Records what it decided.** Every call returns the probability, the
   threshold it was compared against, the checkpoint id and whether the
   fallback fired — the fields needed to calibrate the threshold later.

Laya runs on CPU here; the 33ms figure in the upstream README is a T4 GPU
number and does not transfer.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

from .keyword_baseline import EmotionalState, analyze_emotional_state

logger = logging.getLogger("syncsenta.decisions.affect")

ENV_ENABLED = "LAYA_AFFECT_ENABLED"
ENV_THRESHOLD = "LAYA_FRUSTRATION_THRESHOLD"
ENV_MODEL = "LAYA_MODEL"
ENV_TIMEOUT_MS = "LAYA_TIMEOUT_MS"

DEFAULT_FRUSTRATION_THRESHOLD = 0.5
DEFAULT_TIMEOUT_MS = 250

# Typed questions. `noul` returns P(true), which is exactly the probability we
# want for a threshold; `choice` and `score` are used for the teacher-facing
# outputs where a category or a severity level is the natural shape.
QUESTIONS: Dict[str, Dict[str, Any]] = {
    "frustration": {
        "type": "noul",
        "instructions": (
            "Does the learner sound frustrated, overwhelmed, or ready to give up, "
            "such that continuing on their own would be counterproductive?"
        ),
        "criteria": {
            "false": "Curious, steady, neutral, confident, or simply asking a question.",
            "true": "Struggling, stuck, discouraged, or close to giving up.",
        },
    },
    "teacher_alert": {
        "type": "choice",
        "instructions": "What should happen next for the adult supporting this learner?",
        "criteria": {
            "none": "Nothing. The learner is working productively.",
            "nudge": "A gentle encouragement is enough; no intervention needed.",
            "review": "The teacher should look at this session soon.",
            "escalate": "The teacher should intervene now — the learner is at risk of disengaging.",
        },
    },
    "urgency": {
        "type": "score",
        "instructions": "How urgently does this learner need human support?",
        "criteria": [
            "no support needed",
            "support sometime today",
            "support this session",
            "support right now",
        ],
    },
}


@dataclass
class AffectDecision:
    """The result of one affect classification.

    ``probability`` is Laya's P(true) for the frustration question and is
    ``None`` whenever the baseline answered instead — the baseline emits a
    hard-coded constant, never a probability, and we do not pretend otherwise.
    """

    frustration_signal: bool
    source: str  # 'laya' | 'keyword_baseline'
    threshold: float
    probability: Optional[float] = None
    model_id: Optional[str] = None
    latency_ms: Optional[float] = None
    fell_back: bool = False
    fallback_reason: Optional[str] = None
    teacher_alert: Optional[str] = None
    urgency: Optional[int] = None
    baseline: Optional[EmotionalState] = None
    raw_answers: Dict[str, Any] = field(default_factory=dict)

    @property
    def overridden_by_baseline(self) -> bool:
        """True when Laya and the keyword rule disagreed about frustration."""
        if self.baseline is None or self.source != "laya":
            return False
        return self.frustration_signal != self.baseline.frustration_signal

    def to_log_fields(self) -> Dict[str, Any]:
        """Fields to attach to an ``omega_scaffolding_events`` row / log line.

        The shipped table only has ``frustration_signal``; the extra keys here
        are what a follow-up migration would add. Until then this dict is what
        gets written to the structured log, so the disagreement rate is
        measurable without a schema change.
        """
        return {
            "affect_source": self.source,
            "affect_probability": self.probability,
            "affect_threshold": self.threshold,
            "affect_model": self.model_id,
            "affect_latency_ms": self.latency_ms,
            "affect_fell_back": self.fell_back,
            "affect_fallback_reason": self.fallback_reason,
            "affect_flipped_baseline": self.overridden_by_baseline,
            "frustration_signal": self.frustration_signal,
            "baseline_sentiment": self.baseline.sentiment if self.baseline else None,
            "teacher_alert": self.teacher_alert,
            "urgency": self.urgency,
        }


class KeywordBaselineFallback:
    """The fail-open path: exactly the behaviour shipping today."""

    name = "keyword_baseline"

    def decide(
        self,
        message: str,
        history: Optional[Sequence[Dict[str, str]]] = None,
        threshold: float = DEFAULT_FRUSTRATION_THRESHOLD,
    ) -> AffectDecision:
        state = analyze_emotional_state(message, history)
        return AffectDecision(
            frustration_signal=state.frustration_signal,
            source=self.name,
            threshold=threshold,
            baseline=state,
        )


class AffectRouter:
    """Routes affect questions to Laya, with the keyword rule as the floor.

    The model is loaded lazily and only once per instance. Construction never
    imports torch — that happens on the first :meth:`decide` — so importing this
    module in a test or a lightweight worker stays cheap.
    """

    def __init__(
        self,
        *,
        enabled: Optional[bool] = None,
        threshold: Optional[float] = None,
        model: Optional[str] = None,
        timeout_ms: Optional[int] = None,
        device: Optional[str] = None,
        fallback: Optional[KeywordBaselineFallback] = None,
    ) -> None:
        self.enabled = (
            os.environ.get(ENV_ENABLED, "").strip().lower() in ("1", "true", "yes", "on")
            if enabled is None
            else bool(enabled)
        )
        self.threshold = (
            _read_float(ENV_THRESHOLD, DEFAULT_FRUSTRATION_THRESHOLD)
            if threshold is None
            else float(threshold)
        )
        self.timeout_ms = (
            _read_int(ENV_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
            if timeout_ms is None
            else int(timeout_ms)
        )
        self.model_id = model or os.environ.get(ENV_MODEL) or "laya"
        self._device = device
        self._fallback = fallback or KeywordBaselineFallback()
        self._router: Any = None
        self._load_error: Optional[str] = None

    def decide(
        self,
        message: str,
        history: Optional[Sequence[Dict[str, str]]] = None,
    ) -> AffectDecision:
        """Classify one learner turn. Never raises."""
        baseline = analyze_emotional_state(message, history)

        if not self.enabled:
            decision = self._fallback.decide(message, history, self.threshold)
            decision.fallback_reason = "disabled"
            return decision

        started = time.perf_counter()
        try:
            answers, probabilities, used_model = self._predict(message)
        except Exception as error:  # fail open — the learner keeps the current behaviour
            logger.warning("laya affect failed, falling back to keyword baseline: %s", error)
            decision = self._fallback.decide(message, history, self.threshold)
            decision.baseline = baseline
            decision.fell_back = True
            decision.fallback_reason = _error_name(error)
            decision.latency_ms = _elapsed_ms(started)
            return decision

        probability = _probability_for(probabilities, "frustration")
        if probability is None:
            decision = self._fallback.decide(message, history, self.threshold)
            decision.baseline = baseline
            decision.fell_back = True
            decision.fallback_reason = "unparseable_output"
            decision.latency_ms = _elapsed_ms(started)
            return decision

        elapsed = _elapsed_ms(started)
        if elapsed > self.timeout_ms:
            logger.warning("laya affect took %.0fms (> %dms budget)", elapsed, self.timeout_ms)

        return AffectDecision(
            frustration_signal=probability >= self.threshold,
            source="laya",
            threshold=self.threshold,
            probability=probability,
            model_id=used_model,
            latency_ms=elapsed,
            teacher_alert=_answer_text(answers, "teacher_alert"),
            urgency=_answer_index(answers, "urgency"),
            baseline=baseline,
            raw_answers={
                "answers": _json_safe(answers),
                "probabilities": _json_safe(probabilities),
            },
        )

    # -- internals ---------------------------------------------------------

    def _predict(self, message: str) -> tuple:
        router = self._ensure_router()
        payload = router.predict(message, QUESTIONS)
        if not isinstance(payload, dict):
            raise RuntimeError(f"unexpected laya payload: {type(payload).__name__}")
        answers = payload.get("answers") or {}
        probabilities = payload.get("probabilities") or {}
        used_model = payload.get("model") or getattr(router, "model_id", None) or self.model_id
        return answers, probabilities, str(used_model)

    def _ensure_router(self) -> Any:
        if self._router is not None:
            return self._router
        if self._load_error is not None:
            raise RuntimeError(self._load_error)

        try:
            from laya import Router  # heavy: pulls torch; guarded on purpose
        except ImportError as error:  # pragma: no cover - depends on env
            self._load_error = f"laya_not_installed: {error}"
            raise RuntimeError(self._load_error) from error

        try:
            self._router = Router(
                models={"laya": "laya"} if self.model_id == "laya" else None,
                device=self._device,
                default="english",
                preload=True,
            )
        except Exception as error:  # pragma: no cover - model download / GPU
            self._load_error = f"laya_load_failed: {_error_name(error)}"
            raise RuntimeError(self._load_error) from error

        return self._router

    def unload(self) -> None:  # pragma: no cover - memory management
        self._router = None


def _read_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, "") or default)
    except ValueError:
        logger.warning("invalid %s, using %s", name, default)
        return default


def _read_int(name: str, default: int) -> int:
    try:
        return int(float(os.environ.get(name, "") or default))
    except ValueError:
        logger.warning("invalid %s, using %s", name, default)
        return default


def _error_name(error: BaseException) -> str:
    return f"{type(error).__name__}: {error}"[:200]


def _elapsed_ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 2)


def _probability_for(probabilities: Dict[str, Any], key: str) -> Optional[float]:
    """Pull P(true) for ``key`` out of Laya's probability map.

    Laya returns the noul answer as P(true), either directly or nested under a
    "true" label depending on checkpoint; accept both and reject anything that
    is not a real number rather than guessing.
    """
    entry = probabilities.get(key)
    if entry is None:
        return None
    if isinstance(entry, bool):
        return 1.0 if entry else 0.0
    if isinstance(entry, (int, float)):
        return float(entry)
    if isinstance(entry, dict):
        for candidate in ("true", "p_true", "probability"):
            value = entry.get(candidate)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                return float(value)
    return None


def _answer_text(answers: Dict[str, Any], key: str) -> Optional[str]:
    value = answers.get(key)
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for candidate in ("answer", "label", "value", "choice"):
            inner = value.get(candidate)
            if isinstance(inner, str):
                return inner
    return None


def _answer_index(answers: Dict[str, Any], key: str) -> Optional[int]:
    value = answers.get(key)
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, dict):
        for candidate in ("index", "value", "answer"):
            inner = value.get(candidate)
            if isinstance(inner, int) and not isinstance(inner, bool):
                return inner
    return None


def _json_safe(value: Any) -> Any:
    """Make nested model output safe to hand to a logger / JSON encoder."""
    try:
        return json.loads(json.dumps(value, default=str))
    except (TypeError, ValueError):
        return str(value)


_default_router: Optional[AffectRouter] = None


def classify_affect(
    message: str,
    history: Optional[Sequence[Dict[str, str]]] = None,
    *,
    router: Optional[AffectRouter] = None,
) -> AffectDecision:
    """Module-level helper using a process-wide router.

    Shared instance on purpose: loading the checkpoint costs seconds and ~850MB,
    so a worker should hold one for its lifetime rather than one per request.
    """
    global _default_router
    if router is None:
        if _default_router is None:
            _default_router = AffectRouter()
        router = _default_router
    return router.decide(message, history)


def available_sentiments() -> List[str]:  # pragma: no cover - introspection
    return ["frustrated", "confused", "confident", "neutral", "excited"]
