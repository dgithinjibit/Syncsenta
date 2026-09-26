"""Keyword baseline — Python port of ``studio/src/lib/emotional-intelligence.ts``.

Why this file exists
--------------------
The Omega tutoring engine reads a single boolean, ``frustrationSignal``, and it
is produced here (in TypeScript) by substring-scanning the student's message.
That boolean can flip a learner into ``Intensive`` scaffolding, so any change to
how we detect affect has to be measured against what the current rule actually
does. This module pins the current rule down in Python so the Laya experiment
and the shipped behaviour can be compared on the same input.

Parity contract
---------------
Every constant, keyword list, override order, confidence value and pattern name
mirrors the TypeScript source. The parity tests in
``tests/test_keyword_baseline_parity.py`` assert the mapping. Two deliberate
differences are documented inline: JavaScript ``toLowerCase()`` vs Python
``str.lower()``, and the tokenizer used for the short-message rule.

This module is pure: no I/O, no network, no model. Keep it that way — it is the
fail-open path when the model is unavailable.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence

Sentiment = str  # 'frustrated' | 'confused' | 'confident' | 'neutral' | 'excited'

# Mirrors frustrationKeywords in emotional-intelligence.ts:31-35
FRUSTRATION_KEYWORDS: tuple = (
    "i don't understand", "i don't get it", "this is hard", "too difficult",
    "i can't", "i give up", "this doesn't make sense", "confused",
    "why is this so hard", "i'm stuck", "help", "i'm lost",
)

# Mirrors confusionKeywords in emotional-intelligence.ts:38-41
CONFUSION_KEYWORDS: tuple = (
    "what does", "how do", "why", "what is", "explain", "i'm not sure",
    "maybe", "i think", "is it", "could it be",
)

# Mirrors confidenceKeywords in emotional-intelligence.ts:44-47
CONFIDENCE_KEYWORDS: tuple = (
    "i know", "i understand", "i got it", "i see", "that makes sense",
    "i can do this", "i think i know", "let me try",
)

# Mirrors excitementKeywords in emotional-intelligence.ts:50-53
EXCITEMENT_KEYWORDS: tuple = (
    "wow", "cool", "awesome", "amazing", "i love", "this is fun",
    "interesting", "great", "yay", "!", "nice",
)

# Hard-coded confidences from the TS rule (lines 62, 70, 78, 86, 105, 114).
CONFIDENCE_FRUSTRATED = 0.2
CONFIDENCE_CONFUSED = 0.4
CONFIDENCE_CONFIDENT = 0.8
CONFIDENCE_EXCITED = 0.9
CONFIDENCE_REPEATED_QUESTIONS = 0.3
CONFIDENCE_NEUTRAL = 0.5

RECENT_USER_MESSAGES = 3


@dataclass
class EmotionalState:
    """Same shape as the ``EmotionalState`` interface in TS.

    ``confidence`` is the rule's own self-reported certainty, not a calibrated
    probability — it is one of five constants above.
    """

    sentiment: Sentiment
    confidence: float
    needs_encouragement: bool
    detected_patterns: List[str] = field(default_factory=list)

    @property
    def frustration_signal(self) -> bool:
        """What the Omega engine actually consumes.

        In ``studio/src/lib/chat/subject-session.ts`` the flag is
        ``sentiment === 'frustrated'``, so we mirror exactly that rather than
        broadening it to ``needs_encouragement``.
        """
        return self.sentiment == "frustrated"

    def to_camel_case(self) -> Dict[str, object]:
        """Wire shape used by the TypeScript side."""
        return {
            "sentiment": self.sentiment,
            "confidence": self.confidence,
            "needsEncouragement": self.needs_encouragement,
            "detectedPatterns": list(self.detected_patterns),
        }


def _contains_any(haystack: str, needles: Sequence[str]) -> bool:
    return any(needle in haystack for needle in needles)


def _has_repeated_questions(
    history: Optional[Sequence[Dict[str, str]]]
) -> bool:
    """Mirror emotional-intelligence.ts:91-101.

    The TS version looks at the last three *user* turns and flags a repeat when
    one message is a substring of another (in either direction). That is a
    containment check, not a similarity check, so a short message that happens
    to sit inside a later one counts.
    """
    if not history or len(history) <= 2:
        return False

    recent = [
        (message.get("content") or "").lower()
        for message in [m for m in history if m.get("role") == "user"][-RECENT_USER_MESSAGES:]
    ]

    for index, message in enumerate(recent):
        for other in recent[index + 1:]:
            if message in other or other in message:
                return True
    return False


def _word_count(message: str) -> int:
    """Mirror ``message.trim().split(/\\s+/).length``.

    JS and Python agree on every non-empty input. They differ for an empty or
    whitespace-only message: JS ``split`` yields ``['']`` (length 1) where Python
    ``str.split()`` yields ``[]`` (length 0), so we report 1 to match. Either
    value is <= 3 and the rule's outcome is the same; the parity is kept anyway
    so the two implementations cannot drift.
    """
    return len(message.strip().split()) or 1


def analyze_emotional_state(
    message: str,
    history: Optional[Sequence[Dict[str, str]]] = None,
) -> EmotionalState:
    """Port of ``analyzeEmotionalState(message, history?)``.

    ``history`` is a sequence of ``{"role": "user" | "model", "content": str}``
    maps, matching the TS ``Array<{role, content}>`` parameter.
    """
    lower_message = message.lower()
    detected_patterns: List[str] = []

    has_frustration = _contains_any(lower_message, FRUSTRATION_KEYWORDS)
    has_confusion = _contains_any(lower_message, CONFUSION_KEYWORDS)
    has_confidence = _contains_any(lower_message, CONFIDENCE_KEYWORDS)
    has_excitement = _contains_any(lower_message, EXCITEMENT_KEYWORDS)

    sentiment: Sentiment = "neutral"
    confidence = CONFIDENCE_NEUTRAL

    # Order matters and matches TS: frustration, then confusion only when still
    # neutral, then confidence always overrides, then excitement unless the
    # learner already read as confident.
    if has_frustration:
        sentiment = "frustrated"
        confidence = CONFIDENCE_FRUSTRATED
        detected_patterns.append("frustration_keywords")

    if has_confusion and sentiment == "neutral":
        sentiment = "confused"
        confidence = CONFIDENCE_CONFUSED
        detected_patterns.append("confusion_keywords")

    if has_confidence:
        sentiment = "confident"
        confidence = CONFIDENCE_CONFIDENT
        detected_patterns.append("confidence_keywords")

    if has_excitement and not has_confidence:
        sentiment = "excited"
        confidence = CONFIDENCE_EXCITED
        detected_patterns.append("excitement_keywords")

    if _has_repeated_questions(history) and sentiment == "neutral":
        sentiment = "frustrated"
        confidence = CONFIDENCE_REPEATED_QUESTIONS
        detected_patterns.append("repeated_questions")

    if _word_count(message) <= 3 and not has_excitement:
        if sentiment == "neutral":
            sentiment = "confused"
            confidence = CONFIDENCE_CONFUSED
        detected_patterns.append("short_message")

    needs_encouragement = (
        sentiment in ("frustrated", "confused") or confidence < 0.5
    )

    return EmotionalState(
        sentiment=sentiment,
        confidence=confidence,
        needs_encouragement=needs_encouragement,
        detected_patterns=detected_patterns,
    )


def frustration_signal_from(message: str) -> bool:
    """Convenience helper matching the call site in subject-session.ts."""
    return analyze_emotional_state(message).frustration_signal
