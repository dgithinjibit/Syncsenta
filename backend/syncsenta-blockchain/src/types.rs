//! Blockchain types and structures

use ethers::types::{Address, U256, H256};
use serde::{Deserialize, Serialize};

/// Blockchain credential structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainCredential {
    pub token_id: U256,
    pub learner: Address,
    pub skill_id: String,
    pub evidence_hash: String,  // IPFS CID
    pub issued_at: u64,
    pub revoked: bool,
}

/// Token transaction record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenTransaction {
    pub tx_hash: H256,
    pub from: Address,
    pub to: Address,
    pub amount: U256,
    pub timestamp: u64,
}

/// Approval record on-chain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalRecord {
    pub record_id: [u8; 32],
    pub applicant: Address,
    pub approver: Address,
    pub role: String,
    pub approved: bool,
    pub timestamp: u64,
}

/// Content registry record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentRecord {
    pub content_id: [u8; 32],
    pub ipfs_cid: String,
    pub creator: Address,
    pub timestamp: u64,
    pub active: bool,
}
