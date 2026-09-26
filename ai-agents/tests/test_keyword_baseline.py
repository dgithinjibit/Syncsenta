"""Golden cases for the keyword baseline port.

Every expectation below was read off the TypeScript rule in
``studio/src/lib/emotional-intelligence.ts`` by hand and then confirmed against
the compiled original by ``scripts/check_keyword_baseline_parity.py`` (3 000
generated turns, zero mismatches at the time of writing). These cases are the
readable subset: they document *why* the rule is weak, which is the whole reason
the Laya experiment exists.
"""

import pytest

from syncsenta_agents.decisions.keyword_baseline import (
    analyze_emotional_state,
    frustration_signal_from,
)


def test_bare_help_reads_as_frustration():
    """'help' is a frustration keyword, so a one-word plea overrides confusion."""
    state = analyze_emotional_state("help")
    assert state.sentiment == "frustrated"
    assert state.confidence == 0.2
    assert state.detected_patterns == ["frustration_keywords", "short_message"]
    assert state.frustration_signal is True


def test_socratic_question_reads_as_confused():
    """A curious 'why' is scored as confusion — the false positive that pushes
    engaged learners toward Intensive scaffolding."""
    state = analyze_emotional_state("why is the sky blue")
    assert state.sentiment == "confused"
    assert state.confidence == 0.4
    assert state.detected_patterns == ["confusion_keywords"]
    assert state.frustration_signal is False


@pytest.mark.parametrize(
    "message",
    ["what does this mean", "how do i start", "explain fractions", "is it right"],
)
def test_everyday_question_words_are_confusion_keywords(message):
    assert analyze_emotional_state(message).sentiment == "confused"


def test_stated_understanding_wins_over_the_same_sentences_frustration():
    """Frustration is detected first, then confidence overrides it unconditionally."""
    state = analyze_emotional_state("i don't understand, but i know i can do this")
    assert state.sentiment == "confident"
    assert state.confidence == 0.8
    assert state.detected_patterns == ["frustration_keywords", "confidence_keywords"]
    assert state.needs_encouragement is False


def test_excitement_is_suppressed_when_confidence_already_matched():
    state = analyze_emotional_state("i know this, great")
    assert state.sentiment == "confident"
    assert state.detected_patterns == ["confidence_keywords"]


def test_punctuation_counts_as_excitement():
    state = analyze_emotional_state("wow! nice")
    assert state.sentiment == "excited"
    assert state.confidence == 0.9
    assert state.frustration_signal is False


def test_short_neutral_message_becomes_confused():
    state = analyze_emotional_state("ok")
    assert state.sentiment == "confused"
    assert state.confidence == 0.4
    assert state.detected_patterns == ["short_message"]
    assert state.needs_encouragement is True


def test_empty_message_is_treated_as_short():
    """JS ``''.trim().split(/\\s+/)`` yields [''] — length 1, still <= 3."""
    state = analyze_emotional_state("")
    assert state.detected_patterns == ["short_message"]
    assert state.sentiment == "confused"


def _history(*turns):
    return [{"role": role, "content": content} for role, content in turns]


def test_repeated_question_history_marks_struggle():
    history = _history(
        ("user", "tell me about fractions"),
        ("model", "sure, what do you want to know?"),
        ("user", "tell me about fractions again please"),
    )
    state = analyze_emotional_state("the numerator is on the top line here", history)
    assert state.sentiment == "frustrated"
    assert state.confidence == 0.3
    assert "repeated_questions" in state.detected_patterns


def test_repeated_detection_needs_more_than_two_turns():
    history = _history(
        ("user", "tell me about fractions"),
        ("model", "sure"),
    )
    state = analyze_emotional_state("the numerator is on the top line here", history)
    assert "repeated_questions" not in state.detected_patterns
    assert state.sentiment == "neutral"


def test_repeated_detection_only_overrides_neutral():
    """A confident learner repeating a question stays confident."""
    history = _history(
        ("user", "tell me about fractions"),
        ("model", "sure"),
        ("user", "tell me about fractions again"),
        ("model", "again"),
    )
    state = analyze_emotional_state("i got it, that makes sense", history)
    assert state.sentiment == "confident"
    assert "repeated_questions" not in state.detected_patterns


def test_repetition_is_substring_containment_not_similarity():
    """'nine' sits inside 'nine numbers', so unrelated turns can look like repeats."""
    history = _history(
        ("user", "nine"),
        ("model", "yes"),
        ("user", "nine numbers in total"),
    )
    state = analyze_emotional_state("the answer is on the second line", history)
    assert state.sentiment == "frustrated"


def test_keyword_matching_is_case_insensitive():
    assert analyze_emotional_state("I'M STUCK").sentiment == "frustrated"
    assert analyze_emotional_state("HELP").sentiment == "frustrated"


def test_frustration_signal_helper_matches_sentiment():
    assert frustration_signal_from("i give up") is True
    assert frustration_signal_from("fifteen divided by three") is False


def test_camel_case_shape_matches_the_typescript_interface():
    payload = analyze_emotional_state("help").to_camel_case()
    assert set(payload) == {"sentiment", "confidence", "needsEncouragement", "detectedPatterns"}


def test_confidence_is_always_one_of_the_five_constants():
    constants = {0.2, 0.3, 0.4, 0.5, 0.8, 0.9}
    for message in ["help", "why", "i know", "wow", "ok", "a b c d e", "sawa"]:
        assert analyze_emotional_state(message).confidence in constants


def test_needs_encouragement_is_derived_not_independent():
    for message in ["help", "why is this", "i know it", "wow!", "the answer is four"]:
        state = analyze_emotional_state(message)
        expected = (
            state.sentiment in ("frustrated", "confused") or state.confidence < 0.5
        )
        assert state.needs_encouragement is expected
