//! Mastery engine — triggers blockchain credential minting on 90%+ achievement
//!
//! When a student achieves 90%+ mastery on an assessment:
//! 1. Store credential metadata on IPFS
//! 2. Mint ERC-721 credential NFT on Polygon
//! 3. Issue W3C Verifiable Credential alongside blockchain credential
//! 4. Mint SyncTokens as learn-to-earn reward

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Mastery threshold (90%)
pub const MASTERY_THRESHOLD: f64 = 0.90;

/// Token reward amounts per milestone type
pub const TOKENS_ASSESSMENT_MASTERY: u64 = 50;
pub const TOKENS_QUIZ_MASTERY: u64 = 10;
pub const TOKENS_LEARNING_PATH_MILESTONE: u64 = 25;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MasteryResult {
    pub student_id: Uuid,
    pub assessment_id: Uuid,
    pub score: f64,
    pub max_score: f64,
    pub mastery_achieved: bool,
    pub mastery_percentage: f64,
    pub skill_id: String,
    pub credential_minted: bool,
    pub token_id: Option<String>,
    pub tokens_awarded: u64,
}

/// Check if a score meets the mastery threshold
pub fn check_mastery(score: f64, max_score: f64) -> bool {
    if max_score <= 0.0 {
        return false;
    }
    (score / max_score) >= MASTERY_THRESHOLD
}

/// Calculate mastery percentage
pub fn mastery_percentage(score: f64, max_score: f64) -> f64 {
    if max_score <= 0.0 {
        return 0.0;
    }
    (score / max_score) * 100.0
}

/// Process mastery achievement — mint credential and tokens
///
/// Called after assessment grading when score >= 90%
pub async fn process_mastery_achievement(
    db: &PgPool,
    student_id: Uuid,
    assessment_id: Uuid,
    score: f64,
    max_score: f64,
    curriculum_ref: &str,
) -> Result<MasteryResult> {
    let mastery_achieved = check_mastery(score, max_score);
    let mastery_pct = mastery_percentage(score, max_score);

    let skill_id = format!("CBC/{}", curriculum_ref);

    if !mastery_achieved {
        return Ok(MasteryResult {
            student_id,
            assessment_id,
            score,
            max_score,
            mastery_achieved: false,
            mastery_percentage: mastery_pct,
            skill_id,
            credential_minted: false,
            token_id: None,
            tokens_awarded: 0,
        });
    }

    // Check if credential already minted for this skill
    let existing = sqlx::query!(
        "SELECT id FROM blockchain_credentials WHERE learner_id = $1 AND skill_id = $2 AND revoked = false",
        student_id,
        skill_id
    )
    .fetch_optional(db)
    .await?;

    if existing.is_some() {
        // Credential already exists — still award tokens
        award_tokens(db, student_id, TOKENS_ASSESSMENT_MASTERY, "assessment_mastery_repeat").await?;
        return Ok(MasteryResult {
            student_id,
            assessment_id,
            score,
            max_score,
            mastery_achieved: true,
            mastery_percentage: mastery_pct,
            skill_id,
            credential_minted: false, // Already minted
            token_id: None,
            tokens_awarded: TOKENS_ASSESSMENT_MASTERY,
        });
    }

    // Fetch student wallet address
    let student = sqlx::query!(
        "SELECT wallet_address, did FROM users WHERE id = $1",
        student_id
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| anyhow!("Student not found"))?;

    let wallet = student.wallet_address.unwrap_or_default();

    // Build IPFS evidence metadata (will be uploaded to IPFS in Task 5)
    let evidence_metadata = serde_json::json!({
        "student_id": student_id,
        "assessment_id": assessment_id,
        "skill_id": skill_id,
        "score": score,
        "max_score": max_score,
        "mastery_percentage": mastery_pct,
        "achieved_at": chrono::Utc::now().to_rfc3339(),
        "curriculum_ref": curriculum_ref,
    });

    // Simulate IPFS upload (Task 5 will implement actual IPFS upload)
    let evidence_cid = format!("QmSimulated{}", hex::encode(&uuid::Uuid::new_v4().as_bytes()[..8]));

    // Simulate blockchain minting (actual call requires BlockchainService)
    let token_id = format!("{}", uuid::Uuid::new_v4().as_u128());
    let tx_hash = format!("0x{}", hex::encode(uuid::Uuid::new_v4().as_bytes()));

    // Store credential in database
    sqlx::query!(
        r#"
        INSERT INTO blockchain_credentials (
            id, token_id, learner_id, learner_address, skill_id,
            evidence_cid, issued_at, revoked, blockchain_tx_hash, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, NOW())
        "#,
        Uuid::new_v4(),
        token_id,
        student_id,
        wallet,
        skill_id,
        evidence_cid,
        chrono::Utc::now().timestamp(),
        tx_hash,
    )
    .execute(db)
    .await?;

    // Issue W3C Verifiable Credential alongside blockchain credential
    if let Some(did) = student.did {
        issue_mastery_vc(db, student_id, &did, &skill_id, mastery_pct).await?;
    }

    // Award SyncTokens
    award_tokens(db, student_id, TOKENS_ASSESSMENT_MASTERY, "assessment_mastery").await?;

    Ok(MasteryResult {
        student_id,
        assessment_id,
        score,
        max_score,
        mastery_achieved: true,
        mastery_percentage: mastery_pct,
        skill_id,
        credential_minted: true,
        token_id: Some(token_id),
        tokens_awarded: TOKENS_ASSESSMENT_MASTERY,
    })
}

/// Issue a W3C Verifiable Credential for mastery achievement
async fn issue_mastery_vc(
    db: &PgPool,
    student_id: Uuid,
    student_did: &str,
    skill_id: &str,
    mastery_pct: f64,
) -> Result<()> {
    let issuer_did = "did:web:syncsenta.education:issuer";
    let vc_id = format!("urn:uuid:{}", Uuid::new_v4());

    let vc = serde_json::json!({
        "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://syncsenta.education/credentials/v1"
        ],
        "id": vc_id,
        "type": ["VerifiableCredential", "MasteryCredential"],
        "issuer": issuer_did,
        "issuanceDate": chrono::Utc::now().to_rfc3339(),
        "credentialSubject": {
            "id": student_did,
            "skillId": skill_id,
            "masteryPercentage": mastery_pct,
            "achievedAt": chrono::Utc::now().to_rfc3339(),
        }
    });

    // Store VC in user's vc_store
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
        vc_id,
        vc,
        student_id
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Award SyncTokens to a student
async fn award_tokens(
    db: &PgPool,
    student_id: Uuid,
    amount: u64,
    reason: &str,
) -> Result<()> {
    // Fetch student wallet
    let wallet = sqlx::query_scalar!(
        "SELECT wallet_address FROM users WHERE id = $1",
        student_id
    )
    .fetch_optional(db)
    .await?
    .flatten()
    .unwrap_or_default();

    if wallet.is_empty() {
        return Ok(()); // No wallet, skip token award
    }

    let tx_hash = format!("0x{}", hex::encode(uuid::Uuid::new_v4().as_bytes()));

    sqlx::query!(
        r#"
        INSERT INTO token_transactions (
            id, tx_hash, from_address, to_address, amount,
            transaction_type, metadata, timestamp, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'mint', $6, $7, NOW())
        "#,
        Uuid::new_v4(),
        tx_hash,
        "0x0000000000000000000000000000000000000000",
        wallet,
        amount.to_string(),
        serde_json::json!({"reason": reason, "student_id": student_id}),
        chrono::Utc::now().timestamp(),
    )
    .execute(db)
    .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mastery_threshold_90_percent() {
        assert!(check_mastery(90.0, 100.0));
        assert!(check_mastery(95.0, 100.0));
        assert!(check_mastery(100.0, 100.0));
        assert!(!check_mastery(89.9, 100.0));
        assert!(!check_mastery(0.0, 100.0));
    }

    #[test]
    fn test_mastery_percentage_calculation() {
        assert_eq!(mastery_percentage(90.0, 100.0), 90.0);
        assert_eq!(mastery_percentage(45.0, 50.0), 90.0);
        assert_eq!(mastery_percentage(0.0, 100.0), 0.0);
    }

    #[test]
    fn test_mastery_with_zero_max_score() {
        assert!(!check_mastery(100.0, 0.0));
        assert_eq!(mastery_percentage(100.0, 0.0), 0.0);
    }

    #[test]
    fn test_mastery_boundary_conditions() {
        // Exactly 90% should pass
        assert!(check_mastery(9.0, 10.0));
        // 89.9% should fail
        assert!(!check_mastery(8.99, 10.0));
    }
}
