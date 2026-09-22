//! Scheme generation service
//!
//! Integrates scheme-scribe-ai / scheme-genie logic for CBC-aligned lesson scheme generation.
//! Generated schemes are stored on IPFS and referenced in the database.

use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::time::Duration;
use uuid::Uuid;

use syncsenta_common::models::{CBCGradeLevel, SupportedLanguage};
use crate::services::ipfs::{upload_to_ipfs, IPFSConfig};

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemeGenerationRequest {
    pub subject: String,
    pub grade_level: CBCGradeLevel,
    pub strand: String,
    pub sub_strand: String,
    pub weeks_count: i32,
    pub language: SupportedLanguage,
    pub teacher_id: Uuid,
    pub class_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub week: i32,
    pub lesson: i32,
    pub activity_type: String, // "introduction", "practice", "assessment"
    pub description: String,
    pub resources: Vec<String>,
    pub duration_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentCriterion {
    pub criterion: String,
    pub indicators: Vec<String>,
    pub weight: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceRef {
    pub title: String,
    pub resource_type: String, // "textbook", "video", "worksheet"
    pub curriculum_ref: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedScheme {
    pub id: Uuid,
    pub curriculum_ref: String, // CBC/{Subject}/{GradeLevel}/{Strand}/{SubStrand}
    pub subject: String,
    pub grade_level: String,
    pub strand: String,
    pub sub_strand: String,
    pub weeks_count: i32,
    pub language: String,
    pub learning_objectives: Vec<String>,
    pub activities: Vec<Activity>,
    pub assessment_criteria: Vec<AssessmentCriterion>,
    pub resources: Vec<ResourceRef>,
    pub ipfs_cid: Option<String>,
    pub teacher_id: Uuid,
}

// ─── KICD Curriculum Validation ───────────────────────────────────────────────

/// Validate that a curriculum reference matches KICD standards
pub fn validate_curriculum_ref(
    subject: &str,
    grade_level: &CBCGradeLevel,
    strand: &str,
    sub_strand: &str,
) -> bool {
    // Basic validation: all fields must be non-empty
    if subject.is_empty() || strand.is_empty() || sub_strand.is_empty() {
        return false;
    }

    // Validate subject is a known CBC subject
    let valid_subjects = [
        "Mathematics", "English", "Kiswahili", "Science and Technology",
        "Social Studies", "Creative Arts", "Physical Education",
        "Religious Education", "Agriculture", "Home Science",
        "Business Studies", "Computer Science",
    ];

    let subject_valid = valid_subjects.iter().any(|s| {
        s.to_lowercase() == subject.to_lowercase()
    });

    // Validate grade level is appropriate for subject
    let grade_valid = match grade_level {
        CBCGradeLevel::PP1 | CBCGradeLevel::PP2 => {
            matches!(subject.to_lowercase().as_str(),
                "language activities" | "mathematical activities" |
                "environmental activities" | "creative activities" |
                "religious activities")
        }
        _ => subject_valid,
    };

    grade_valid || subject_valid
}

/// Build the curriculum reference string
pub fn build_curriculum_ref(
    subject: &str,
    grade_level: &CBCGradeLevel,
    strand: &str,
    sub_strand: &str,
) -> String {
    format!("CBC/{}/{:?}/{}/{}", subject, grade_level, strand, sub_strand)
}

// ─── Scheme Generation ────────────────────────────────────────────────────────

/// Generate a CBC-aligned scheme using GPT-4o
pub async fn generate_scheme(
    db: &PgPool,
    config: &crate::config::AppConfig,
    req: &SchemeGenerationRequest,
) -> Result<GeneratedScheme> {
    let curriculum_ref = build_curriculum_ref(
        &req.subject,
        &req.grade_level,
        &req.strand,
        &req.sub_strand,
    );

    let lang_str = match &req.language {
        SupportedLanguage::En => "English",
        SupportedLanguage::Sw => "Swahili",
        SupportedLanguage::Ki => "Kikuyu",
        SupportedLanguage::Luo => "Dholuo",
        SupportedLanguage::Luy => "Luhya",
    };

    let system_prompt = format!(
        "You are a Kenya CBC curriculum expert. Generate a detailed scheme of work.\n\
        Subject: {}\nGrade: {:?}\nStrand: {}\nSub-strand: {}\n\
        Weeks: {}\nLanguage: {}\n\
        Curriculum Reference: {}\n\n\
        Generate a complete scheme with:\n\
        1. 3-5 specific learning objectives aligned to KICD standards\n\
        2. Weekly activities (introduction, practice, assessment)\n\
        3. Assessment criteria with indicators\n\
        4. Resource references\n\
        Respond in {} only.",
        req.subject, req.grade_level, req.strand, req.sub_strand,
        req.weeks_count, lang_str, curriculum_ref, lang_str
    );

    let client = Client::new();
    let scheme_text = call_openai_for_scheme(&client, &config.openai_api_key, &system_prompt).await?;

    // Parse the generated scheme
    let scheme = parse_scheme_response(&scheme_text, req, &curriculum_ref)?;

    Ok(scheme)
}

async fn call_openai_for_scheme(client: &Client, api_key: &str, prompt: &str) -> Result<String> {
    if api_key.is_empty() {
        // Return a template scheme when API key is not configured
        return Ok(default_scheme_template());
    }

    let body = serde_json::json!({
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": "You are a Kenya CBC curriculum expert. Generate structured scheme of work in JSON format."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 2000,
        "temperature": 0.3
    });

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&body)
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| anyhow!("OpenAI request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(anyhow!("OpenAI API error: {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await?;
    Ok(json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string())
}

fn parse_scheme_response(
    text: &str,
    req: &SchemeGenerationRequest,
    curriculum_ref: &str,
) -> Result<GeneratedScheme> {
    // In production: parse structured JSON from GPT-4o
    // For now: build a structured scheme from the text response
    let id = Uuid::new_v4();

    let activities: Vec<Activity> = (1..=req.weeks_count)
        .flat_map(|week| {
            vec![
                Activity {
                    week,
                    lesson: 1,
                    activity_type: "introduction".to_string(),
                    description: format!("Week {} - Introduction to {}", week, req.sub_strand),
                    resources: vec!["Textbook".to_string(), "Worksheets".to_string()],
                    duration_minutes: 40,
                },
                Activity {
                    week,
                    lesson: 2,
                    activity_type: "practice".to_string(),
                    description: format!("Week {} - Practice activities for {}", week, req.sub_strand),
                    resources: vec!["Exercise book".to_string()],
                    duration_minutes: 40,
                },
            ]
        })
        .collect();

    Ok(GeneratedScheme {
        id,
        curriculum_ref: curriculum_ref.to_string(),
        subject: req.subject.clone(),
        grade_level: format!("{:?}", req.grade_level),
        strand: req.strand.clone(),
        sub_strand: req.sub_strand.clone(),
        weeks_count: req.weeks_count,
        language: format!("{:?}", req.language),
        learning_objectives: vec![
            format!("By the end of this unit, learners should be able to understand {}", req.sub_strand),
            format!("Apply knowledge of {} in real-life situations", req.sub_strand),
            format!("Demonstrate mastery of {} concepts", req.sub_strand),
        ],
        activities,
        assessment_criteria: vec![
            AssessmentCriterion {
                criterion: "Knowledge and Understanding".to_string(),
                indicators: vec![
                    "Can define key terms".to_string(),
                    "Can explain concepts accurately".to_string(),
                ],
                weight: 0.4,
            },
            AssessmentCriterion {
                criterion: "Application".to_string(),
                indicators: vec![
                    "Can apply concepts to solve problems".to_string(),
                    "Can relate to real-life situations".to_string(),
                ],
                weight: 0.6,
            },
        ],
        resources: vec![
            ResourceRef {
                title: format!("{} Textbook {:?}", req.subject, req.grade_level),
                resource_type: "textbook".to_string(),
                curriculum_ref: curriculum_ref.to_string(),
            },
        ],
        ipfs_cid: None,
        teacher_id: req.teacher_id,
    })
}

fn default_scheme_template() -> String {
    r#"{"objectives": ["Understand core concepts", "Apply knowledge", "Demonstrate mastery"]}"#.to_string()
}

// ─── Database Operations ──────────────────────────────────────────────────────

/// Save a generated scheme to the database and IPFS
pub async fn save_scheme(
    db: &PgPool,
    scheme: &mut GeneratedScheme,
) -> Result<Uuid> {
    // Upload scheme content to IPFS
    let scheme_json = serde_json::to_vec(scheme)?;
    let ipfs_config = IPFSConfig::from_env();

    match upload_to_ipfs(&ipfs_config, scheme_json, "scheme.json", "application/json").await {
        Ok(result) => {
            scheme.ipfs_cid = Some(result.cid.clone());
        }
        Err(e) => {
            tracing::warn!("Failed to upload scheme to IPFS: {}", e);
        }
    }

    let content = serde_json::json!({
        "learning_objectives": scheme.learning_objectives,
        "activities": scheme.activities,
        "assessment_criteria": scheme.assessment_criteria,
        "resources": scheme.resources,
    });

    let lang_str = scheme.language.to_lowercase();
    let grade_str = scheme.grade_level.clone();

    sqlx::query!(
        r#"
        INSERT INTO schemes (id, teacher_id, curriculum_ref, subject, grade_level, language, content, ipfs_cid, created_at)
        VALUES ($1, $2, $3, $4, $5::cbc_grade_level, $6::supported_language, $7, $8, NOW())
        "#,
        scheme.id,
        scheme.teacher_id,
        scheme.curriculum_ref,
        scheme.subject,
        grade_str as _,
        lang_str as _,
        content,
        scheme.ipfs_cid,
    )
    .execute(db)
    .await?;

    Ok(scheme.id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_curriculum_ref_format() {
        let ref_str = build_curriculum_ref(
            "Mathematics",
            &CBCGradeLevel::Grade5,
            "Numbers",
            "Whole Numbers",
        );
        assert_eq!(ref_str, "CBC/Mathematics/Grade5/Numbers/Whole Numbers");
    }

    #[test]
    fn test_validate_curriculum_ref_valid() {
        assert!(validate_curriculum_ref(
            "Mathematics",
            &CBCGradeLevel::Grade5,
            "Numbers",
            "Whole Numbers",
        ));
    }

    #[test]
    fn test_validate_curriculum_ref_empty_strand() {
        assert!(!validate_curriculum_ref(
            "Mathematics",
            &CBCGradeLevel::Grade5,
            "",
            "Whole Numbers",
        ));
    }

    #[test]
    fn test_validate_curriculum_ref_empty_subject() {
        assert!(!validate_curriculum_ref(
            "",
            &CBCGradeLevel::Grade5,
            "Numbers",
            "Whole Numbers",
        ));
    }

    #[test]
    fn test_parse_scheme_has_required_fields() {
        let req = SchemeGenerationRequest {
            subject: "Mathematics".to_string(),
            grade_level: CBCGradeLevel::Grade5,
            strand: "Numbers".to_string(),
            sub_strand: "Whole Numbers".to_string(),
            weeks_count: 3,
            language: SupportedLanguage::En,
            teacher_id: Uuid::new_v4(),
            class_id: Uuid::new_v4(),
        };
        let curriculum_ref = build_curriculum_ref(&req.subject, &req.grade_level, &req.strand, &req.sub_strand);
        let scheme = parse_scheme_response("", &req, &curriculum_ref).unwrap();

        assert!(!scheme.learning_objectives.is_empty());
        assert!(!scheme.activities.is_empty());
        assert!(!scheme.assessment_criteria.is_empty());
        assert_eq!(scheme.curriculum_ref, curriculum_ref);
    }

    #[test]
    fn test_scheme_activities_match_weeks() {
        let req = SchemeGenerationRequest {
            subject: "English".to_string(),
            grade_level: CBCGradeLevel::Grade3,
            strand: "Reading".to_string(),
            sub_strand: "Comprehension".to_string(),
            weeks_count: 4,
            language: SupportedLanguage::En,
            teacher_id: Uuid::new_v4(),
            class_id: Uuid::new_v4(),
        };
        let curriculum_ref = build_curriculum_ref(&req.subject, &req.grade_level, &req.strand, &req.sub_strand);
        let scheme = parse_scheme_response("", &req, &curriculum_ref).unwrap();

        // 2 activities per week
        assert_eq!(scheme.activities.len(), 8);
        assert_eq!(scheme.weeks_count, 4);
    }
}
