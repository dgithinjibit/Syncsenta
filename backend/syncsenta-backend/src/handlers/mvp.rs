//! MVP vertical-slice handlers (Requirement 1, 2, 5, 7, 10).
//!
//! In-memory student roster + chat history + tokio broadcast for WS fan-out.
//! No auth, no DB writes — keeps the slice runnable end-to-end before we wire
//! the full PostgreSQL/Redis path. Two seeded students per the spec
//! (one Turkana, one Nairobi) so the teacher dashboard has something to show.
//!
//! Endpoints (mounted at /api/v1/mvp):
//!   POST /messages                    — student sends; routes through AI
//!                                       service then broadcasts both events
//!   GET  /students                    — teacher dashboard roster
//!   GET  /students/:id/messages       — chat history for one student
//!   POST /teachers/messages/:id       — teacher intervention to student
//!   GET  /ws                          — WebSocket subscribe to all events

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{
        ws::{Message as WsMessage, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use crate::config::AppConfig;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Sender {
    Student,
    Agent,
    Teacher,
}

#[derive(Clone, Debug, Serialize)]
pub struct ChatMessage {
    pub id: Uuid,
    pub student_id: String,
    pub sender: Sender,
    pub text: String,
    pub agent: Option<String>,
    pub agents_used: Vec<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Student {
    pub id: String,
    pub name: String,
    pub location: String, // "Turkana" | "Nairobi"
    pub grade: String,
    pub subject: String,
    pub status: String,    // "online" | "offline" | "active" | "idle"
    pub questions: u32,
    pub progress: u32,
    pub last_active: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum BroadcastEvent {
    StudentMessage { message: ChatMessage },
    AgentResponse { message: ChatMessage },
    TeacherMessage { message: ChatMessage },
    AgentActivity {
        student_id: String,
        agent: String,
        agents_used: Vec<String>,
        response_time_ms: u32,
    },
    StatusChange { student_id: String, status: String },
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct MvpState {
    pub students: Arc<RwLock<HashMap<String, Student>>>,
    pub history: Arc<RwLock<HashMap<String, Vec<ChatMessage>>>>,
    pub tx: broadcast::Sender<BroadcastEvent>,
    pub ai_service_url: String,
    pub http: reqwest::Client,
}

impl MvpState {
    pub fn new(ai_service_url: String) -> Self {
        let (tx, _rx) = broadcast::channel(256);
        let mut students = HashMap::new();
        students.insert(
            "stu_turkana_001".into(),
            Student {
                id: "stu_turkana_001".into(),
                name: "Akiru Lokol".into(),
                location: "Turkana".into(),
                grade: "Grade 5".into(),
                subject: "Mathematics".into(),
                status: "online".into(),
                questions: 0,
                progress: 42,
                last_active: Utc::now(),
            },
        );
        students.insert(
            "stu_nairobi_001".into(),
            Student {
                id: "stu_nairobi_001".into(),
                name: "Wanjiru Kamau".into(),
                location: "Nairobi".into(),
                grade: "Grade 6".into(),
                subject: "Science".into(),
                status: "online".into(),
                questions: 0,
                progress: 67,
                last_active: Utc::now(),
            },
        );

        Self {
            students: Arc::new(RwLock::new(students)),
            history: Arc::new(RwLock::new(HashMap::new())),
            tx,
            ai_service_url,
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .expect("reqwest client"),
        }
    }

    async fn append(&self, msg: ChatMessage) {
        let mut h = self.history.write().await;
        h.entry(msg.student_id.clone()).or_default().push(msg);
    }

    fn broadcast(&self, ev: BroadcastEvent) {
        // Errors only mean no subscribers — safe to ignore.
        let _ = self.tx.send(ev);
    }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn router(state: MvpState) -> Router {
    Router::new()
        .route("/messages", post(post_message))
        .route("/students", get(list_students))
        .route("/students/:id/messages", get(student_history))
        .route("/teachers/messages/:id", post(teacher_message))
        .route("/ws", get(ws_handler))
        .with_state(state)
}

pub fn build_state(cfg: &AppConfig) -> MvpState {
    let url = std::env::var("AI_AGENTS_URL").unwrap_or_else(|_| {
        // Fall back to localhost for dev. cfg unused for now but kept for
        // future plumbing (e.g. shared http client / API keys).
        let _ = cfg;
        "http://localhost:8001".into()
    });
    MvpState::new(url)
}

// ---------------------------------------------------------------------------
// REST handlers
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct StudentMessageBody {
    pub student_id: String,
    pub text: String,
    #[serde(default)]
    pub language: Option<String>,
}

async fn post_message(
    State(state): State<MvpState>,
    Json(body): Json<StudentMessageBody>,
) -> impl IntoResponse {
    // 1. Look up the student (also gives us grade/subject for the AI call).
    let student = {
        let students = state.students.read().await;
        match students.get(&body.student_id).cloned() {
            Some(s) => s,
            None => {
                return (
                    StatusCode::NOT_FOUND,
                    Json(json!({"error": "unknown student_id"})),
                )
                    .into_response()
            }
        }
    };

    // 2. Persist + broadcast the student message.
    let student_msg = ChatMessage {
        id: Uuid::new_v4(),
        student_id: student.id.clone(),
        sender: Sender::Student,
        text: body.text.clone(),
        agent: None,
        agents_used: vec![],
        timestamp: Utc::now(),
    };
    state.append(student_msg.clone()).await;
    state.broadcast(BroadcastEvent::StudentMessage {
        message: student_msg.clone(),
    });

    // 3. Bump the question counter and surface activity status.
    {
        let mut students = state.students.write().await;
        if let Some(s) = students.get_mut(&student.id) {
            s.questions = s.questions.saturating_add(1);
            s.status = "active".into();
            s.last_active = Utc::now();
        }
    }
    state.broadcast(BroadcastEvent::StatusChange {
        student_id: student.id.clone(),
        status: "active".into(),
    });

    // 4. Call the AI agents service. On failure, return a graceful fallback so
    //    the student isn't left hanging (Requirement 20.5).
    let ai_url = format!("{}/agents/chat", state.ai_service_url.trim_end_matches('/'));
    let payload = json!({
        "message": body.text,
        "user_id": student.id,
        "session_id": null,
        "grade": student.grade,
        "subject": student.subject,
        "language": body.language.unwrap_or_else(|| "english".into()),
        "role": "student",
    });

    let agent_response = match state.http.post(&ai_url).json(&payload).send().await {
        Ok(r) if r.status().is_success() => r.json::<AiServiceResponse>().await.ok(),
        _ => None,
    };

    let (reply_text, primary_agent, agents_used, response_time_ms, fallback) =
        if let Some(r) = agent_response {
            (
                r.response,
                r.primary_agent,
                r.agents_used,
                r.response_time_ms,
                r.fallback_used,
            )
        } else {
            (
                "I'm having trouble reaching my tutor brain right now — please \
                 try again in a moment."
                    .into(),
                "fallback".into(),
                vec!["fallback".into()],
                0,
                true,
            )
        };

    // 5. Persist + broadcast the agent reply and an agent-activity event so
    //    the teacher dashboard can render the orchestration flow.
    let agent_msg = ChatMessage {
        id: Uuid::new_v4(),
        student_id: student.id.clone(),
        sender: Sender::Agent,
        text: reply_text.clone(),
        agent: Some(primary_agent.clone()),
        agents_used: agents_used.clone(),
        timestamp: Utc::now(),
    };
    state.append(agent_msg.clone()).await;
    state.broadcast(BroadcastEvent::AgentResponse {
        message: agent_msg.clone(),
    });
    state.broadcast(BroadcastEvent::AgentActivity {
        student_id: student.id.clone(),
        agent: primary_agent.clone(),
        agents_used: agents_used.clone(),
        response_time_ms,
    });

    Json(json!({
        "student_message": student_msg,
        "agent_message": agent_msg,
        "primary_agent": primary_agent,
        "agents_used": agents_used,
        "fallback_used": fallback,
    }))
    .into_response()
}

#[derive(Deserialize)]
struct AiServiceResponse {
    response: String,
    primary_agent: String,
    agents_used: Vec<String>,
    response_time_ms: u32,
    #[serde(default)]
    fallback_used: bool,
    #[allow(dead_code)]
    #[serde(default)]
    error: Option<String>,
    #[allow(dead_code)]
    #[serde(default)]
    success: bool,
}

async fn list_students(State(state): State<MvpState>) -> impl IntoResponse {
    let students = state.students.read().await;
    let mut list: Vec<Student> = students.values().cloned().collect();
    list.sort_by(|a, b| a.id.cmp(&b.id));
    Json(json!({ "students": list }))
}

async fn student_history(
    State(state): State<MvpState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let history = state.history.read().await;
    let messages = history.get(&id).cloned().unwrap_or_default();
    Json(json!({ "student_id": id, "messages": messages }))
}

#[derive(Deserialize)]
pub struct TeacherMessageBody {
    pub text: String,
}

async fn teacher_message(
    State(state): State<MvpState>,
    Path(student_id): Path<String>,
    Json(body): Json<TeacherMessageBody>,
) -> impl IntoResponse {
    {
        let students = state.students.read().await;
        if !students.contains_key(&student_id) {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "unknown student_id"})),
            )
                .into_response();
        }
    }

    let msg = ChatMessage {
        id: Uuid::new_v4(),
        student_id: student_id.clone(),
        sender: Sender::Teacher,
        text: body.text,
        agent: None,
        agents_used: vec![],
        timestamp: Utc::now(),
    };
    state.append(msg.clone()).await;
    state.broadcast(BroadcastEvent::TeacherMessage {
        message: msg.clone(),
    });
    Json(json!({ "message": msg })).into_response()
}

// ---------------------------------------------------------------------------
// WebSocket — fan out broadcast events to every connected client.
// ---------------------------------------------------------------------------

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<MvpState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| ws_loop(socket, state))
}

async fn ws_loop(mut socket: WebSocket, state: MvpState) {
    let mut rx = state.tx.subscribe();

    // Send a hello so the client knows it's live.
    let _ = socket
        .send(WsMessage::Text(
            json!({"type": "hello", "ts": Utc::now()}).to_string(),
        ))
        .await;

    loop {
        tokio::select! {
            ev = rx.recv() => {
                match ev {
                    Ok(event) => {
                        let payload = match serde_json::to_string(&event) {
                            Ok(s) => s,
                            Err(_) => continue,
                        };
                        if socket.send(WsMessage::Text(payload)).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => {
                        // Skipped events; tell the client to refetch state.
                        let _ = socket
                            .send(WsMessage::Text(
                                json!({"type": "lagged"}).to_string(),
                            ))
                            .await;
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            incoming = socket.recv() => {
                match incoming {
                    Some(Ok(WsMessage::Ping(p))) => {
                        let _ = socket.send(WsMessage::Pong(p)).await;
                    }
                    Some(Ok(WsMessage::Close(_))) | None => break,
                    Some(Err(_)) => break,
                    _ => {}
                }
            }
        }
    }
}
