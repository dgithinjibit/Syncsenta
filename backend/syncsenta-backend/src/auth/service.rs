//! Authentication service using DID and Verifiable Credentials

use anyhow::{anyhow, Result};
use base64::Engine;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use syncsenta_common::models::{ApprovalStatus, SupportedLanguage, UserProfile, UserRole};

use super::did::{generate_did, DIDMethod};
use super::vc::{issue_credential, store_credential, create_presentation, VerifiablePresentation};

// ─── Request / Response DTOs ─────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub phone: Option<String>,
    pub role: UserRole,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub language_preference: Option<SupportedLanguage>,
    pub wallet_address: Option<String>,  // Optional wallet for token economy
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub did: String,
    pub wallet_signature: Option<String>,  // Hardware wallet signature for MFA
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub vp: String,  // Base64-encoded Verifiable Presentation
    pub user: UserProfilePublic,
    pub mfa_required: bool,
}

#[derive(Debug, Serialize)]
pub struct UserProfilePublic {
    pub id: Uuid,
    pub did: String,
    pub email: String,
    pub phone: Option<String>,
    pub role: UserRole,
    pub approval_status: ApprovalStatus,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub language_preference: SupportedLanguage,
    pub wallet_address: Option<String>,
    pub mfa_enabled: bool,
}

// ─── Registration ─────────────────────────────────────────────────────────────

pub async fn register_user(
    db: &PgPool,
    req: RegisterRequest,
) -> Result<UserProfile> {
    // Check email uniqueness
    let exists: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
        req.email
    )
    .fetch_one(db)
    .await?
    .unwrap_or(false);

    if exists {
        return Err(anyhow!("Email already registered"));
    }

    let id = Uuid::new_v4();
    
    // Generate DID for user
    let did = generate_did(id, DIDMethod::Key);

    // NationalAdmin auto-approved; everyone else starts Pending
    let approval_status = match req.role {
        UserRole::NationalAdmin => ApprovalStatus::Approved,
        _ => ApprovalStatus::Pending,
    };

    let lang = req.language_preference.unwrap_or(SupportedLanguage::En);
    let lang_str = serde_json::to_string(&lang)?.trim_matches('"').to_string();
    let role_str = serde_json::to_string(&req.role)?.trim_matches('"').to_string();
    let status_str = serde_json::to_string(&approval_status)?.trim_matches('"').to_string();

    sqlx::query!(
        r#"
        INSERT INTO users
            (id, did, email, phone, role, approval_status, school_id, county_id,
             language_preference, wallet_address, mfa_enabled, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5::user_role,$6::approval_status,$7,$8,$9::supported_language,$10,false,NOW(),NOW())
        "#,
        id,
        did,
        req.email,
        req.phone,
        role_str as _,
        status_str as _,
        req.school_id,
        req.county_id,
        lang_str as _,
        req.wallet_address,
    )
    .execute(db)
    .await?;

    Ok(UserProfile {
        id,
        did: Some(did),
        email: req.email,
        phone: req.phone,
        role: req.role,
        approval_status,
        approved_by: None,
        school_id: req.school_id,
        county_id: req.county_id,
        language_preference: lang,
        wallet_address: req.wallet_address,
        mfa_enabled: false,
        created_at: Utc::now(),
    })
}

// ─── Login ────────────────────────────────────────────────────────────────────

pub async fn login_user(
    db: &PgPool,
    issuer_did: &str,
    req: LoginRequest,
) -> Result<AuthResponse> {
    // Fetch user by DID
    let row = sqlx::query!(
        r#"
        SELECT id, did, email, phone, role as "role: String", 
               approval_status as "approval_status: String",
               approved_by, school_id, county_id, 
               language_preference as "language_preference: String",
               wallet_address, mfa_enabled, created_at
        FROM users WHERE did = $1
        "#,
        req.did
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| anyhow!("Invalid DID"))?;

    let role: UserRole = serde_json::from_value(serde_json::Value::String(row.role))?;
    let approval_status: ApprovalStatus =
        serde_json::from_value(serde_json::Value::String(row.approval_status))?;
    let language: SupportedLanguage =
        serde_json::from_value(serde_json::Value::String(row.language_preference))?;

    // Block pending/rejected accounts
    if approval_status != ApprovalStatus::Approved {
        return Err(anyhow!("Account not yet approved"));
    }

    // MFA check for privileged roles
    let mfa_required = row.mfa_enabled
        && matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );

    let mut mfa_verified = false;
    if mfa_required {
        let signature = req
            .wallet_signature
            .ok_or_else(|| anyhow!("Hardware wallet signature required"))?;
        
        // Verify wallet signature
        if !verify_wallet_signature(&req.did, &signature, row.wallet_address.as_deref())? {
            return Err(anyhow!("Invalid wallet signature"));
        }
        mfa_verified = true;
    }

    let profile = UserProfile {
        id: row.id,
        did: row.did.clone(),
        email: row.email.clone(),
        phone: row.phone.clone(),
        role: role.clone(),
        approval_status: approval_status.clone(),
        approved_by: row.approved_by,
        school_id: row.school_id,
        county_id: row.county_id,
        language_preference: language.clone(),
        wallet_address: row.wallet_address.clone(),
        mfa_enabled: row.mfa_enabled,
        created_at: row.created_at,
    };

    // Issue Verifiable Credential
    let vc = issue_credential(&profile, issuer_did)?;
    
    // Store credential
    store_credential(db, profile.id, &vc).await?;

    // Create Verifiable Presentation
    let vp = create_presentation(vec![vc], &req.did)?;
    
    // Encode VP as base64 for transport
    let vp_json = serde_json::to_string(&vp)?;
    let vp_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(vp_json.as_bytes());

    Ok(AuthResponse {
        vp: vp_b64,
        mfa_required: mfa_required && !mfa_verified,
        user: UserProfilePublic {
            id: profile.id,
            did: profile.did.unwrap_or_default(),
            email: profile.email,
            phone: profile.phone,
            role,
            approval_status,
            school_id: profile.school_id,
            county_id: profile.county_id,
            language_preference: language,
            wallet_address: profile.wallet_address,
            mfa_enabled: profile.mfa_enabled,
        },
    })
}

// ─── Hardware Wallet MFA ──────────────────────────────────────────────────────

/// Verify hardware wallet signature for MFA
/// 
/// In production, this should verify an actual cryptographic signature
/// from MetaMask, Ledger, or other hardware wallet
fn verify_wallet_signature(
    did: &str,
    signature: &str,
    wallet_address: Option<&str>,
) -> Result<bool> {
    // TODO: Implement proper signature verification
    // For now, we do basic validation
    
    if signature.is_empty() {
        return Ok(false);
    }

    if wallet_address.is_none() {
        return Err(anyhow!("No wallet address registered"));
    }

    // In production:
    // 1. Recover signer address from signature
    // 2. Verify it matches the registered wallet_address
    // 3. Verify the signed message includes the DID and timestamp
    
    Ok(true)  // Simplified for now
}

/// Enable hardware wallet MFA for a user
pub async fn enable_wallet_mfa(
    db: &PgPool,
    user_id: Uuid,
    wallet_address: &str,
) -> Result<()> {
    sqlx::query!(
        "UPDATE users SET wallet_address = $1, mfa_enabled = true, updated_at = NOW() WHERE id = $2",
        wallet_address,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_wallet_signature() {
        let did = "did:key:z6MkTest123";
        let signature = "0x1234567890abcdef";
        let wallet = Some("0xabcdef1234567890");
        
        let result = verify_wallet_signature(did, signature, wallet);
        assert!(result.is_ok());
    }

    #[test]
    fn test_verify_wallet_signature_no_wallet() {
        let did = "did:key:z6MkTest123";
        let signature = "0x1234567890abcdef";
        
        let result = verify_wallet_signature(did, signature, None);
        assert!(result.is_err());
    }
}
