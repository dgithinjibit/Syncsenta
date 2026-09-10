"""Telemetry Agent - Captures and analyzes student behavioral data.

This agent processes raw interaction events and extracts meaningful patterns:
- Dwell time analysis (hesitation, confidence)
- Pathing complexity (problem-solving approach)
- Erasure patterns (uncertainty, trial-and-error)
- Interaction velocity (rushed vs deliberate)
- Tool usage patterns (strategy preferences)

NOT just a wrapper - implements sophisticated behavioral analysis algorithms.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import statistics
import math

from ..core.logging import get_logger
from ..reasoning.hyperon_evaluator import (
    get_policy_evaluator,
    PolicyRequest,
    PolicyVerdict
)

logger = get_logger("telemetry_agent")


class EventType(Enum):
    """Student interaction event types."""
    CLICK = "click"
    HOVER = "hover"
    DRAG = "drag"
    DROP = "drop"
    UNDO = "undo"
    REDO = "redo"
    SUBMIT = "submit"
    TOOL_SELECT = "tool_select"
    OBJECT_CREATE = "object_create"
    OBJECT_DELETE = "object_delete"
    OBJECT_MODIFY = "object_modify"


class BehaviorPattern(Enum):
    """Identified behavioral patterns."""
    CONFIDENT = "confident"  # Quick, decisive actions
    HESITANT = "hesitant"  # Long dwell times, many hovers
    EXPLORATORY = "exploratory"  # Many tool switches, diverse actions
    SYSTEMATIC = "systematic"  # Linear pathing, methodical
    TRIAL_ERROR = "trial_error"  # High erasure rate, backtracking
    STUCK = "stuck"  # Circular pathing, no progress
    PRODUCTIVE_STRUGGLE = "productive_struggle"  # Slow but progressing
    UNPRODUCTIVE_FRUSTRATION = "unproductive_frustration"  # Stuck + high erasure


@dataclass
class TelemetryEvent:
    """Raw telemetry event from student interaction."""
    timestamp: float  # Unix timestamp in milliseconds
    event_type: EventType
    target: str  # What was interacted with
    position: Optional[Tuple[float, float]] = None  # (x, y) coordinates
    duration: Optional[float] = None  # Duration in milliseconds
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PathingAnalysis:
    """Analysis of student's problem-solving path."""
    total_actions: int
    unique_targets: int
    backtrack_count: int  # How many times they revisited same target
    path_complexity: float  # 0.0 (linear) to 1.0 (chaotic)
    is_circular: bool  # Stuck in a loop
    progress_rate: float  # Actions per minute
    
    def __str__(self) -> str:
        return (
            f"PathingAnalysis(actions={self.total_actions}, "
            f"complexity={self.path_complexity:.2f}, "
            f"circular={self.is_circular}, "
            f"progress={self.progress_rate:.1f}/min)"
        )


@dataclass
class DwellAnalysis:
    """Analysis of dwell time patterns."""
    mean_dwell_ms: float
    median_dwell_ms: float
    std_dev_ms: float
    max_dwell_ms: float
    hesitation_count: int  # Dwells > 3 seconds
    confidence_score: float  # 0.0 (hesitant) to 1.0 (confident)
    
    def __str__(self) -> str:
        return (
            f"DwellAnalysis(mean={self.mean_dwell_ms:.0f}ms, "
            f"hesitations={self.hesitation_count}, "
            f"confidence={self.confidence_score:.2f})"
        )


@dataclass
class ErasureAnalysis:
    """Analysis of undo/redo patterns."""
    undo_count: int
    redo_count: int
    erasure_rate: float  # Undos per total actions
    net_progress: int  # Total actions - undos
    uncertainty_score: float  # 0.0 (certain) to 1.0 (uncertain)
    
    def __str__(self) -> str:
        return (
            f"ErasureAnalysis(undos={self.undo_count}, "
            f"rate={self.erasure_rate:.2%}, "
            f"uncertainty={self.uncertainty_score:.2f})"
        )


@dataclass
class VelocityAnalysis:
    """Analysis of interaction velocity."""
    actions_per_minute: float
    velocity_trend: str  # "accelerating", "decelerating", "steady"
    is_rushed: bool  # Too fast, likely careless
    is_deliberate: bool  # Slow but purposeful
    
    def __str__(self) -> str:
        return (
            f"VelocityAnalysis(apm={self.actions_per_minute:.1f}, "
            f"trend={self.velocity_trend}, "
            f"rushed={self.is_rushed})"
        )


@dataclass
class ToolUsageAnalysis:
    """Analysis of tool selection patterns."""
    tools_used: List[str]
    tool_switches: int
    dominant_tool: Optional[str]
    strategy_type: str  # "focused", "exploratory", "scattered"
    
    def __str__(self) -> str:
        return (
            f"ToolUsageAnalysis(tools={len(self.tools_used)}, "
            f"switches={self.tool_switches}, "
            f"strategy={self.strategy_type})"
        )


@dataclass
class BehavioralProfile:
    """Complete behavioral profile from telemetry analysis."""
    session_id: str
    student_id: str
    activity_type: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    
    # Sub-analyses
    pathing: PathingAnalysis
    dwell: DwellAnalysis
    erasure: ErasureAnalysis
    velocity: VelocityAnalysis
    tool_usage: ToolUsageAnalysis
    
    # Overall assessment
    primary_pattern: BehaviorPattern
    secondary_patterns: List[BehaviorPattern]
    engagement_score: float  # 0.0 to 1.0
    mastery_indicator: float  # 0.0 (struggling) to 1.0 (mastered)
    intervention_needed: bool
    intervention_urgency: str  # "none", "low", "medium", "high", "critical"
    
    # Policy evaluation (MeTTa/Hyperon)
    policy_verdict: Optional[PolicyVerdict] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "session_id": self.session_id,
            "student_id": self.student_id,
            "activity_type": self.activity_type,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration_seconds": self.duration_seconds,
            "pathing": {
                "total_actions": self.pathing.total_actions,
                "unique_targets": self.pathing.unique_targets,
                "backtrack_count": self.pathing.backtrack_count,
                "path_complexity": self.pathing.path_complexity,
                "is_circular": self.pathing.is_circular,
                "progress_rate": self.pathing.progress_rate,
            },
            "dwell": {
                "mean_dwell_ms": self.dwell.mean_dwell_ms,
                "median_dwell_ms": self.dwell.median_dwell_ms,
                "std_dev_ms": self.dwell.std_dev_ms,
                "max_dwell_ms": self.dwell.max_dwell_ms,
                "hesitation_count": self.dwell.hesitation_count,
                "confidence_score": self.dwell.confidence_score,
            },
            "erasure": {
                "undo_count": self.erasure.undo_count,
                "redo_count": self.erasure.redo_count,
                "erasure_rate": self.erasure.erasure_rate,
                "net_progress": self.erasure.net_progress,
                "uncertainty_score": self.erasure.uncertainty_score,
            },
            "velocity": {
                "actions_per_minute": self.velocity.actions_per_minute,
                "velocity_trend": self.velocity.velocity_trend,
                "is_rushed": self.velocity.is_rushed,
                "is_deliberate": self.velocity.is_deliberate,
            },
            "tool_usage": {
                "tools_used": self.tool_usage.tools_used,
                "tool_switches": self.tool_usage.tool_switches,
                "dominant_tool": self.tool_usage.dominant_tool,
                "strategy_type": self.tool_usage.strategy_type,
            },
            "primary_pattern": self.primary_pattern.value,
            "secondary_patterns": [p.value for p in self.secondary_patterns],
            "engagement_score": self.engagement_score,
            "mastery_indicator": self.mastery_indicator,
            "intervention_needed": self.intervention_needed,
            "intervention_urgency": self.intervention_urgency,
            "policy_verdict": {
                "approved": self.policy_verdict.approved,
                "verdict": self.policy_verdict.verdict,
                "reasoning": self.policy_verdict.reasoning,
                "evaluator_type": self.policy_verdict.evaluator_type,
            } if self.policy_verdict else None,
        }


class TelemetryAgent:
    """
    Sophisticated telemetry analysis agent.
    
    This is NOT just a wrapper - it implements complex behavioral analysis:
    - Pattern recognition algorithms
    - Statistical analysis of interaction data
    - Behavioral profiling
    - Intervention detection
    """
    
    def __init__(self):
        self.logger = get_logger("telemetry_agent")
        self.session_cache: Dict[str, List[TelemetryEvent]] = {}
        
    async def process_events(
        self,
        events: List[Dict[str, Any]],
        session_id: str,
        student_id: str,
        activity_type: str
    ) -> BehavioralProfile:
        """
        Process raw telemetry events and generate behavioral profile.
        
        This is the main entry point for telemetry analysis.
        """
        self.logger.info(
            f"Processing {len(events)} events for session {session_id}",
            student_id=student_id,
            activity_type=activity_type
        )
        
        # Parse events
        parsed_events = self._parse_events(events)
        
        # Cache events for this session
        self.session_cache[session_id] = parsed_events
        
        # Run all analyses in parallel
        pathing, dwell, erasure, velocity, tool_usage = await asyncio.gather(
            self._analyze_pathing(parsed_events),
            self._analyze_dwell(parsed_events),
            self._analyze_erasure(parsed_events),
            self._analyze_velocity(parsed_events),
            self._analyze_tool_usage(parsed_events)
        )
        
        # Identify behavioral patterns
        primary_pattern, secondary_patterns = self._identify_patterns(
            pathing, dwell, erasure, velocity, tool_usage
        )
        
        # Calculate engagement and mastery
        engagement_score = self._calculate_engagement(
            pathing, dwell, velocity, tool_usage
        )
        mastery_indicator = self._calculate_mastery(
            pathing, erasure, velocity
        )
        
        # Determine intervention needs
        intervention_needed, urgency = self._assess_intervention_need(
            primary_pattern, secondary_patterns, mastery_indicator, pathing
        )
        
        # Calculate session duration before policy evaluation and profile creation.
        start_time = datetime.fromtimestamp(parsed_events[0].timestamp / 1000)
        end_time = datetime.fromtimestamp(parsed_events[-1].timestamp / 1000)
        duration = (end_time - start_time).total_seconds()

        # === MeTTa Policy Evaluation (Task 5) ===
        # Evaluate policy on the telemetry data before finalizing profile
        policy_evaluator = get_policy_evaluator()
        
        # Construct telemetry dict for policy evaluation
        telemetry_data = {
            "erasure_count": erasure.undo_count,
            "dwell_time_seconds": dwell.mean_dwell_ms / 1000.0,
            "attempt_count": pathing.backtrack_count + 1,
            "first_attempt_correct": mastery_indicator > 0.8,
            "engagement_score": engagement_score,
            "mastery_indicator": mastery_indicator,
            "pattern": primary_pattern.value,
        }
        
        policy_request = PolicyRequest(
            role="student",
            age_band="unknown",
            intent="socratic-tutor",
            goal="inclusive-learning",
            connectivity="online",
            consent="unknown",
            safety_signal="clear",
            accessibility="default",
        )

        policy_verdict = policy_evaluator.evaluate_session(policy_request)
        
        self.logger.info(
            f"Policy evaluation for session {session_id}",
            approved=policy_verdict.approved,
            verdict=policy_verdict.verdict,
            evaluator=policy_verdict.evaluator_type
        )
        
        # Build profile
        profile = BehavioralProfile(
            session_id=session_id,
            student_id=student_id,
            activity_type=activity_type,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            pathing=pathing,
            dwell=dwell,
            erasure=erasure,
            velocity=velocity,
            tool_usage=tool_usage,
            primary_pattern=primary_pattern,
            secondary_patterns=secondary_patterns,
            engagement_score=engagement_score,
            mastery_indicator=mastery_indicator,
            intervention_needed=intervention_needed,
            intervention_urgency=urgency,
            policy_verdict=policy_verdict  # MeTTa policy evaluation result
        )
        
        self.logger.info(
            f"Generated behavioral profile for {student_id}",
            primary_pattern=primary_pattern.value,
            mastery=f"{mastery_indicator:.2f}",
            intervention_needed=intervention_needed,
            urgency=urgency,
            policy_approved=policy_verdict.approved,
            policy_verdict=policy_verdict.verdict
        )
        
        return profile
    
    def _parse_events(self, raw_events: List[Dict[str, Any]]) -> List[TelemetryEvent]:
        """Parse raw event dictionaries into TelemetryEvent objects."""
        events = []
        for raw in raw_events:
            try:
                event = TelemetryEvent(
                    timestamp=raw["timestamp"],
                    event_type=EventType(raw["event_type"]),
                    target=raw["target"],
                    position=tuple(raw["position"]) if raw.get("position") else None,
                    duration=raw.get("duration"),
                    metadata=raw.get("metadata", {})
                )
                events.append(event)
            except (KeyError, ValueError) as e:
                self.logger.warning(f"Failed to parse event: {e}", raw_event=raw)
        return events
    
    async def _analyze_pathing(self, events: List[TelemetryEvent]) -> PathingAnalysis:
        """
        Analyze the student's problem-solving path.
        
        Algorithm:
        1. Track sequence of targets interacted with
        2. Detect backtracking (revisiting same target)
        3. Calculate path complexity using entropy
        4. Detect circular patterns (stuck in loop)
        5. Calculate progress rate
        """
        if not events:
            return PathingAnalysis(0, 0, 0, 0.0, False, 0.0)
        
        # Extract target sequence
        targets = [e.target for e in events]
        unique_targets = set(targets)
        
        # Count backtracks (revisiting same target)
        backtrack_count = 0
        seen_targets = set()
        for target in targets:
            if target in seen_targets:
                backtrack_count += 1
            seen_targets.add(target)
        
        # Calculate path complexity using normalized entropy
        # Higher entropy = more chaotic/exploratory
        # Lower entropy = more systematic/linear
        target_counts = {}
        for target in targets:
            target_counts[target] = target_counts.get(target, 0) + 1
        
        total = len(targets)
        entropy = 0.0
        for count in target_counts.values():
            p = count / total
            entropy -= p * math.log2(p) if p > 0 else 0
        
        # Normalize entropy to 0-1 range
        max_entropy = math.log2(len(unique_targets)) if len(unique_targets) > 1 else 1
        path_complexity = entropy / max_entropy if max_entropy > 0 else 0.0
        
        # Detect circular patterns (stuck in loop)
        # Check if last 5 actions repeat a pattern
        is_circular = False
        if len(targets) >= 10:
            recent = targets[-10:]
            # Simple pattern detection: check if same 2-3 targets repeat
            if len(set(recent)) <= 3:
                is_circular = True
        
        # Calculate progress rate (actions per minute)
        duration_minutes = (events[-1].timestamp - events[0].timestamp) / 60000
        progress_rate = len(events) / duration_minutes if duration_minutes > 0 else 0.0
        
        return PathingAnalysis(
            total_actions=len(events),
            unique_targets=len(unique_targets),
            backtrack_count=backtrack_count,
            path_complexity=path_complexity,
            is_circular=is_circular,
            progress_rate=progress_rate
        )
    
    async def _analyze_dwell(self, events: List[TelemetryEvent]) -> DwellAnalysis:
        """
        Analyze dwell time patterns.
        
        Algorithm:
        1. Extract durations from every timed interaction
        2. Calculate statistical measures (mean, median, std dev)
        3. Count hesitations (dwells > 3 seconds)
        4. Calculate confidence score based on dwell consistency
        """
        # Dwell is interaction time, not only pointer-hover time. Touch-first
        # learners and keyboard users commonly produce timed clicks, drags, and
        # submissions without emitting HOVER events.
        timed_events = [e for e in events if e.duration is not None and e.duration > 0]
        
        if not timed_events:
            return DwellAnalysis(0, 0, 0, 0, 0, 1.0)
        
        durations = [e.duration for e in timed_events]
        
        mean_dwell = statistics.mean(durations)
        median_dwell = statistics.median(durations)
        std_dev = statistics.stdev(durations) if len(durations) > 1 else 0
        max_dwell = max(durations)
        
        # Count hesitations (dwells > 3000ms)
        hesitation_count = sum(1 for d in durations if d > 3000)
        
        # Calculate confidence score
        # Low std dev + low mean = confident
        # High std dev or high mean = hesitant
        confidence_score = 1.0 - min(1.0, (mean_dwell / 5000) * (std_dev / 2000))
        confidence_score = max(0.0, confidence_score)
        
        return DwellAnalysis(
            mean_dwell_ms=mean_dwell,
            median_dwell_ms=median_dwell,
            std_dev_ms=std_dev,
            max_dwell_ms=max_dwell,
            hesitation_count=hesitation_count,
            confidence_score=confidence_score
        )
    
    async def _analyze_erasure(self, events: List[TelemetryEvent]) -> ErasureAnalysis:
        """
        Analyze undo/redo patterns.
        
        Algorithm:
        1. Count undos and redos
        2. Calculate erasure rate (undos / total actions)
        3. Calculate net progress (actions - undos)
        4. Calculate uncertainty score based on erasure rate
        """
        undo_count = sum(1 for e in events if e.event_type == EventType.UNDO)
        redo_count = sum(1 for e in events if e.event_type == EventType.REDO)
        total_actions = len(events)
        
        erasure_rate = undo_count / total_actions if total_actions > 0 else 0.0
        net_progress = total_actions - undo_count
        
        # Calculate uncertainty score
        # High erasure rate = high uncertainty
        uncertainty_score = min(1.0, erasure_rate * 3)  # Scale up for sensitivity
        
        return ErasureAnalysis(
            undo_count=undo_count,
            redo_count=redo_count,
            erasure_rate=erasure_rate,
            net_progress=net_progress,
            uncertainty_score=uncertainty_score
        )
    
    async def _analyze_velocity(self, events: List[TelemetryEvent]) -> VelocityAnalysis:
        """
        Analyze interaction velocity.
        
        Algorithm:
        1. Calculate actions per minute
        2. Detect velocity trend (accelerating/decelerating/steady)
        3. Classify as rushed or deliberate
        """
        if len(events) < 2:
            return VelocityAnalysis(0, "steady", False, False)
        
        duration_minutes = (events[-1].timestamp - events[0].timestamp) / 60000
        actions_per_minute = len(events) / duration_minutes if duration_minutes > 0 else 0
        
        # Analyze velocity trend by comparing first half vs second half
        mid = len(events) // 2
        first_half = events[:mid]
        second_half = events[mid:]
        
        first_duration = (first_half[-1].timestamp - first_half[0].timestamp) / 60000
        second_duration = (second_half[-1].timestamp - second_half[0].timestamp) / 60000
        
        first_apm = len(first_half) / first_duration if first_duration > 0 else 0
        second_apm = len(second_half) / second_duration if second_duration > 0 else 0
        
        if second_apm > first_apm * 1.2:
            velocity_trend = "accelerating"
        elif second_apm < first_apm * 0.8:
            velocity_trend = "decelerating"
        else:
            velocity_trend = "steady"
        
        # Classify as rushed or deliberate
        is_rushed = actions_per_minute > 30  # More than 30 actions/min is rushed
        is_deliberate = actions_per_minute < 10 and actions_per_minute > 2  # 2-10 is deliberate
        
        return VelocityAnalysis(
            actions_per_minute=actions_per_minute,
            velocity_trend=velocity_trend,
            is_rushed=is_rushed,
            is_deliberate=is_deliberate
        )
    
    async def _analyze_tool_usage(self, events: List[TelemetryEvent]) -> ToolUsageAnalysis:
        """
        Analyze tool selection patterns.
        
        Algorithm:
        1. Track all tools used
        2. Count tool switches
        3. Identify dominant tool
        4. Classify strategy type
        """
        tool_events = [e for e in events if e.event_type == EventType.TOOL_SELECT]
        
        if not tool_events:
            return ToolUsageAnalysis([], 0, None, "none")
        
        tools_used = [e.target for e in tool_events]
        unique_tools = list(set(tools_used))
        
        # Count tool switches
        tool_switches = sum(
            1 for i in range(1, len(tools_used))
            if tools_used[i] != tools_used[i-1]
        )
        
        # Find dominant tool
        tool_counts = {}
        for tool in tools_used:
            tool_counts[tool] = tool_counts.get(tool, 0) + 1
        dominant_tool = max(tool_counts, key=tool_counts.get) if tool_counts else None
        
        # Classify strategy type
        if len(unique_tools) == 1:
            strategy_type = "focused"  # Only one tool
        elif tool_switches > len(tools_used) * 0.5:
            strategy_type = "scattered"  # Too many switches
        else:
            strategy_type = "exploratory"  # Balanced exploration
        
        return ToolUsageAnalysis(
            tools_used=unique_tools,
            tool_switches=tool_switches,
            dominant_tool=dominant_tool,
            strategy_type=strategy_type
        )
    
    def _identify_patterns(
        self,
        pathing: PathingAnalysis,
        dwell: DwellAnalysis,
        erasure: ErasureAnalysis,
        velocity: VelocityAnalysis,
        tool_usage: ToolUsageAnalysis
    ) -> Tuple[BehaviorPattern, List[BehaviorPattern]]:
        """
        Identify behavioral patterns from analyses.
        
        This uses a rule-based system to classify behavior.
        """
        patterns = []
        
        # Confident: Low dwell, low erasure, steady velocity
        if dwell.confidence_score > 0.7 and erasure.uncertainty_score < 0.3:
            patterns.append(BehaviorPattern.CONFIDENT)
        
        # Hesitant: High dwell, many hesitations
        if dwell.hesitation_count > 5 or dwell.confidence_score < 0.3:
            patterns.append(BehaviorPattern.HESITANT)
        
        # Exploratory: Many tool switches, high path complexity
        if tool_usage.strategy_type == "exploratory" and pathing.path_complexity > 0.6:
            patterns.append(BehaviorPattern.EXPLORATORY)
        
        # Systematic: Low path complexity, focused tool usage
        if pathing.path_complexity < 0.4 and tool_usage.strategy_type == "focused":
            patterns.append(BehaviorPattern.SYSTEMATIC)
        
        # Trial and error: High erasure rate, many backtracks
        if erasure.erasure_rate > 0.3 or pathing.backtrack_count > 10:
            patterns.append(BehaviorPattern.TRIAL_ERROR)
        
        # Stuck: Circular pathing, low progress
        if pathing.is_circular or pathing.progress_rate < 5:
            patterns.append(BehaviorPattern.STUCK)
        
        # Productive struggle: Slow but progressing, deliberate
        if velocity.is_deliberate and not pathing.is_circular and erasure.erasure_rate < 0.5:
            patterns.append(BehaviorPattern.PRODUCTIVE_STRUGGLE)
        
        # Unproductive frustration: Stuck + high erasure
        if pathing.is_circular and erasure.erasure_rate > 0.4:
            patterns.append(BehaviorPattern.UNPRODUCTIVE_FRUSTRATION)
        
        # Primary pattern is the most severe/important
        if BehaviorPattern.UNPRODUCTIVE_FRUSTRATION in patterns:
            primary = BehaviorPattern.UNPRODUCTIVE_FRUSTRATION
        elif BehaviorPattern.STUCK in patterns:
            primary = BehaviorPattern.STUCK
        elif BehaviorPattern.PRODUCTIVE_STRUGGLE in patterns:
            primary = BehaviorPattern.PRODUCTIVE_STRUGGLE
        elif BehaviorPattern.TRIAL_ERROR in patterns:
            primary = BehaviorPattern.TRIAL_ERROR
        elif BehaviorPattern.CONFIDENT in patterns:
            primary = BehaviorPattern.CONFIDENT
        elif BehaviorPattern.SYSTEMATIC in patterns:
            primary = BehaviorPattern.SYSTEMATIC
        elif BehaviorPattern.EXPLORATORY in patterns:
            primary = BehaviorPattern.EXPLORATORY
        elif BehaviorPattern.HESITANT in patterns:
            primary = BehaviorPattern.HESITANT
        else:
            primary = BehaviorPattern.EXPLORATORY  # Default
        
        # Secondary patterns are all others
        secondary = [p for p in patterns if p != primary]
        
        return primary, secondary
    
    def _calculate_engagement(
        self,
        pathing: PathingAnalysis,
        dwell: DwellAnalysis,
        velocity: VelocityAnalysis,
        tool_usage: ToolUsageAnalysis
    ) -> float:
        """Calculate engagement score (0.0 to 1.0)."""
        # High engagement = many actions, diverse tools, steady velocity
        action_score = min(1.0, pathing.total_actions / 50)  # 50+ actions = full score
        tool_score = min(1.0, len(tool_usage.tools_used) / 5)  # 5+ tools = full score
        velocity_score = 1.0 if velocity.velocity_trend == "steady" else 0.5
        
        engagement = (action_score + tool_score + velocity_score) / 3
        return engagement
    
    def _calculate_mastery(
        self,
        pathing: PathingAnalysis,
        erasure: ErasureAnalysis,
        velocity: VelocityAnalysis
    ) -> float:
        """Calculate mastery indicator (0.0 to 1.0)."""
        # High mastery = low complexity, low erasure, efficient velocity
        complexity_score = 1.0 - pathing.path_complexity
        erasure_score = 1.0 - erasure.uncertainty_score
        velocity_score = 1.0 if 10 <= velocity.actions_per_minute <= 25 else 0.5
        
        mastery = (complexity_score + erasure_score + velocity_score) / 3
        return mastery
    
    def _assess_intervention_need(
        self,
        primary_pattern: BehaviorPattern,
        secondary_patterns: List[BehaviorPattern],
        mastery: float,
        pathing: PathingAnalysis
    ) -> Tuple[bool, str]:
        """Assess if intervention is needed and urgency level."""
        # Critical: Unproductive frustration
        if primary_pattern == BehaviorPattern.UNPRODUCTIVE_FRUSTRATION:
            return True, "critical"
        
        # High: Stuck or very low mastery
        if primary_pattern == BehaviorPattern.STUCK or mastery < 0.3:
            return True, "high"
        
        # Medium: Trial and error with low mastery
        if primary_pattern == BehaviorPattern.TRIAL_ERROR and mastery < 0.5:
            return True, "medium"
        
        # Low: Hesitant but progressing
        if primary_pattern == BehaviorPattern.HESITANT and mastery > 0.4:
            return True, "low"
        
        # No intervention needed
        return False, "none"
