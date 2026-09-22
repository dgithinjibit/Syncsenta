//! Assessment service — Task 11
//!
//! - 11.1 Assessment creation with KICD curriculum validation
//! - 11.2 Auto-grading for objective questions; subjective queued to teacher
//! - 11.3 Teacher grading queue
//!
//! Question shape (stored as JSONB on `assessments.questions`):
//!   [{"id":"q1","kind":"multiple_choice","prompt":"...","options":["A","B","C","D"],
//!     "correct":"B","points":10},
//!    {"id":"q2","kind":"true_false","prompt":"...","correct":true,"points":5},
//!    {"id":"q3","kind":"short_answer","prompt":"...","rubric":"...","points":15}]
//!
//! Submission `answers` shape:
//!   {"q1":"B","q2":false,"q3":"text answer"}

use anyhow::{anyhow, Result};
use chrono::{DateTime, Duration, Utc};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use syncsenta_common::models::CBCGradeLevel;

use crate::config::AppConfig;
// COMMENTED OUT: Scheme service for student-focused build
// use crate::services::scheme::{build_curriculum_ref, validate_curriculum_ref};

// STUDENT-FOCUSED BUILD: Simple implementations for curriculum functions
fn build_curriculum_ref(subject: &str, grade_level: &CBCGradeLevel, strand: &str, sub_strand: &str) -> String {
    format!("{}-{:?}-{}-{}", subject, grade_level, strand, sub_strand)
}

fn validate_curriculum_ref(_subject: &str, _grade_level: &CBCGradeLevel, _strand: &str, _sub_strand: &str) -> bool {
    // For student-focused build, always return true
    // TODO: Implement proper validation when scheme service is enabled
    true
}

// ─── Question / Answer model ──────────────────────────────────────────────────

/// A single question. Tagged on `kind` so submissions can route to the right grader.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Question {
    MultipleChoice {
        id: String,
        prompt: String,
        options: Vec<String>,
        /// The option string that is correct (must match an entry in `options`).
        correct: String,
        points: i32,
    },
    TrueFalse {
        id: String,
        prompt: String,
        correct: bool,
        points: i32,
    },
    /// Subjective. Teacher must grade.
    ShortAnswer {
        id: String,
        prompt: String,
        rubric: Option<String>,
        points: i32,
    },
    /// Subjective. Teacher must grade.
    Essay {
        id: String,
        prompt: String,
        rubric: Option<String>,
        points: i32,
    },
}

impl Question {
    pub fn id(&self) -> &str {
        match self {
            Question::MultipleChoice { id, .. }
            | Question::TrueFalse { id, .. }
            | Question::ShortAnswer { id, .. }
            | Question::Essay { id, .. } => id,
        }
    }

    pub fn points(&self) -> i32 {
        match self {
            Question::MultipleChoice { points, .. }
            | Question::TrueFalse { points, .. }
            | Question::ShortAnswer { points, .. }
            | Question::Essay { points, .. } => *points,
        }
    }

    /// True if this question can be auto-graded (objective).
    pub fn is_objective(&self) -> bool {
        matches!(
            self,
            Question::MultipleChoice { .. } | Question::TrueFalse { .. }
        )
    }
}

// ─── Service errors ───────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum AssessmentError {
    #[error("invalid curriculum reference: {0}")]
    InvalidCurriculum(String),
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("time limit exceeded for this submission")]
    TimeLimitExceeded,
    #[error("assessment not found")]
    NotFound,
    #[error("already submitted")]
    AlreadySubmitted,
    #[error(transparent)]
    Db(#[from] sqlx::Error),
    #[error(transparent)]
    Redis(#[from] redis::RedisError),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

pub type AssessmentResult<T> = std::result::Result<T, AssessmentError>;

// ─── Validation ───────────────────────────────────────────────────────────────

/// Validate every question shape and IDs are unique. Caller should also call
/// `validate_curriculum_ref` for the assessment's strand/sub-strand.
pub fn validate_questions(questions: &[Question]) -> AssessmentResult<()> {
    if questions.is_empty() {
        return Err(AssessmentError::Validation(
            "assessment must have at least one question".into(),
        ));
    }

    let mut seen = std::collections::HashSet::new();
    for q in questions {
        if !seen.insert(q.id()) {
            return Err(AssessmentError::Validation(format!(
                "duplicate question id: {}",
                q.id()
            )));
        }
        if q.points() <= 0 {
            return Err(AssessmentError::Validation(format!(
                "question {} has non-positive points",
                q.id()
            )));
        }
        if let Question::MultipleChoice { options, correct, id, .. } = q {
            if options.len() < 2 {
                return Err(AssessmentError::Validation(format!(
                    "MCQ {id} needs at least 2 options"
                )));
            }
            if !options.contains(correct) {
                return Err(AssessmentError::Validation(format!(
                    "MCQ {id}: correct answer not in options"
                )));
            }
        }
    }
    Ok(())
}

// ─── Create assessment ────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateAssessmentRequest {
    pub teacher_id: Uuid,
    pub class_id: Uuid,
    pub title: String,
    pub subject: String,
    pub grade_level: CBCGradeLevel,
    pub strand: String,
    pub sub_strand: String,
    pub questions: Vec<Question>,
    pub time_limit_minutes: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct AssessmentRecord {
    pub id: Uuid,
    pub teacher_id: Uuid,
    pub class_id: Uuid,
    pub title: String,
    pub curriculum_ref: String,
    pub time_limit_minutes: Option<i32>,
    pub total_points: i32,
}

pub async fn create_assessment(
    db: &PgPool,
    req: CreateAssessmentRequest,
) -> AssessmentResult<AssessmentRecord> {
    if !validate_curriculum_ref(&req.subject, &req.grade_level, &req.strand, &req.sub_strand) {
        return Err(AssessmentError::InvalidCurriculum(format!(
            "subject={} strand={} sub_strand={}",
            req.subject, req.strand, req.sub_strand
        )));
    }

    validate_questions(&req.questions)?;

    let curriculum_ref =
        build_curriculum_ref(&req.subject, &req.grade_level, &req.strand, &req.sub_strand);
    let total_points: i32 = req.questions.iter().map(|q| q.points()).sum();
    let questions_json = serde_json::to_value(&req.questions)?;
    let id = Uuid::new_v4();

    sqlx::query!(
        r#"
        INSERT INTO assessments (
            id, teacher_id, class_id, title, curriculum_ref,
            questions, time_limit_minutes, total_points,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        "#,
        id,
        req.teacher_id,
        req.class_id,
        req.title,
        curriculum_ref,
        questions_json,
        req.time_limit_minutes,
        total_points,
    )
    .execute(db)
    .await?;

    Ok(AssessmentRecord {
        id,
        teacher_id: req.teacher_id,
        class_id: req.class_id,
        title: req.title,
        curriculum_ref,
        time_limit_minutes: req.time_limit_minutes,
        total_points,
    })
}

// ─── Auto-grading ─────────────────────────────────────────────────────────────

/// Result of auto-grading: `auto_score` is the points awarded for objective
/// questions; `pending_question_ids` lists subjective questions still awaiting
/// teacher review. Total score is finalised once teacher grades the rest.
#[derive(Debug, Clone, Serialize)]
pub struct AutoGradeOutcome {
    pub auto_score: f64,
    pub auto_max: i32,
    pub pending_question_ids: Vec<String>,
    pub fully_graded: bool,
}

/// Grade objective questions in `answers` against `questions`. Pure function —
/// no I/O. Subjective questions are reported in `pending_question_ids`.
pub fn auto_grade(questions: &[Question], answers: &serde_json::Value) -> AutoGradeOutcome {
    let mut auto_score: f64 = 0.0;
    let mut auto_max: i32 = 0;
    let mut pending: Vec<String> = Vec::new();

    for q in questions {
        match q {
            Question::MultipleChoice { id, correct, points, .. } => {
                auto_max += *points;
                if let Some(ans) = answers.get(id).and_then(|v| v.as_str()) {
                    if ans == correct {
                        auto_score += *points as f64;
                    }
                }
            }
            Question::TrueFalse { id, correct, points, .. } => {
                auto_max += *points;
                if let Some(ans) = answers.get(id).and_then(|v| v.as_bool()) {
                    if ans == *correct {
                        auto_score += *points as f64;
                    }
                }
            }
            Question::ShortAnswer { id, .. } | Question::Essay { id, .. } => {
                pending.push(id.clone());
            }
        }
    }

    AutoGradeOutcome {
        fully_graded: pending.is_empty(),
        auto_score,
        auto_max,
        pending_question_ids: pending,
    }
}

// ─── Submission lifecycle ─────────────────────────────────────────────────────

const STARTED_KEY_PREFIX: &str = "assessment:started";
const GRADING_QUEUE_PREFIX: &str = "grading:queue";

fn started_key(student_id: Uuid, assessment_id: Uuid) -> String {
    format!("{}:{}:{}", STARTED_KEY_PREFIX, student_id, assessment_id)
}

fn grading_queue_key(teacher_id: Uuid) -> String {
    format!("{}:{}", GRADING_QUEUE_PREFIX, teacher_id)
}

/// Mark that a student has started an assessment, recording the timestamp in
/// Redis so the server can enforce the time limit independently of any
/// client-supplied claim. TTL is the time-limit plus a 60-second buffer.
pub async fn mark_started(
    cfg: &AppConfig,
    student_id: Uuid,
    assessment_id: Uuid,
    time_limit_minutes: Option<i32>,
) -> AssessmentResult<DateTime<Utc>> {
    let now = Utc::now();
    let client = redis::Client::open(cfg.redis_url.clone()).map_err(AssessmentError::Redis)?;
    let mut conn = client.get_multiplexed_async_connection().await?;
    let ttl_secs = time_limit_minutes
        .map(|m| (m as i64 * 60) + 60)
        .unwrap_or(24 * 60 * 60);
    let _: () = conn
        .set_ex(
            started_key(student_id, assessment_id),
            now.timestamp(),
            ttl_secs as u64,
        )
        .await?;
    Ok(now)
}

async fn fetch_started_at(
    cfg: &AppConfig,
    student_id: Uuid,
    assessment_id: Uuid,
) -> AssessmentResult<Option<DateTime<Utc>>> {
    let client = redis::Client::open(cfg.redis_url.clone()).map_err(AssessmentError::Redis)?;
    let mut conn = client.get_multiplexed_async_connection().await?;
    let raw: Option<i64> = conn.get(started_key(student_id, assessment_id)).await?;
    Ok(raw.and_then(|ts| DateTime::<Utc>::from_timestamp(ts, 0)))
}

#[derive(Debug, Deserialize)]
pub struct SubmitAssessmentRequest {
    pub student_id: Uuid,
    pub answers: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct SubmissionRecord {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub student_id: Uuid,
    pub auto_score: f64,
    pub total_points: i32,
    pub fully_graded: bool,
    pub pending_question_ids: Vec<String>,
}

/// Server-side submit. Enforces:
/// - assessment exists
/// - one submission per student (UNIQUE on (assessment_id, student_id))
/// - if `time_limit_minutes` set, `started_at + limit >= now`
/// Auto-grades objective questions immediately. Subjective answers are queued
/// to the teacher's grading queue in Redis.
pub async fn submit_assessment(
    db: &PgPool,
    cfg: &AppConfig,
    assessment_id: Uuid,
    req: SubmitAssessmentRequest,
) -> AssessmentResult<SubmissionRecord> {
    let row = sqlx::query!(
        r#"
        SELECT teacher_id, questions, time_limit_minutes, total_points
        FROM assessments WHERE id = $1
        "#,
        assessment_id,
    )
    .fetch_optional(db)
    .await?
    .ok_or(AssessmentError::NotFound)?;

    // Time limit check (only if started_at is recorded — first-time submissions
    // without a start record are allowed but treated as zero elapsed).
    if let Some(limit) = row.time_limit_minutes {
        if let Some(started) = fetch_started_at(cfg, req.student_id, assessment_id).await? {
            let deadline = started + Duration::minutes(limit as i64);
            if Utc::now() > deadline {
                return Err(AssessmentError::TimeLimitExceeded);
            }
        }
    }

    let questions: Vec<Question> = serde_json::from_value(row.questions)?;
    let outcome = auto_grade(&questions, &req.answers);
    let submission_id = Uuid::new_v4();

    let score_param: Option<f64> = if outcome.fully_graded {
        Some(outcome.auto_score)
    } else {
        None
    };
    let graded_at_param: Option<DateTime<Utc>> = if outcome.fully_graded {
        Some(Utc::now())
    } else {
        None
    };
    let insert = sqlx::query!(
        r#"
        INSERT INTO assessment_submissions (
            id, assessment_id, student_id, answers, score,
            submitted_at, graded_at
        )
        VALUES ($1, $2, $3, $4, $5::float8::numeric, NOW(), $6)
        "#,
        submission_id,
        assessment_id,
        req.student_id,
        req.answers,
        score_param,
        graded_at_param,
    )
    .execute(db)
    .await;

    if let Err(sqlx::Error::Database(e)) = &insert {
        if e.constraint().is_some() {
            return Err(AssessmentError::AlreadySubmitted);
        }
    }
    insert?;

    if !outcome.fully_graded {
        enqueue_for_grading(cfg, row.teacher_id, submission_id).await?;
    }

    Ok(SubmissionRecord {
        id: submission_id,
        assessment_id,
        student_id: req.student_id,
        auto_score: outcome.auto_score,
        total_points: row.total_points,
        fully_graded: outcome.fully_graded,
        pending_question_ids: outcome.pending_question_ids,
    })
}

// ─── Grading queue ────────────────────────────────────────────────────────────

async fn enqueue_for_grading(
    cfg: &AppConfig,
    teacher_id: Uuid,
    submission_id: Uuid,
) -> AssessmentResult<()> {
    let client = redis::Client::open(cfg.redis_url.clone()).map_err(AssessmentError::Redis)?;
    let mut conn = client.get_multiplexed_async_connection().await?;
    let _: () = conn
        .lpush(grading_queue_key(teacher_id), submission_id.to_string())
        .await?;
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct GradingQueueItem {
    pub submission_id: Uuid,
    pub assessment_id: Uuid,
    pub assessment_title: String,
    pub student_id: Uuid,
    pub submitted_at: DateTime<Utc>,
    pub pending_question_ids: Vec<String>,
}

/// Return all submissions awaiting this teacher's grading. Pulls IDs from the
/// Redis queue, then hydrates from the DB. IDs that no longer reference live
/// rows (e.g. if a submission was deleted) are silently skipped.
pub async fn list_grading_queue(
    db: &PgPool,
    cfg: &AppConfig,
    teacher_id: Uuid,
) -> AssessmentResult<Vec<GradingQueueItem>> {
    let client = redis::Client::open(cfg.redis_url.clone()).map_err(AssessmentError::Redis)?;
    let mut conn = client.get_multiplexed_async_connection().await?;
    let raw: Vec<String> = conn.lrange(grading_queue_key(teacher_id), 0, -1).await?;
    let ids: Vec<Uuid> = raw.iter().filter_map(|s| Uuid::parse_str(s).ok()).collect();
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let rows = sqlx::query!(
        r#"
        SELECT s.id, s.assessment_id, s.student_id, s.submitted_at, s.answers,
               a.title, a.questions
        FROM assessment_submissions s
        JOIN assessments a ON a.id = s.assessment_id
        WHERE s.id = ANY($1) AND a.teacher_id = $2 AND s.score IS NULL
        ORDER BY s.submitted_at ASC
        "#,
        &ids,
        teacher_id,
    )
    .fetch_all(db)
    .await?;

    let mut items = Vec::with_capacity(rows.len());
    for r in rows {
        let questions: Vec<Question> = serde_json::from_value(r.questions).unwrap_or_default();
        let outcome = auto_grade(&questions, &r.answers);
        items.push(GradingQueueItem {
            submission_id: r.id,
            assessment_id: r.assessment_id,
            assessment_title: r.title,
            student_id: r.student_id,
            submitted_at: r.submitted_at,
            pending_question_ids: outcome.pending_question_ids,
        });
    }
    Ok(items)
}

#[derive(Debug, Deserialize)]
pub struct GradeSubmissionRequest {
    pub teacher_id: Uuid,
    /// Final score across all questions (the teacher determines subjective
    /// portion; objective portion is provided in `auto_score` for reference).
    pub score: f64,
    pub feedback: Option<String>,
}

/// Apply a teacher's grade to a submission. Verifies that the teacher owns
/// the parent assessment, then updates the submission and removes the entry
/// from the Redis grading queue.
pub async fn grade_submission(
    db: &PgPool,
    cfg: &AppConfig,
    submission_id: Uuid,
    req: GradeSubmissionRequest,
) -> AssessmentResult<()> {
    let owner = sqlx::query!(
        r#"
        SELECT a.teacher_id
        FROM assessment_submissions s
        JOIN assessments a ON a.id = s.assessment_id
        WHERE s.id = $1
        "#,
        submission_id,
    )
    .fetch_optional(db)
    .await?
    .ok_or(AssessmentError::NotFound)?;

    if owner.teacher_id != req.teacher_id {
        return Err(AssessmentError::Validation(
            "only the assessment's owning teacher may grade".into(),
        ));
    }

    sqlx::query!(
        r#"
        UPDATE assessment_submissions
        SET score = $1::float8::numeric,
            feedback = $2,
            graded_by = $3,
            graded_at = NOW()
        WHERE id = $4
        "#,
        req.score,
        req.feedback,
        req.teacher_id,
        submission_id,
    )
    .execute(db)
    .await?;

    // Best-effort dequeue — count is unbounded by Redis but the item appears
    // at most once per (teacher, submission) pair.
    let client = redis::Client::open(cfg.redis_url.clone()).map_err(AssessmentError::Redis)?;
    let mut conn = client.get_multiplexed_async_connection().await?;
    let _: i64 = conn
        .lrem(grading_queue_key(req.teacher_id), 0, submission_id.to_string())
        .await
        .unwrap_or(0);
    Ok(())
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample_questions() -> Vec<Question> {
        vec![
            Question::MultipleChoice {
                id: "q1".into(),
                prompt: "2+2?".into(),
                options: vec!["3".into(), "4".into(), "5".into()],
                correct: "4".into(),
                points: 10,
            },
            Question::TrueFalse {
                id: "q2".into(),
                prompt: "Earth orbits the Sun".into(),
                correct: true,
                points: 5,
            },
            Question::ShortAnswer {
                id: "q3".into(),
                prompt: "Explain photosynthesis".into(),
                rubric: None,
                points: 15,
            },
        ]
    }

    #[test]
    fn validate_rejects_empty_questions() {
        assert!(validate_questions(&[]).is_err());
    }

    #[test]
    fn validate_rejects_duplicate_ids() {
        let qs = vec![
            Question::TrueFalse {
                id: "q1".into(),
                prompt: "a".into(),
                correct: true,
                points: 1,
            },
            Question::TrueFalse {
                id: "q1".into(),
                prompt: "b".into(),
                correct: false,
                points: 1,
            },
        ];
        assert!(validate_questions(&qs).is_err());
    }

    #[test]
    fn validate_rejects_mcq_with_unlisted_correct() {
        let qs = vec![Question::MultipleChoice {
            id: "q1".into(),
            prompt: "?".into(),
            options: vec!["A".into(), "B".into()],
            correct: "C".into(),
            points: 1,
        }];
        assert!(validate_questions(&qs).is_err());
    }

    #[test]
    fn auto_grade_scores_objective_correctly() {
        let qs = sample_questions();
        let answers = json!({"q1": "4", "q2": true, "q3": "anything"});
        let outcome = auto_grade(&qs, &answers);
        assert_eq!(outcome.auto_score, 15.0);
        assert_eq!(outcome.auto_max, 15);
        assert_eq!(outcome.pending_question_ids, vec!["q3".to_string()]);
        assert!(!outcome.fully_graded);
    }

    #[test]
    fn auto_grade_partial_credit() {
        let qs = sample_questions();
        let answers = json!({"q1": "4", "q2": false}); // q2 wrong, q3 missing
        let outcome = auto_grade(&qs, &answers);
        assert_eq!(outcome.auto_score, 10.0);
        assert!(!outcome.fully_graded);
    }

    #[test]
    fn auto_grade_objective_only_is_fully_graded() {
        let qs = vec![
            Question::MultipleChoice {
                id: "q1".into(),
                prompt: "?".into(),
                options: vec!["A".into(), "B".into()],
                correct: "A".into(),
                points: 1,
            },
            Question::TrueFalse {
                id: "q2".into(),
                prompt: "?".into(),
                correct: false,
                points: 1,
            },
        ];
        let answers = json!({"q1": "A", "q2": false});
        let outcome = auto_grade(&qs, &answers);
        assert!(outcome.fully_graded);
        assert_eq!(outcome.auto_score, 2.0);
    }

    #[test]
    fn missing_answer_scores_zero_for_that_question() {
        let qs = sample_questions();
        let answers = json!({});
        let outcome = auto_grade(&qs, &answers);
        assert_eq!(outcome.auto_score, 0.0);
    }

    #[test]
    fn question_helpers_work() {
        let q = Question::MultipleChoice {
            id: "x".into(),
            prompt: "p".into(),
            options: vec!["A".into(), "B".into()],
            correct: "A".into(),
            points: 7,
        };
        assert_eq!(q.id(), "x");
        assert_eq!(q.points(), 7);
        assert!(q.is_objective());

        let s = Question::ShortAnswer {
            id: "y".into(),
            prompt: "?".into(),
            rubric: None,
            points: 3,
        };
        assert!(!s.is_objective());
    }

    #[test]
    fn ignores_garbage_answer_types() {
        let qs = vec![Question::MultipleChoice {
            id: "q1".into(),
            prompt: "?".into(),
            options: vec!["A".into(), "B".into()],
            correct: "A".into(),
            points: 5,
        }];
        // boolean answer for an MCQ — should award 0
        let answers = json!({"q1": true});
        let outcome = auto_grade(&qs, &answers);
        assert_eq!(outcome.auto_score, 0.0);
    }
}
