//! Smart contract interaction layer using ethers-rs
//!
//! Provides typed interfaces for all SyncSenta smart contracts:
//! - SyncSentaCredentials (ERC-721): Learning credential NFTs
//! - SyncToken (ERC-20): Learn-to-earn token economy
//! - ApprovalRegistry: On-chain approval audit trail
//! - ContentRegistry: IPFS content ownership registry

use ethers::{
    prelude::*,
    providers::{Provider, Http},
    signers::{LocalWallet, Signer},
};
use std::sync::Arc;
use anyhow::{anyhow, Result};
use tracing::{info, error, warn};

use crate::types::*;

// ─── Contract ABIs (minimal, hand-crafted) ───────────────────────────────────

abigen!(
    SyncSentaCredentials,
    r#"[
        function mintCredential(address learner, string skillId, string evidenceHash) external returns (uint256)
        function verifyCredential(uint256 tokenId) external view returns (bool valid, address learner, string skillId)
        function revokeCredential(uint256 tokenId) external
        function totalMinted() external view returns (uint256)
        function addIssuer(address issuer) external
        event CredentialMinted(uint256 indexed tokenId, address indexed learner, string skillId)
        event CredentialRevoked(uint256 indexed tokenId)
    ]"#
);

abigen!(
    SyncToken,
    r#"[
        function mint(address to, uint256 amount) external
        function burn(uint256 amount) external
        function balanceOf(address account) external view returns (uint256)
        function totalSupply() external view returns (uint256)
        function addMinter(address minter) external
        event TokensMinted(address indexed to, uint256 amount)
        event TokensBurned(address indexed from, uint256 amount)
    ]"#
);

abigen!(
    ApprovalRegistry,
    r#"[
        function recordApproval(address applicant, address approver, string role, bool approved, string reason) external returns (bytes32)
        function isApproved(address applicant, string role) external view returns (bool)
        function totalRecords() external view returns (uint256)
        function addRecorder(address recorder) external
        event ApprovalRecorded(bytes32 indexed recordId, address indexed applicant, address indexed approver, string role, bool approved)
    ]"#
);

abigen!(
    ContentRegistry,
    r#"[
        function registerContent(string ipfsCid, address creator, string contentType, string curriculumRef) external returns (bytes32)
        function deactivateContent(bytes32 contentId) external
        function getCreatorContent(address creator) external view returns (bytes32[])
        function totalContent() external view returns (uint256)
        function addRegistrar(address registrar) external
        event ContentRegistered(bytes32 indexed contentId, string ipfsCid, address indexed creator, string contentType)
    ]"#
);

// ─── Blockchain Service ───────────────────────────────────────────────────────

type SignerProvider = SignerMiddleware<Provider<Http>, LocalWallet>;

/// Blockchain service for all smart contract interactions
pub struct BlockchainService {
    client: Arc<SignerProvider>,
    credentials_contract: SyncSentaCredentials<SignerProvider>,
    token_contract: SyncToken<SignerProvider>,
    approval_registry: ApprovalRegistry<SignerProvider>,
    content_registry: ContentRegistry<SignerProvider>,
    chain_id: u64,
}

impl BlockchainService {
    /// Create a new blockchain service from environment config
    pub async fn new(
        rpc_url: &str,
        private_key: &str,
        chain_id: u64,
        credentials_address: &str,
        token_address: &str,
        approval_registry_address: &str,
        content_registry_address: &str,
    ) -> Result<Self> {
        let provider = Provider::<Http>::try_from(rpc_url)
            .map_err(|e| anyhow!("Failed to connect to RPC: {}", e))?;

        let wallet: LocalWallet = private_key
            .parse()
            .map_err(|_| anyhow!("Invalid private key"))?;
        let wallet = wallet.with_chain_id(chain_id);

        let client = Arc::new(SignerMiddleware::new(provider, wallet));

        let credentials_addr: Address = credentials_address
            .parse()
            .map_err(|_| anyhow!("Invalid credentials contract address"))?;
        let token_addr: Address = token_address
            .parse()
            .map_err(|_| anyhow!("Invalid token contract address"))?;
        let approval_addr: Address = approval_registry_address
            .parse()
            .map_err(|_| anyhow!("Invalid approval registry address"))?;
        let content_addr: Address = content_registry_address
            .parse()
            .map_err(|_| anyhow!("Invalid content registry address"))?;

        Ok(Self {
            credentials_contract: SyncSentaCredentials::new(credentials_addr, client.clone()),
            token_contract: SyncToken::new(token_addr, client.clone()),
            approval_registry: ApprovalRegistry::new(approval_addr, client.clone()),
            content_registry: ContentRegistry::new(content_addr, client.clone()),
            client,
            chain_id,
        })
    }

    /// Get the service wallet address
    pub fn address(&self) -> Address {
        self.client.address()
    }

    // ─── Credential Operations ────────────────────────────────────────────────

    /// Mint a learning credential NFT on 90%+ mastery achievement
    pub async fn mint_credential(
        &self,
        learner_address: Address,
        skill_id: String,
        evidence_cid: String,
    ) -> Result<U256> {
        info!("Minting credential for learner {:?}, skill: {}", learner_address, skill_id);

        let tx = self.credentials_contract
            .mint_credential(learner_address, skill_id.clone(), evidence_cid)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to send mint transaction: {}", e))?
            .await
            .map_err(|e| anyhow!("Transaction failed: {}", e))?
            .ok_or_else(|| anyhow!("Transaction receipt not found"))?;

        // Extract token ID from CredentialMinted event
        let token_id = tx.logs
            .iter()
            .find_map(|log| {
                // Parse the CredentialMinted event to get token ID
                if log.topics.len() >= 2 {
                    Some(U256::from_big_endian(&log.topics[1].as_bytes()))
                } else {
                    None
                }
            })
            .unwrap_or(U256::zero());

        info!("Credential minted: token_id={}, skill={}", token_id, skill_id);
        Ok(token_id)
    }

    /// Verify a credential's validity
    pub async fn verify_credential(&self, token_id: U256) -> Result<BlockchainCredential> {
        let (valid, learner, skill_id) = self.credentials_contract
            .verify_credential(token_id)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to verify credential: {}", e))?;

        Ok(BlockchainCredential {
            token_id,
            learner,
            skill_id,
            evidence_hash: String::new(), // Not returned by verifyCredential
            issued_at: 0,
            revoked: !valid,
        })
    }

    /// Revoke a credential
    pub async fn revoke_credential(&self, token_id: U256) -> Result<TxHash> {
        let tx = self.credentials_contract
            .revoke_credential(token_id)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to revoke credential: {}", e))?
            .await
            .map_err(|e| anyhow!("Revocation transaction failed: {}", e))?
            .ok_or_else(|| anyhow!("Transaction receipt not found"))?;

        Ok(tx.transaction_hash)
    }

    // ─── Token Operations ─────────────────────────────────────────────────────

    /// Mint SyncTokens on learning milestone completion
    pub async fn mint_tokens(&self, learner_address: Address, amount: U256) -> Result<TxHash> {
        info!("Minting {} tokens for {:?}", amount, learner_address);

        let tx = self.token_contract
            .mint(learner_address, amount)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to send mint tokens transaction: {}", e))?
            .await
            .map_err(|e| anyhow!("Token mint transaction failed: {}", e))?
            .ok_or_else(|| anyhow!("Transaction receipt not found"))?;

        Ok(tx.transaction_hash)
    }

    /// Get token balance for an address
    pub async fn get_token_balance(&self, address: Address) -> Result<U256> {
        self.token_contract
            .balance_of(address)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to get token balance: {}", e))
    }

    // ─── Approval Registry Operations ─────────────────────────────────────────

    /// Record an approval decision on-chain
    pub async fn record_approval(
        &self,
        applicant: Address,
        approver: Address,
        role: String,
        approved: bool,
        reason: String,
    ) -> Result<[u8; 32]> {
        info!("Recording approval on-chain: applicant={:?}, role={}, approved={}", applicant, role, approved);

        let tx = self.approval_registry
            .record_approval(applicant, approver, role, approved, reason)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to record approval: {}", e))?
            .await
            .map_err(|e| anyhow!("Approval recording transaction failed: {}", e))?
            .ok_or_else(|| anyhow!("Transaction receipt not found"))?;

        // Extract record ID from ApprovalRecorded event
        let record_id = tx.logs
            .iter()
            .find_map(|log| {
                if log.topics.len() >= 2 {
                    let mut bytes = [0u8; 32];
                    bytes.copy_from_slice(&log.topics[1].as_bytes());
                    Some(bytes)
                } else {
                    None
                }
            })
            .unwrap_or([0u8; 32]);

        Ok(record_id)
    }

    /// Check if an applicant has been approved for a role
    pub async fn is_approved(&self, applicant: Address, role: String) -> Result<bool> {
        self.approval_registry
            .is_approved(applicant, role)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to check approval status: {}", e))
    }

    // ─── Content Registry Operations ──────────────────────────────────────────

    /// Register educational content on-chain
    pub async fn register_content(
        &self,
        ipfs_cid: String,
        creator: Address,
        content_type: String,
        curriculum_ref: String,
    ) -> Result<[u8; 32]> {
        info!("Registering content on-chain: cid={}, type={}", ipfs_cid, content_type);

        let tx = self.content_registry
            .register_content(ipfs_cid, creator, content_type, curriculum_ref)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to register content: {}", e))?
            .await
            .map_err(|e| anyhow!("Content registration transaction failed: {}", e))?
            .ok_or_else(|| anyhow!("Transaction receipt not found"))?;

        let content_id = tx.logs
            .iter()
            .find_map(|log| {
                if log.topics.len() >= 2 {
                    let mut bytes = [0u8; 32];
                    bytes.copy_from_slice(&log.topics[1].as_bytes());
                    Some(bytes)
                } else {
                    None
                }
            })
            .unwrap_or([0u8; 32]);

        Ok(content_id)
    }

    /// Get all content registered by a creator
    pub async fn get_creator_content(&self, creator: Address) -> Result<Vec<[u8; 32]>> {
        let ids = self.content_registry
            .get_creator_content(creator)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to get creator content: {}", e))?;

        Ok(ids.into_iter().map(|id| id.into()).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_address_parsing() {
        let addr = "0x0000000000000000000000000000000000000001";
        let parsed: Result<Address, _> = addr.parse();
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_u256_operations() {
        let amount = U256::from(1000u64) * U256::exp10(18); // 1000 tokens in wei
        assert!(amount > U256::zero());
    }
}
