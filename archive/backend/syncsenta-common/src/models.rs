use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─── User & RBAC ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "user_role", rename_all = "snake_case")]
pub enum UserRole {
    Student,
    Parent,
    Teacher,
    SchoolAdmin,
    SchoolHead,
    CountyOfficer,
    NationalAdmin,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "approval_status", rename_all = "snake_case")]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "supported_language", rename_all = "snake_case")]
pub enum SupportedLanguage {
    En,   // English
    Sw,   // Swahili
    Ki,   // Kikuyu
    Luo,  // Dholuo
    Luy,  // Luhya
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub did: Option<String>,  // W3C Decentralized Identifier
    pub email: String,
    pub phone: Option<String>,
    pub role: UserRole,
    pub approval_status: ApprovalStatus,
    pub approved_by: Option<Uuid>,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub language_preference: SupportedLanguage,
    pub wallet_address: Option<String>,  // For token economy
    pub mfa_enabled: bool,
    pub created_at: DateTime<Utc>,
}

/// Returns the role that must approve a given role's registration
pub fn get_approver_role(role: &UserRole) -> UserRole {
    match role {
        UserRole::Student => UserRole::Teacher,
        UserRole::Parent => UserRole::Teacher,
        UserRole::Teacher => UserRole::SchoolHead,
        UserRole::SchoolAdmin => UserRole::SchoolHead,
        UserRole::SchoolHead => UserRole::CountyOfficer,
        UserRole::CountyOfficer => UserRole::NationalAdmin,
        UserRole::NationalAdmin => UserRole::NationalAdmin,
    }
}

// ─── CBC Curriculum ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "cbc_grade_level", rename_all = "PascalCase")]
pub enum CBCGradeLevel {
    PP1, PP2,
    Grade1, Grade2, Grade3, Grade4, Grade5, Grade6,
    JSS1, JSS2, JSS3,
    SSS1, SSS2, SSS3,
}

// ─── Sync ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncAction {
    CompleteActivity,
    SubmitAssessment,
    SaveProgress,
    SendMessage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    Pending,
    Synced,
    Conflict,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncQueueEntry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub action: SyncAction,
    pub payload: serde_json::Value,
    pub created_offline_at: DateTime<Utc>,
    pub synced_at: Option<DateTime<Utc>>,
    pub status: SyncStatus,
}

// ─── Payment ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    Pending,
    Confirmed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentMethod {
    Mpesa,
    BankTransfer,
}
