//! Approval workflow service with blockchain integration

use anyhow::{anyhow, Result};
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use syncsenta_common::models::{ApprovalStatus, SupportedLanguage, UserProfile, UserRole, get_approver_role};
use crate::auth::vc::{issue_credential, store_credential};

/// Process an approval decision
pub async fn process_approval_decision(
    db: &PgPool,
    request_id: Uuid,
    approver_id: Uuid,
    approved: bool,
    reason: Option<String>,
) -> Result<()> {
    // Fetch the target user
    let target = sqlx::query!(
        r#"
        SELECT 
            id, 
            did, 
            email as "email!", 
            phone, 
            role as "role!: UserRole", 
            approval_status as "approval_status!: ApprovalStatus",
            approved_by,
            school_id,
            county_id,
            language_preference as "language_preference!: SupportedLanguage",
            wallet_address,
            mfa_enabled as "mfa_enabled!",
            created_at as "created_at!"
        FROM user_profiles 
        WHERE id = $1
        "#,
        request_id
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| anyhow!("User not found"))?;

    // Verify user is in pending state
    if target.approval_status != ApprovalStatus::Pending {
        return Err(anyhow!("User is not in pending state"));
    }

    // Update approval status
    let new_status = if approved {
        ApprovalStatus::Approved
    } else {
        ApprovalStatus::Rejected
    };

    sqlx::query!(
        r#"
        UPDATE users
        SET approval_status = $1,
            approved_by = $2,
            updated_at = NOW()
        WHERE id = $3
        "#,
        new_status.clone() as ApprovalStatus,
        approver_id,
        request_id,
    )
    .execute(db)
    .await?;

    // If approved, issue Verifiable Credential
    if approved {
        if let Some(did) = &target.did {
            let issuer_did = "did:web:syncsenta.education:issuer";

            // Fetch updated user profile using plain query to avoid Option type issues
            let row = sqlx::query!(
                r#"
                SELECT id, did, email, phone,
                       role as "role: String",
                       approval_status as "approval_status: String",
                       approved_by, school_id, county_id,
                       language_preference as "language_preference: String",
                       wallet_address, mfa_enabled, created_at
                FROM users WHERE id = $1
                "#,
                request_id
            )
            .fetch_one(db)
            .await?;

            let role: UserRole = serde_json::from_value(serde_json::Value::String(row.role))?;
            let approval_status: ApprovalStatus =
                serde_json::from_value(serde_json::Value::String(row.approval_status))?;
            let language: syncsenta_common::models::SupportedLanguage =
                serde_json::from_value(serde_json::Value::String(row.language_preference))?;

            let updated_user = UserProfile {
                id: row.id,
                did: row.did,
                email: row.email,
                phone: row.phone,
                role,
                approval_status,
                approved_by: row.approved_by,
                school_id: row.school_id,
                county_id: row.county_id,
                language_preference: language,
                wallet_address: row.wallet_address,
                mfa_enabled: row.mfa_enabled,
                created_at: row.created_at,
            };

            let vc = issue_credential(&updated_user, issuer_did)?;
            store_credential(db, request_id, &vc).await?;
        }
    }

    // Update approval_requests table
    sqlx::query!(
        r#"
        UPDATE approval_requests
        SET status = $1,
            decided_by = $2,
            decided_at = NOW(),
            metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{reason}',
                $3::jsonb
            )
        WHERE requester_id = $4 AND status = 'pending'
        "#,
        new_status as ApprovalStatus,
        approver_id,
        json!(reason),
        request_id,
    )
    .execute(db)
    .await?;

    // Log the approval action
    sqlx::query!(
        r#"
        INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, occurred_at)
        VALUES ($1, $2, $3, 'user_profile', $4, $5, NOW())
        "#,
        Uuid::new_v4(),
        approver_id,
        if approved { "approval_approve" } else { "approval_reject" },
        request_id,
        json!({"reason": reason, "target_role": target.role}),
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Record approval on blockchain
pub async fn record_approval_on_chain(
    db: &PgPool,
    request_id: Uuid,
    applicant_address: &str,
    approver_address: &str,
    role: &UserRole,
    approved: bool,
) -> Result<String> {
    // TODO: Integrate with BlockchainService to call ApprovalRegistry.recordApproval
    // For now, we'll simulate the blockchain transaction
    
    let tx_hash = format!("0x{}", hex::encode(&Uuid::new_v4().as_bytes()[..]));
    let record_id = format!("0x{}", hex::encode(&Uuid::new_v4().as_bytes()[..]));
    let timestamp = Utc::now().timestamp();

    // Store on-chain approval record
    sqlx::query!(
        r#"
        INSERT INTO on_chain_approvals (
            id, record_id, approval_request_id, applicant_address, 
            approver_address, role, approved, blockchain_tx_hash, timestamp, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        "#,
        Uuid::new_v4(),
        record_id,
        request_id,
        applicant_address,
        approver_address,
        format!("{:?}", role),
        approved,
        tx_hash.clone(),
        timestamp,
    )
    .execute(db)
    .await?;

    // Update approval_requests with blockchain tx hash
    sqlx::query!(
        r#"
        UPDATE approval_requests
        SET blockchain_tx_hash = $1
        WHERE requester_id = $2
        "#,
        tx_hash.clone(),
        request_id,
    )
    .execute(db)
    .await?;

    // Update user with blockchain tx hash
    sqlx::query!(
        r#"
        UPDATE users
        SET blockchain_tx_hash = $1
        WHERE id = $2
        "#,
        tx_hash.clone(),
        request_id,
    )
    .execute(db)
    .await?;

    Ok(tx_hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_approver_role() {
        assert_eq!(get_approver_role(&UserRole::Student), UserRole::Teacher);
        assert_eq!(get_approver_role(&UserRole::Parent), UserRole::Teacher);
        assert_eq!(get_approver_role(&UserRole::Teacher), UserRole::SchoolHead);
        assert_eq!(get_approver_role(&UserRole::SchoolAdmin), UserRole::SchoolHead);
        assert_eq!(get_approver_role(&UserRole::SchoolHead), UserRole::CountyOfficer);
        assert_eq!(get_approver_role(&UserRole::CountyOfficer), UserRole::NationalAdmin);
        assert_eq!(get_approver_role(&UserRole::NationalAdmin), UserRole::NationalAdmin);
    }
}
