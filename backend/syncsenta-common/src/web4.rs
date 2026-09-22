//! Web4 types for DID, blockchain, and IPFS

use serde::{Deserialize, Serialize};
use sqlx::Type;

/// W3C DID Document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DIDDocument {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,  // DID
    pub verification_method: Vec<VerificationMethod>,
    pub authentication: Vec<String>,
    pub assertion_method: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationMethod {
    pub id: String,
    #[serde(rename = "type")]
    pub method_type: String,
    pub controller: String,
    pub public_key_multibase: Option<String>,
    pub public_key_jwk: Option<serde_json::Value>,
}

/// W3C Verifiable Credential
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiableCredential {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    #[serde(rename = "type")]
    pub credential_type: Vec<String>,
    pub issuer: String,  // DID of issuer
    pub issuance_date: chrono::DateTime<chrono::Utc>,
    pub credential_subject: CredentialSubject,
    pub proof: Proof,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialSubject {
    pub id: String,  // DID of subject
    pub role: String,
    pub school_id: Option<uuid::Uuid>,
    pub county_id: Option<uuid::Uuid>,
    pub approval_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proof {
    #[serde(rename = "type")]
    pub proof_type: String,
    pub created: chrono::DateTime<chrono::Utc>,
    pub verification_method: String,
    pub proof_purpose: String,
    pub proof_value: String,
}

/// Verifiable Presentation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiablePresentation {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    #[serde(rename = "type")]
    pub presentation_type: Vec<String>,
    pub verifiable_credential: Vec<VerifiableCredential>,
    pub proof: Proof,
}

/// Blockchain credential metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainCredentialMetadata {
    pub token_id: String,
    pub learner_address: String,
    pub skill_id: String,
    pub evidence_cid: String,  // IPFS CID
    pub issued_at: i64,
    pub revoked: bool,
}

/// IPFS content metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPFSContentMetadata {
    pub cid: String,
    pub filename: String,
    pub mime_type: String,
    pub size: i64,
    pub uploaded_at: chrono::DateTime<chrono::Utc>,
    pub uploaded_by: uuid::Uuid,
}
