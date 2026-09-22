//! Hardware wallet MFA service
//!
//! Implements MetaMask/Ledger wallet signature verification for privileged roles.
//! Uses EIP-191 personal_sign format: "\x19Ethereum Signed Message:\n" + len + message

use anyhow::{anyhow, Result};
use ethers::core::types::{Address, Signature};
use ethers::utils::hash_message;
use sqlx::PgPool;
use uuid::Uuid;

use syncsenta_common::models::UserRole;

/// Roles that require hardware wallet MFA
pub fn requires_wallet_mfa(role: &UserRole) -> bool {
    matches!(
        role,
        UserRole::SchoolAdmin
            | UserRole::SchoolHead
            | UserRole::CountyOfficer
            | UserRole::NationalAdmin
    )
}

/// Generate a challenge message for wallet signing
/// Format: "SyncSenta MFA Challenge: {user_id}:{timestamp}"
pub fn generate_wallet_challenge(user_id: Uuid) -> String {
    let timestamp = chrono::Utc::now().timestamp();
    format!("SyncSenta MFA Challenge: {}:{}", user_id, timestamp)
}

/// Verify an EIP-191 personal_sign signature
///
/// The client signs the challenge with MetaMask/Ledger using personal_sign,
/// which prepends "\x19Ethereum Signed Message:\n{len}" before hashing.
pub fn verify_wallet_signature(
    challenge: &str,
    signature_hex: &str,
    expected_address: &str,
) -> Result<bool> {
    // Parse the signature (65 bytes: r + s + v)
    let sig: Signature = signature_hex
        .parse()
        .map_err(|_| anyhow!("Invalid signature format"))?;

    // Hash the message using EIP-191 personal_sign format
    let message_hash = hash_message(challenge);

    // Recover the signer address from the signature
    let recovered = sig
        .recover(message_hash)
        .map_err(|e| anyhow!("Signature recovery failed: {}", e))?;

    // Parse expected address
    let expected: Address = expected_address
        .parse()
        .map_err(|_| anyhow!("Invalid wallet address format"))?;

    // Compare recovered address with registered wallet address (case-insensitive)
    Ok(recovered == expected)
}

/// Enroll a hardware wallet for a user
pub async fn enroll_wallet(
    db: &PgPool,
    user_id: Uuid,
    wallet_address: &str,
    signature: &str,
    challenge: &str,
) -> Result<()> {
    // Verify the enrollment signature to confirm wallet ownership
    if !verify_wallet_signature(challenge, signature, wallet_address)? {
        return Err(anyhow!("Wallet signature verification failed"));
    }

    // Normalize address to lowercase
    let normalized = wallet_address.to_lowercase();

    sqlx::query!(
        r#"
        UPDATE users
        SET wallet_address = $1,
            mfa_enabled = true,
            updated_at = NOW()
        WHERE id = $2
        "#,
        normalized,
        user_id
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Verify wallet MFA during login
pub async fn verify_wallet_mfa(
    db: &PgPool,
    user_id: Uuid,
    signature: &str,
    challenge: &str,
) -> Result<bool> {
    // Fetch registered wallet address
    let row = sqlx::query!(
        "SELECT wallet_address, mfa_enabled FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| anyhow!("User not found"))?;

    if !row.mfa_enabled {
        return Err(anyhow!("MFA not enabled for this user"));
    }

    let wallet_address = row
        .wallet_address
        .ok_or_else(|| anyhow!("No wallet address registered"))?;

    verify_wallet_signature(challenge, signature, &wallet_address)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_requires_wallet_mfa() {
        assert!(!requires_wallet_mfa(&UserRole::Student));
        assert!(!requires_wallet_mfa(&UserRole::Parent));
        assert!(!requires_wallet_mfa(&UserRole::Teacher));
        assert!(requires_wallet_mfa(&UserRole::SchoolAdmin));
        assert!(requires_wallet_mfa(&UserRole::SchoolHead));
        assert!(requires_wallet_mfa(&UserRole::CountyOfficer));
        assert!(requires_wallet_mfa(&UserRole::NationalAdmin));
    }

    #[test]
    fn test_generate_wallet_challenge() {
        let user_id = Uuid::new_v4();
        let challenge = generate_wallet_challenge(user_id);
        assert!(challenge.starts_with("SyncSenta MFA Challenge: "));
        assert!(challenge.contains(&user_id.to_string()));
    }

    #[test]
    fn test_verify_wallet_signature_invalid_sig() {
        let result = verify_wallet_signature(
            "test challenge",
            "0xinvalid",
            "0x1234567890123456789012345678901234567890",
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_wallet_signature_invalid_address() {
        // A real signature but wrong address format
        let result = verify_wallet_signature(
            "test challenge",
            "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "not_an_address",
        );
        assert!(result.is_err());
    }
}
