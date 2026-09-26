"""Student-affect decision helpers.

This package exists to answer one question with a *probability* instead of a
keyword list: is this learner frustrated enough that the Omega engine should
place them in Intensive scaffolding?

Two implementations live side by side:

* :mod:`keyword_baseline` — a faithful Python port of
  ``studio/src/lib/emotional-intelligence.ts``. It is the shipped behaviour and
  the fail-open path.
* :mod:`affect` — a Laya-backed classifier that replaces only the
  *frustration signal*, never the scaffolding decision itself.

The design rationale (and the reasons Laya must NOT touch
``evaluateTutoringDecision``) is in
``docs/architecture/laya-decision-router.md``.
"""

from .affect import AffectDecision, AffectRouter, KeywordBaselineFallback
from .keyword_baseline import EmotionalState, analyze_emotional_state

__all__ = [
    "AffectDecision",
    "AffectRouter",
    "EmotionalState",
    "KeywordBaselineFallback",
    "analyze_emotional_state",
]
