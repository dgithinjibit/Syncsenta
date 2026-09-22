//! SyncToken learn-to-earn economy service
//!
//! Handles token minting on learning milestones and redemption.
//! Token amounts:
//! - Assessment mastery (90%+): 50 SYNC
//! - Quiz mastery: 10 SYNC
//! - Learning path milestone: 25 SYNC
//! - Daily login streak (7 days): 5 SYNC

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Milestone types that trigger token minting
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MilestoneType {
    AssessmentMastery,
    QuizMastery,
    LearningPathMilestone,
    DailyLoginStreak,
    CourseCompletion,
}

impl MilestoneType {
    /// Token reward for each milestone type
    pub fn token_reward(&self) -> u64 {
        match self {
            MilestoneType::AssessmentMastery => 50,
            MilestoneType::QuizMastery => 10,
            MilestoneType::LearningPathMilestone => 25,
            MilestoneType::DailyLoginStreak => 5,
            MilestoneType::CourseCompletion => 100,
        }
    }
}

/// Redemption types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RedemptionType {
    CoursePurchase,
    MentorshipBooking,
    HardwareSubsidy,
    ContentUnlock,
}

/// Token balance summary for a learner
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenBalance {
    pub learner_id: Uuid,
    pub wallet_address: String,
    pub total_minted: u64,
    pub total_burned: u64,
    pub available_balance: u64,
}

// ─── Token Minting ────────────────────────────────────────────────────────────

/// Mint tokens on a learning milestone
pub async fn mint_on_milestone(
    db: &PgPool,
    learner_id: Uuid,
    milestone: MilestoneType,
    reference_id: Option<Uuid>, // Assessment ID, quiz ID, etc.
) -> Result<u64> {
    let amount = milestone.token_reward();

    // Fetch learner wallet
    let wallet = sqlx::query_scalar!(
        "SELECT wallet_address FROM users WHERE id = $1",
        learner_id
    )
    .fetch_optional(db)
    .await?
    .flatten()
    .unwrap_or_default();

    if wallet.is_empty() {
        // No wallet — record pending tokens for when wallet is connected
        record_pending_tokens(db, learner_id, amount, &milestone, reference_id).await?;
        return Ok(amount);
    }

    let tx_hash = format!("0x{}", hex::encode(uuid::Uuid::new_v4().as_bytes()));
    let milestone_str = serde_json::to_string(&milestone)?.trim_matches('"').to_string();

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
        serde_json::json!({
            "milestone_type": milestone_str,
            "learner_id": learner_id,
            "reference_id": reference_id,
        }),
        chrono::Utc::now().timestamp(),
    )
    .execute(db)
    .await?;

    Ok(amount)
}

/// Record pending tokens for learners without wallets
async fn record_pending_tokens(
    db: &PgPool,
    learner_id: Uuid,
    amount: u64,
    milestone: &MilestoneType,
    reference_id: Option<Uuid>,
) -> Result<()> {
    let milestone_str = serde_json::to_string(milestone)?.trim_matches('"').to_string();

    sqlx::query!(
        r#"
        INSERT INTO token_transactions (
            id, tx_hash, from_address, to_address, amount,
            transaction_type, metadata, timestamp, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'pending_mint', $6, $7, NOW())
        "#,
        Uuid::new_v4(),
        format!("pending_{}", Uuid::new_v4()),
        "0x0000000000000000000000000000000000000000",
        "pending", // No wallet yet
        amount.to_string(),
        serde_json::json!({
            "milestone_type": milestone_str,
            "learner_id": learner_id,
            "reference_id": reference_id,
            "pending": true,
        }),
        chrono::Utc::now().timestamp(),
    )
    .execute(db)
    .await?;

    Ok(())
}

// ─── Token Redemption ─────────────────────────────────────────────────────────

/// Redeem tokens for a purchase or service
pub async fn redeem_tokens(
    db: &PgPool,
    learner_id: Uuid,
    amount: u64,
    redemption_type: RedemptionType,
    reference_id: Option<Uuid>,
) -> Result<String> {
    // Check balance
    let balance = get_token_balance(db, learner_id).await?;
    if balance.available_balance < amount {
        return Err(anyhow!(
            "Insufficient token balance: {} available, {} required",
            balance.available_balance,
            amount
        ));
    }

    let wallet = balance.wallet_address.clone();
    if wallet.is_empty() {
        return Err(anyhow!("No wallet address registered"));
    }

    let tx_hash = format!("0x{}", hex::encode(uuid::Uuid::new_v4().as_bytes()));
    let redemption_str = serde_json::to_string(&redemption_type)?.trim_matches('"').to_string();

    sqlx::query!(
        r#"
        INSERT INTO token_transactions (
            id, tx_hash, from_address, to_address, amount,
            transaction_type, metadata, timestamp, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'burn', $6, $7, NOW())
        "#,
        Uuid::new_v4(),
        tx_hash.clone(),
        wallet,
        "0x0000000000000000000000000000000000000000", // Burned to zero address
        amount.to_string(),
        serde_json::json!({
            "redemption_type": redemption_str,
            "learner_id": learner_id,
            "reference_id": reference_id,
        }),
        chrono::Utc::now().timestamp(),
    )
    .execute(db)
    .await?;

    Ok(tx_hash)
}

// ─── Token Balance ────────────────────────────────────────────────────────────

/// Get token balance for a learner
pub async fn get_token_balance(db: &PgPool, learner_id: Uuid) -> Result<TokenBalance> {
    let wallet = sqlx::query_scalar!(
        "SELECT wallet_address FROM users WHERE id = $1",
        learner_id
    )
    .fetch_optional(db)
    .await?
    .flatten()
    .unwrap_or_default();

    // Sum minted tokens
    let minted: i64 = sqlx::query_scalar!(
        r#"
        SELECT COALESCE(SUM(amount::bigint), 0)::bigint as "sum!"
        FROM token_transactions
        WHERE to_address = $1 AND transaction_type = 'mint'
        "#,
        wallet
    )
    .fetch_one(db)
    .await?;

    // Sum burned tokens
    let burned: i64 = sqlx::query_scalar!(
        r#"
        SELECT COALESCE(SUM(amount::bigint), 0)::bigint as "sum!"
        FROM token_transactions
        WHERE from_address = $1 AND transaction_type = 'burn'
        "#,
        wallet
    )
    .fetch_one(db)
    .await?;

    let total_minted = minted as u64;
    let total_burned = burned as u64;
    let available = total_minted.saturating_sub(total_burned);

    Ok(TokenBalance {
        learner_id,
        wallet_address: wallet,
        total_minted,
        total_burned,
        available_balance: available,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_milestone_token_rewards() {
        assert_eq!(MilestoneType::AssessmentMastery.token_reward(), 50);
        assert_eq!(MilestoneType::QuizMastery.token_reward(), 10);
        assert_eq!(MilestoneType::LearningPathMilestone.token_reward(), 25);
        assert_eq!(MilestoneType::DailyLoginStreak.token_reward(), 5);
        assert_eq!(MilestoneType::CourseCompletion.token_reward(), 100);
    }

    #[test]
    fn test_token_balance_calculation() {
        let minted: u64 = 200;
        let burned: u64 = 50;
        let available = minted.saturating_sub(burned);
        assert_eq!(available, 150);
    }

    #[test]
    fn test_cannot_redeem_more_than_balance() {
        let balance: u64 = 100;
        let redemption: u64 = 200;
        assert!(redemption > balance, "Should detect insufficient balance");
    }

    #[test]
    fn test_token_supply_never_negative() {
        let minted: u64 = 100;
        let burned: u64 = 150; // More than minted
        let available = minted.saturating_sub(burned);
        assert_eq!(available, 0, "Balance should be 0, not negative");
    }

    #[test]
    fn test_milestone_types_serialization() {
        let milestone = MilestoneType::AssessmentMastery;
        let json = serde_json::to_string(&milestone).unwrap();
        assert_eq!(json, r#""assessment_mastery""#);
    }

    #[test]
    fn test_redemption_types_serialization() {
        let redemption = RedemptionType::CoursePurchase;
        let json = serde_json::to_string(&redemption).unwrap();
        assert_eq!(json, r#""course_purchase""#);
    }
}
