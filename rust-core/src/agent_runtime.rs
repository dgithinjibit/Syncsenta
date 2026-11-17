use crate::{AgentPolicy, Decision, MainAgent, MettaError, Request};

/// Provider-neutral text generation seam for the Rust agent runtime.
///
/// A production backend can implement this with an HTTP client, an on-device
/// model, or an offline cache. The policy planner runs before this trait is
/// invoked, so blocked requests never reach an inference provider.
pub trait TextBackend {
    fn generate(&mut self, prompt: &str) -> Result<String, BackendError>;
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum BackendError {
    Unavailable(String),
    InvalidResponse(String),
}

impl std::fmt::Display for BackendError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unavailable(message) => write!(f, "backend unavailable: {message}"),
            Self::InvalidResponse(message) => write!(f, "invalid backend response: {message}"),
        }
    }
}

impl std::error::Error for BackendError {}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RuntimeError {
    Metta(MettaError),
    Backend(BackendError),
}

impl std::fmt::Display for RuntimeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Metta(error) => error.fmt(f),
            Self::Backend(error) => error.fmt(f),
        }
    }
}

impl std::error::Error for RuntimeError {}

impl From<MettaError> for RuntimeError {
    fn from(error: MettaError) -> Self {
        Self::Metta(error)
    }
}

impl From<BackendError> for RuntimeError {
    fn from(error: BackendError) -> Self {
        Self::Backend(error)
    }
}

/// Rust-owned orchestration boundary for Syncsenta.
///
/// The runtime performs: Rust policy planning -> MeTTa verdict enforcement ->
/// optional text generation. This makes the Python agent service replaceable
/// without changing the student-facing policy contract.
pub struct AgentRuntime<B> {
    planner: MainAgent,
    backend: B,
}

impl<B> AgentRuntime<B> {
    pub fn new(policy: AgentPolicy, backend: B) -> Self {
        Self {
            planner: MainAgent::new(policy),
            backend,
        }
    }

    pub fn plan(&self, request: &Request, metta_atom: &str) -> Result<Decision, RuntimeError> {
        Ok(self.planner.plan_with_metta_result(request, metta_atom)?)
    }

    pub fn handle(
        &mut self,
        request: &Request,
        metta_atom: &str,
        prompt: &str,
    ) -> Result<RuntimeResponse, RuntimeError>
    where
        B: TextBackend,
    {
        let decision = self.plan(request, metta_atom)?;
        if !decision.is_actionable() {
            return Ok(RuntimeResponse {
                decision,
                text: "This request requires a safety, consent, or human-review step before learning assistance can continue.".to_string(),
            });
        }

        let text = self.backend.generate(prompt)?;
        Ok(RuntimeResponse { decision, text })
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuntimeResponse {
    pub decision: Decision,
    pub text: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{AgeBand, Connectivity, ConsentState, Role, SafetySignals};

    #[derive(Default)]
    struct FakeBackend {
        calls: usize,
    }

    impl TextBackend for FakeBackend {
        fn generate(&mut self, prompt: &str) -> Result<String, BackendError> {
            self.calls += 1;
            Ok(format!("generated: {prompt}"))
        }
    }

    fn safe_request() -> Request {
        Request::new("Explain fractions")
            .with_request_id("runtime-test")
            .with_role(Role::Student)
            .with_age_band(AgeBand::Primary)
            .with_connectivity(Connectivity::Online)
            .with_consent(ConsentState::Granted)
            .with_safety(SafetySignals::default())
    }

    #[test]
    fn approved_metta_verdict_reaches_backend() {
        let mut runtime = AgentRuntime::new(AgentPolicy::default(), FakeBackend::default());
        let response = runtime
            .handle(&safe_request(), "Approved", "Explain fractions")
            .unwrap();
        assert!(response.decision.is_actionable());
        assert_eq!(response.text, "generated: Explain fractions");
    }

    #[test]
    fn review_verdict_blocks_backend() {
        let mut runtime = AgentRuntime::new(AgentPolicy::default(), FakeBackend::default());
        let response = runtime
            .handle(&safe_request(), "(Review consent)", "Explain fractions")
            .unwrap();
        assert!(!response.decision.is_actionable());
        assert!(response.text.contains("human-review"));
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScaffoldingLevel {
    Independent,
    Guided,
    Intensive,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct LearningState {
    pub attempts: u16,
    pub correct_attempts: u16,
    pub hints_used: u8,
    pub frustration_signal: bool,
}

impl LearningState {
    pub fn mastery_percent(self) -> u8 {
        if self.attempts == 0 {
            return 0;
        }
        ((self.correct_attempts.min(self.attempts) as u32 * 100) / self.attempts as u32) as u8
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TutoringDecision {
    pub scaffolding: ScaffoldingLevel,
    pub hint: &'static str,
    pub next_action: &'static str,
}

/// Deterministic tutoring policy. It is intentionally small and explainable;
/// MeTTa can later provide the same decision as a policy verdict without
/// changing the public Rust response type.
pub fn decide_tutoring(state: LearningState) -> TutoringDecision {
    if state.frustration_signal || state.hints_used >= 2 || state.mastery_percent() < 40 {
        return TutoringDecision {
            scaffolding: ScaffoldingLevel::Intensive,
            hint: "Let us take one small step together. Look for the part you already know.",
            next_action: "show_conceptual_example",
        };
    }
    if state.attempts == 0 || state.mastery_percent() < 80 {
        return TutoringDecision {
            scaffolding: ScaffoldingLevel::Guided,
            hint: "What do you notice first? Say or write one idea before trying the next step.",
            next_action: "ask_guiding_question",
        };
    }
    TutoringDecision {
        scaffolding: ScaffoldingLevel::Independent,
        hint: "Try the next question independently, then explain how you got your answer.",
        next_action: "present_next_challenge",
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TutoringResponse {
    pub runtime: RuntimeResponse,
    pub tutoring: TutoringDecision,
}

impl<B> AgentRuntime<B>
where
    B: TextBackend,
{
    pub fn handle_tutoring(
        &mut self,
        request: &Request,
        metta_atom: &str,
        state: LearningState,
        prompt: &str,
    ) -> Result<TutoringResponse, RuntimeError> {
        let tutoring = decide_tutoring(state);
        let runtime = self.handle(
            request,
            metta_atom,
            &format!("{prompt}\nTutoring action: {}", tutoring.next_action),
        )?;
        Ok(TutoringResponse { runtime, tutoring })
    }
}

#[cfg(test)]
mod tutoring_tests {
    use super::*;
    use crate::{AgeBand, Connectivity, ConsentState, Role, SafetySignals};

    #[derive(Default)]
    struct Backend;

    impl TextBackend for Backend {
        fn generate(&mut self, prompt: &str) -> Result<String, BackendError> {
            Ok(prompt.to_string())
        }
    }

    fn request() -> Request {
        Request::new("Help with fractions")
            .with_request_id("tutoring-test")
            .with_role(Role::Student)
            .with_age_band(AgeBand::Primary)
            .with_connectivity(Connectivity::Offline)
            .with_consent(ConsentState::Granted)
            .with_safety(SafetySignals::default())
    }

    #[test]
    fn scaffolding_is_bounded_and_deterministic() {
        let decision = decide_tutoring(LearningState {
            attempts: 4,
            correct_attempts: 1,
            hints_used: 1,
            frustration_signal: false,
        });
        assert_eq!(decision.scaffolding, ScaffoldingLevel::Intensive);
        assert_eq!(decision.next_action, "show_conceptual_example");
    }

    #[test]
    fn tutoring_requires_approved_policy_before_backend() {
        let mut runtime = AgentRuntime::new(AgentPolicy::default(), Backend);
        let response = runtime
            .handle_tutoring(
                &request(),
                "Approved",
                LearningState::default(),
                "Explain halves",
            )
            .unwrap();
        assert!(response.runtime.decision.is_actionable());
        assert_eq!(response.tutoring.scaffolding, ScaffoldingLevel::Intensive);
        assert_eq!(response.tutoring.next_action, "show_conceptual_example");
        assert!(!response.runtime.text.is_empty());
    }
}

/// Evaluates a structured MeTTa query and returns one of the Syncsenta verdict
/// atoms: `Approved`, `(Review <reason>)`, or `(Rejected <reason>)`.
///
/// Python, an embedded Hyperon runtime, or a remote policy service can all
/// implement this trait. The Rust planner remains the enforcement authority.
pub trait MettaEvaluator {
    fn evaluate(&mut self, query: &str) -> Result<String, MettaError>;
}

pub struct MettaAdapter<E> {
    planner: MainAgent,
    evaluator: E,
}

impl<E> MettaAdapter<E>
where
    E: MettaEvaluator,
{
    pub fn new(policy: AgentPolicy, evaluator: E) -> Self {
        Self {
            planner: MainAgent::new(policy),
            evaluator,
        }
    }

    pub fn evaluate(&mut self, request: &Request) -> Result<Decision, RuntimeError> {
        let query = self.planner.plan(request).metta_query;
        let verdict = self.evaluator.evaluate(&query)?;
        Ok(self.planner.plan_with_metta_result(request, &verdict)?)
    }
}

/// Compatibility evaluator used by parity tests and the Python fallback
/// bridge. It deliberately does not claim to execute MeTTa; it verifies that
/// the Rust adapter accepts the same verdict contract as the future Hyperon
/// implementation.
pub struct ContractVerdictEvaluator {
    verdict: String,
}

impl ContractVerdictEvaluator {
    pub fn new(verdict: impl Into<String>) -> Self {
        Self {
            verdict: verdict.into(),
        }
    }
}

impl MettaEvaluator for ContractVerdictEvaluator {
    fn evaluate(&mut self, _query: &str) -> Result<String, MettaError> {
        Ok(self.verdict.clone())
    }
}

#[cfg(test)]
mod metta_adapter_tests {
    use super::*;
    use crate::{AgeBand, Connectivity, ConsentState, MettaVerdict, Role, SafetySignals};

    fn request() -> Request {
        Request::new("Explain fractions")
            .with_request_id("metta-adapter-test")
            .with_role(Role::Student)
            .with_age_band(AgeBand::Primary)
            .with_connectivity(Connectivity::Online)
            .with_consent(ConsentState::Granted)
            .with_safety(SafetySignals::default())
    }

    #[test]
    fn adapter_accepts_contract_verdict_and_keeps_query_structured() {
        let mut adapter = MettaAdapter::new(
            AgentPolicy::default(),
            ContractVerdictEvaluator::new("Approved"),
        );
        let decision = adapter.evaluate(&request()).unwrap();
        assert!(decision.is_actionable());
        assert!(decision.metta_query.starts_with("!(syncsenta-policy"));
        assert!(!decision.metta_query.contains("Explain fractions"));
    }

    #[test]
    fn adapter_fails_closed_for_review_verdict() {
        let mut adapter = MettaAdapter::new(
            AgentPolicy::default(),
            ContractVerdictEvaluator::new("(Review consent)"),
        );
        let decision = adapter.evaluate(&request()).unwrap();
        assert!(!decision.is_actionable());
        assert!(matches!(decision.metta_verdict, MettaVerdict::Review(_)));
    }
}

use std::collections::HashMap;

/// Small bounded response cache for metered and offline operation.
///
/// The cache is deliberately scoped to the backend boundary. It does not
/// cache safety decisions or learner identifiers, and callers can create one
/// per subject/session policy as needed.
pub struct CachedBackend<B> {
    backend: B,
    entries: HashMap<String, String>,
    capacity: usize,
}

impl<B> CachedBackend<B> {
    pub fn new(backend: B, capacity: usize) -> Self {
        Self {
            backend,
            entries: HashMap::new(),
            capacity: capacity.max(1),
        }
    }

    pub fn cached_len(&self) -> usize {
        self.entries.len()
    }
}

impl<B> TextBackend for CachedBackend<B>
where
    B: TextBackend,
{
    fn generate(&mut self, prompt: &str) -> Result<String, BackendError> {
        if let Some(response) = self.entries.get(prompt) {
            return Ok(response.clone());
        }

        let response = self.backend.generate(prompt)?;
        if self.entries.len() >= self.capacity {
            if let Some(oldest_key) = self.entries.keys().next().cloned() {
                self.entries.remove(&oldest_key);
            }
        }
        self.entries.insert(prompt.to_string(), response.clone());
        Ok(response)
    }
}

#[derive(Default)]
pub struct OfflineTutorBackend;

impl TextBackend for OfflineTutorBackend {
    fn generate(&mut self, prompt: &str) -> Result<String, BackendError> {
        let lower = prompt.to_ascii_lowercase();
        let response = if lower.contains("fraction") || lower.contains("half") {
            "A fraction shows part of a whole. What equal parts can you draw?"
        } else {
            "Let us solve this step by step. What do you already notice?"
        };
        Ok(response.to_string())
    }
}

/// The route selected before any provider call. `Offline` is deterministic and
/// safe for disconnected or metered learners; `Cache` avoids unnecessary tail
/// latency; `Remote` is used only when connectivity and the latency budget allow.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TutorRoute {
    Cache,
    Offline,
    Remote,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LatencyBudget {
    pub max_remote_ms: u32,
}

impl Default for LatencyBudget {
    fn default() -> Self {
        Self {
            max_remote_ms: 1_500,
        }
    }
}

impl LatencyBudget {
    pub fn new(max_remote_ms: u32) -> Self {
        Self { max_remote_ms }
    }
}

/// Selects a low-latency tutoring route without making a network request.
/// Unknown connectivity fails closed to the offline route. A cache hit always
/// wins when remote inference would exceed the caller's budget.
pub fn select_tutor_route(
    connectivity: crate::Connectivity,
    cache_available: bool,
    estimated_remote_ms: Option<u32>,
    budget: LatencyBudget,
) -> TutorRoute {
    match connectivity {
        crate::Connectivity::Offline | crate::Connectivity::Unknown => TutorRoute::Offline,
        crate::Connectivity::Metered => {
            if cache_available {
                TutorRoute::Cache
            } else {
                TutorRoute::Offline
            }
        }
        crate::Connectivity::Online => {
            if cache_available && estimated_remote_ms.unwrap_or(u32::MAX) > budget.max_remote_ms {
                TutorRoute::Cache
            } else {
                TutorRoute::Remote
            }
        }
    }
}

#[cfg(test)]
mod routing_tests {
    use super::*;
    use crate::Connectivity;

    #[test]
    fn offline_and_unknown_connectivity_never_route_to_remote() {
        let budget = LatencyBudget::default();
        assert_eq!(
            select_tutor_route(Connectivity::Offline, true, Some(1), budget),
            TutorRoute::Offline
        );
        assert_eq!(
            select_tutor_route(Connectivity::Unknown, false, Some(1), budget),
            TutorRoute::Offline
        );
    }

    #[test]
    fn metered_connectivity_uses_cache_or_offline_fallback() {
        let budget = LatencyBudget::default();
        assert_eq!(
            select_tutor_route(Connectivity::Metered, true, Some(1), budget),
            TutorRoute::Cache
        );
        assert_eq!(
            select_tutor_route(Connectivity::Metered, false, Some(1), budget),
            TutorRoute::Offline
        );
    }

    #[test]
    fn online_route_respects_tail_latency_budget() {
        let budget = LatencyBudget::new(800);
        assert_eq!(
            select_tutor_route(Connectivity::Online, true, Some(1_200), budget),
            TutorRoute::Cache
        );
        assert_eq!(
            select_tutor_route(Connectivity::Online, true, Some(700), budget),
            TutorRoute::Remote
        );
        assert_eq!(
            select_tutor_route(Connectivity::Online, false, None, budget),
            TutorRoute::Remote
        );
    }
}

#[cfg(test)]
mod backend_tests {
    use super::*;

    struct CountingBackend {
        calls: usize,
    }

    impl TextBackend for CountingBackend {
        fn generate(&mut self, prompt: &str) -> Result<String, BackendError> {
            self.calls += 1;
            Ok(format!("{}:{}", self.calls, prompt))
        }
    }

    #[test]
    fn cache_prevents_duplicate_provider_calls() {
        let mut backend = CachedBackend::new(CountingBackend { calls: 0 }, 2);
        assert_eq!(backend.generate("fractions").unwrap(), "1:fractions");
        assert_eq!(backend.generate("fractions").unwrap(), "1:fractions");
        assert_eq!(backend.cached_len(), 1);
    }

    #[test]
    fn offline_backend_is_deterministic() {
        let mut backend = OfflineTutorBackend;
        let first = backend.generate("Explain fractions").unwrap();
        let second = backend.generate("Explain fractions").unwrap();
        assert_eq!(first, second);
        assert!(first.contains("fraction"));
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AssessmentQuestion {
    pub id: String,
    pub correct_answer: String,
    pub points: u16,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AssessmentAnswer {
    pub question_id: String,
    pub answer: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AssessmentScore {
    pub earned_points: u16,
    pub possible_points: u16,
    pub percentage: u8,
    pub performance_band: &'static str,
}

fn normalized_answer(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_ascii_lowercase()
}

/// Deterministic first-pass grading. Rich short-answer rubric evaluation can
/// be added behind TextBackend later, while objective questions remain local,
/// fast, and available offline.
pub fn grade_assessment(
    questions: &[AssessmentQuestion],
    answers: &[AssessmentAnswer],
) -> AssessmentScore {
    let possible_points = questions.iter().map(|question| question.points).sum();
    let earned_points = questions
        .iter()
        .filter_map(|question| {
            let answer = answers
                .iter()
                .find(|answer| answer.question_id == question.id)?;
            (normalized_answer(&answer.answer) == normalized_answer(&question.correct_answer))
                .then_some(question.points)
        })
        .sum();
    let percentage = if possible_points == 0 {
        0
    } else {
        ((earned_points as u32 * 100) / possible_points as u32) as u8
    };
    let performance_band = match percentage {
        80..=100 => "exceeding",
        65..=79 => "meeting",
        50..=64 => "approaching",
        _ => "below",
    };
    AssessmentScore {
        earned_points,
        possible_points,
        percentage,
        performance_band,
    }
}

#[cfg(test)]
mod assessment_tests {
    use super::*;

    #[test]
    fn objective_grading_is_local_and_deterministic() {
        let questions = vec![
            AssessmentQuestion {
                id: "q1".into(),
                correct_answer: "Nairobi".into(),
                points: 1,
            },
            AssessmentQuestion {
                id: "q2".into(),
                correct_answer: "1/2".into(),
                points: 2,
            },
        ];
        let answers = vec![
            AssessmentAnswer {
                question_id: "q1".into(),
                answer: " nairobi ".into(),
            },
            AssessmentAnswer {
                question_id: "q2".into(),
                answer: "1/4".into(),
            },
        ];
        assert_eq!(
            grade_assessment(&questions, &answers),
            AssessmentScore {
                earned_points: 1,
                possible_points: 3,
                percentage: 33,
                performance_band: "below",
            }
        );
    }

    #[test]
    fn empty_assessment_fails_safe_without_division() {
        let score = grade_assessment(&[], &[]);
        assert_eq!(score.percentage, 0);
        assert_eq!(score.performance_band, "below");
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WorkflowCapability {
    Learn,
    SubmitAssessment,
    GradeAssessment,
    ReviewLearnerProgress,
    ManageConsent,
    ManageSchool,
}

/// Role authorization belongs in the Rust boundary so UI routing cannot grant
/// a capability that the backend policy did not authorize.
pub fn role_allows(role: crate::Role, capability: WorkflowCapability) -> bool {
    use crate::Role;
    match (role, capability) {
        (Role::Student, WorkflowCapability::Learn | WorkflowCapability::SubmitAssessment) => true,
        (
            Role::Teacher,
            WorkflowCapability::Learn
            | WorkflowCapability::SubmitAssessment
            | WorkflowCapability::GradeAssessment
            | WorkflowCapability::ReviewLearnerProgress,
        ) => true,
        (
            Role::Guardian,
            WorkflowCapability::ReviewLearnerProgress | WorkflowCapability::ManageConsent,
        ) => true,
        (
            Role::Administrator,
            WorkflowCapability::ManageSchool
            | WorkflowCapability::ReviewLearnerProgress
            | WorkflowCapability::ManageConsent,
        ) => true,
        _ => false,
    }
}

#[cfg(test)]
mod role_tests {
    use super::*;
    use crate::Role;

    #[test]
    fn role_workflow_matrix_is_fail_closed() {
        assert!(role_allows(Role::Student, WorkflowCapability::Learn));
        assert!(role_allows(
            Role::Teacher,
            WorkflowCapability::GradeAssessment
        ));
        assert!(role_allows(
            Role::Guardian,
            WorkflowCapability::ManageConsent
        ));
        assert!(role_allows(
            Role::Administrator,
            WorkflowCapability::ManageSchool
        ));
        assert!(!role_allows(
            Role::Student,
            WorkflowCapability::ManageSchool
        ));
        assert!(!role_allows(Role::Unknown, WorkflowCapability::Learn));
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MediaKind {
    Text,
    Voice,
    Image,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TransportPlan {
    pub accepted: bool,
    pub max_bytes: usize,
    pub compression_required: bool,
    pub fallback_to_text: bool,
}

/// Selects a predictable transport policy before any media is uploaded.
/// Budgets are intentionally conservative for metered/offline networks and
/// keep the mobile client from attempting an unbounded request.
pub fn plan_transport(
    connectivity: crate::Connectivity,
    media: MediaKind,
    payload_bytes: usize,
) -> TransportPlan {
    use crate::Connectivity;
    let max_bytes = match (connectivity, media) {
        (Connectivity::Online, MediaKind::Text) => 16 * 1024,
        (Connectivity::Online, MediaKind::Voice) => 4 * 1024 * 1024,
        (Connectivity::Online, MediaKind::Image) => 6 * 1024 * 1024,
        (Connectivity::Metered, MediaKind::Text) => 8 * 1024,
        (Connectivity::Metered, MediaKind::Voice) => 512 * 1024,
        (Connectivity::Metered, MediaKind::Image) => 256 * 1024,
        (Connectivity::Offline, MediaKind::Text) => 16 * 1024,
        (Connectivity::Offline, MediaKind::Voice | MediaKind::Image) => 0,
        (Connectivity::Unknown, MediaKind::Text) => 8 * 1024,
        (Connectivity::Unknown, MediaKind::Voice | MediaKind::Image) => 0,
    };
    let accepted = max_bytes > 0 && payload_bytes <= max_bytes;
    TransportPlan {
        accepted,
        max_bytes,
        compression_required: matches!(connectivity, Connectivity::Metered | Connectivity::Unknown),
        fallback_to_text: !accepted && !matches!(media, MediaKind::Text),
    }
}

#[cfg(test)]
mod transport_tests {
    use super::*;
    use crate::Connectivity;

    #[test]
    fn offline_multimodal_input_falls_back_without_upload() {
        let plan = plan_transport(Connectivity::Offline, MediaKind::Voice, 12_000);
        assert!(!plan.accepted);
        assert_eq!(plan.max_bytes, 0);
        assert!(plan.fallback_to_text);
    }

    #[test]
    fn metered_image_is_bounded_and_compressed() {
        let plan = plan_transport(Connectivity::Metered, MediaKind::Image, 100_000);
        assert!(plan.accepted);
        assert_eq!(plan.max_bytes, 256 * 1024);
        assert!(plan.compression_required);
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ChatRequest {
    pub request_id: String,
    pub message: String,
    pub user_id: String,
    pub role: crate::Role,
    pub age_band: crate::AgeBand,
    pub grade: Option<String>,
    pub subject: Option<String>,
    pub language: String,
    pub connectivity: crate::Connectivity,
    pub consent: crate::ConsentState,
    pub vision_goal: crate::Vision2030Goal,
    pub accessibility: crate::AccessibilityNeeds,
    pub safety: crate::SafetySignals,
    pub intent: crate::Intent,
}

impl ChatRequest {
    pub fn policy_request(&self) -> Request {
        Request {
            request_id: self.request_id.clone(),
            message: self.message.clone(),
            role: self.role,
            age_band: self.age_band,
            grade: self.grade.clone(),
            subject: self.subject.clone(),
            language: self.language.clone(),
            connectivity: self.connectivity,
            consent: self.consent,
            vision_goal: self.vision_goal,
            accessibility: self.accessibility,
            safety: self.safety,
            intent: self.intent,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ChatResponse {
    pub success: bool,
    pub response: String,
    pub session_id: String,
    pub primary_agent: String,
    pub agents_used: Vec<String>,
    pub fallback_used: bool,
    pub error: Option<String>,
}

impl<B> AgentRuntime<B>
where
    B: TextBackend,
{
    pub fn handle_chat(
        &mut self,
        request: &ChatRequest,
        metta_atom: &str,
        prompt: &str,
    ) -> Result<ChatResponse, RuntimeError> {
        let runtime = self.handle(&request.policy_request(), metta_atom, prompt)?;
        let decision = &runtime.decision;
        let fallback_used =
            !decision.is_actionable() || decision.mode == crate::RoutingMode::OfflineFallback;
        Ok(ChatResponse {
            success: decision.is_actionable(),
            response: runtime.text,
            session_id: request.request_id.clone(),
            primary_agent: decision
                .experts
                .first()
                .map(|expert| expert.expert.as_str().to_string())
                .unwrap_or_else(|| "human-review".to_string()),
            agents_used: decision
                .experts
                .iter()
                .map(|expert| expert.expert.as_str().to_string())
                .collect(),
            fallback_used,
            error: (!decision.is_actionable()).then(|| decision.public_summary.clone()),
        })
    }
}

#[cfg(test)]
mod chat_tests {
    use super::*;
    use crate::{AgeBand, Connectivity, ConsentState, Intent, Role, SafetySignals, Vision2030Goal};

    #[derive(Default)]
    struct Backend;

    impl TextBackend for Backend {
        fn generate(&mut self, prompt: &str) -> Result<String, BackendError> {
            Ok(format!("reply:{prompt}"))
        }
    }

    fn request() -> ChatRequest {
        ChatRequest {
            request_id: "chat-1".into(),
            message: "Explain fractions".into(),
            user_id: "student-1".into(),
            role: Role::Student,
            age_band: AgeBand::Primary,
            grade: Some("Grade 4".into()),
            subject: Some("Mathematics".into()),
            language: "en".into(),
            connectivity: Connectivity::Online,
            consent: ConsentState::Granted,
            vision_goal: Vision2030Goal::InclusiveLearning,
            accessibility: Default::default(),
            safety: SafetySignals::default(),
            intent: Intent::General,
        }
    }

    #[test]
    fn chat_response_matches_existing_frontend_shape() {
        let mut runtime = AgentRuntime::new(AgentPolicy::default(), Backend);
        let response = runtime
            .handle_chat(&request(), "Approved", "Explain fractions")
            .unwrap();
        assert!(response.success);
        assert_eq!(response.session_id, "chat-1");
        assert!(!response.primary_agent.is_empty());
        assert!(!response.agents_used.is_empty());
        assert!(!response.response.is_empty());
    }
}
