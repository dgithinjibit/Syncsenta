//! Verifiable Credentials (VC) issuance and verification
//! 
//! Implements W3C Verifiable Credentials standard for role-based authentication

use anyhow::{anyhow, Result};
use base64::Engine;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use syncsenta_common::models::{ApprovalStatus, UserProfile, UserRole};

/// W3C Verifiable Credential
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiableCredential {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    #[serde(rename = "type")]
    pub credential_type: Vec<String>,
    pub issuer: String,  // DID of issuer
    pub issuance_date: DateTime<Utc>,
    pub credential_subject: CredentialSubject,
    pub proof: Proof,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialSubject {
    pub id: String,  // DID of subject
    pub role: UserRole,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub approval_status: ApprovalStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proof {
    #[serde(rename = "type")]
    pub proof_type: String,
    pub created: DateTime<Utc>,
    pub verification_method: String,
    pub proof_purpose: String,
    pub proof_value: String,
}

/// Verifiable Presentation (contains one or more VCs)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiablePresentation {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    #[serde(rename = "type")]
    pub presentation_type: Vec<String>,
    pub verifiable_credential: Vec<VerifiableCredential>,
    pub proof: Proof,
}

/// Issue a Verifiable Credential for a user
pub fn issue_credential(
    user: &UserProfile,
    issuer_did: &str,
) -> Result<VerifiableCredential> {
    let now = Utc::now();
    let credential_id = format!("urn:uuid:{}", Uuid::new_v4());
    
    let subject = CredentialSubject {
        id: user.did.clone().ok_or_else(|| anyhow!("User has no DID"))?,
        role: user.role.clone(),
        school_id: user.school_id,
        county_id: user.county_id,
        approval_status: user.approval_status.clone(),
    };

    // Generate proof (simplified - in production use proper cryptographic signing)
    let proof_value = generate_proof(&credential_id, &subject, issuer_did)?;

    Ok(VerifiableCredential {
        context: vec![
            "https://www.w3.org/2018/credentials/v1".to_string(),
            "https://syncsenta.education/credentials/v1".to_string(),
        ],
        id: credential_id,
        credential_type: vec![
            "VerifiableCredential".to_string(),
            "SyncSentaRoleCredential".to_string(),
        ],
        issuer: issuer_did.to_string(),
        issuance_date: now,
        credential_subject: subject,
        proof: Proof {
            proof_type: "Ed25519Signature2020".to_string(),
            created: now,
            verification_method: format!("{}#key-1", issuer_did),
            proof_purpose: "assertionMethod".to_string(),
            proof_value,
        },
    })
}

/// Verify a Verifiable Credential
pub fn verify_credential(vc: &VerifiableCredential) -> Result<bool> {
    // Basic validation
    if vc.context.is_empty() {
        return Err(anyhow!("Invalid credential: missing context"));
    }

    if !vc.credential_type.contains(&"VerifiableCredential".to_string()) {
        return Err(anyhow!("Invalid credential: missing VerifiableCredential type"));
    }

    // Check expiration (credentials valid for 24 hours)
    let age = Utc::now().signed_duration_since(vc.issuance_date);
    if age.num_hours() > 24 {
        return Err(anyhow!("Credential expired"));
    }

    // Verify proof (simplified - in production use proper cryptographic verification)
    let expected_proof = generate_proof(
        &vc.id,
        &vc.credential_subject,
        &vc.issuer,
    )?;

    if vc.proof.proof_value != expected_proof {
        return Err(anyhow!("Invalid credential proof"));
    }

    Ok(true)
}

/// Create a Verifiable Presentation from credentials
pub fn create_presentation(
    credentials: Vec<VerifiableCredential>,
    holder_did: &str,
) -> Result<VerifiablePresentation> {
    let now = Utc::now();
    
    // Generate presentation proof
    let mut hasher = Sha256::new();
    hasher.update(holder_did.as_bytes());
    for vc in &credentials {
        hasher.update(vc.id.as_bytes());
    }
    let hash = hasher.finalize();
    let proof_value = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&hash[..]);

    Ok(VerifiablePresentation {
        context: vec![
            "https://www.w3.org/2018/credentials/v1".to_string(),
        ],
        presentation_type: vec!["VerifiablePresentation".to_string()],
        verifiable_credential: credentials,
        proof: Proof {
            proof_type: "Ed25519Signature2020".to_string(),
            created: now,
            verification_method: format!("{}#key-1", holder_did),
            proof_purpose: "authentication".to_string(),
            proof_value,
        },
    })
}

/// Verify a Verifiable Presentation
pub fn verify_presentation(vp: &VerifiablePresentation) -> Result<&VerifiableCredential> {
    if vp.verifiable_credential.is_empty() {
        return Err(anyhow!("Presentation contains no credentials"));
    }

    // Verify each credential in the presentation
    for vc in &vp.verifiable_credential {
        verify_credential(vc)?;
    }

    // Return the first credential (primary identity credential)
    Ok(&vp.verifiable_credential[0])
}

/// Store a Verifiable Credential in the database
pub async fn store_credential(
    db: &PgPool,
    user_id: Uuid,
    vc: &VerifiableCredential,
) -> Result<()> {
    let vc_json = serde_json::to_value(vc)?;
    
    sqlx::query!(
        r#"
        UPDATE users
        SET vc_store = jsonb_set(
            COALESCE(vc_store, '{}'::jsonb),
            ARRAY[$1],
            $2::jsonb
        ),
        updated_at = NOW()
        WHERE id = $3
        "#,
        vc.id,
        vc_json,
        user_id
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Retrieve stored credentials for a user
pub async fn get_user_credentials(
    db: &PgPool,
    user_id: Uuid,
) -> Result<Vec<VerifiableCredential>> {
    let row = sqlx::query!(
        "SELECT vc_store FROM users WHERE id = $1",
        user_id
    )
    .fetch_one(db)
    .await?;

    let vc_store = row.vc_store;
    if vc_store.is_none() {
        return Ok(vec![]);
    }

    let store: serde_json::Map<String, serde_json::Value> = 
        serde_json::from_value(vc_store.unwrap())?;

    let mut credentials = Vec::new();
    for (_, vc_value) in store {
        let vc: VerifiableCredential = serde_json::from_value(vc_value)?;
        credentials.push(vc);
    }

    Ok(credentials)
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/// Generate a proof value (simplified implementation)
fn generate_proof(
    credential_id: &str,
    subject: &CredentialSubject,
    issuer_did: &str,
) -> Result<String> {
    let mut hasher = Sha256::new();
    hasher.update(credential_id.as_bytes());
    hasher.update(subject.id.as_bytes());
    hasher.update(serde_json::to_string(&subject.role)?.as_bytes());
    hasher.update(issuer_did.as_bytes());
    let hash = hasher.finalize();
    Ok(base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&hash[..]))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn create_test_user() -> UserProfile {
        UserProfile {
            id: Uuid::new_v4(),
            did: Some("did:key:z6MkTest123".to_string()),
            email: "test@example.com".to_string(),
            phone: None,
            role: UserRole::Teacher,
            approval_status: ApprovalStatus::Approved,
            approved_by: None,
            school_id: Some(Uuid::new_v4()),
            county_id: None,
            language_preference: syncsenta_common::models::SupportedLanguage::En,
            wallet_address: None,
            mfa_enabled: false,
            created_at: Utc::now(),
        }
    }

    #[test]
    fn test_issue_credential() {
        let user = create_test_user();
        let issuer_did = "did:key:z6MkIssuer456";
        
        let vc = issue_credential(&user, issuer_did);
        assert!(vc.is_ok());
        
        let vc = vc.unwrap();
        assert_eq!(vc.issuer, issuer_did);
        assert_eq!(vc.credential_subject.role, UserRole::Teacher);
    }

    #[test]
    fn test_verify_credential() {
        let user = create_test_user();
        let issuer_did = "did:key:z6MkIssuer456";
        
        let vc = issue_credential(&user, issuer_did).unwrap();
        let result = verify_credential(&vc);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_create_presentation() {
        let user = create_test_user();
        let issuer_did = "did:key:z6MkIssuer456";
        
        let vc = issue_credential(&user, issuer_did).unwrap();
        let vp = create_presentation(vec![vc], user.did.as_ref().unwrap());
        
        assert!(vp.is_ok());
        let vp = vp.unwrap();
        assert_eq!(vp.verifiable_credential.len(), 1);
    }

    #[test]
    fn test_verify_presentation() {
        let user = create_test_user();
        let issuer_did = "did:key:z6MkIssuer456";
        
        let vc = issue_credential(&user, issuer_did).unwrap();
        let vp = create_presentation(vec![vc], user.did.as_ref().unwrap()).unwrap();
        
        let result = verify_presentation(&vp);
        assert!(result.is_ok());
    }
}
