-- Web4 Infrastructure Migration
-- Adds DID, blockchain, and IPFS support to existing schema

-- Add Web4 fields to users table (not the view)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS did VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42),
ADD COLUMN IF NOT EXISTS vc_store JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);

-- Create index on DID for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_did ON users(did);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- Add IPFS CID fields to content tables
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS ipfs_cid VARCHAR(255),
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);

-- Create index on IPFS CID
CREATE INDEX IF NOT EXISTS idx_content_library_ipfs_cid ON content_library(ipfs_cid);

-- Add blockchain transaction hash to approval_requests
ALTER TABLE approval_requests
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);

-- Create blockchain_credentials table for tracking on-chain credentials
CREATE TABLE IF NOT EXISTS blockchain_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id VARCHAR(78) NOT NULL UNIQUE,  -- U256 as string
    learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learner_address VARCHAR(42) NOT NULL,
    skill_id VARCHAR(255) NOT NULL,
    evidence_cid VARCHAR(255) NOT NULL,  -- IPFS CID
    issued_at BIGINT NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    blockchain_tx_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blockchain_credentials_learner ON blockchain_credentials(learner_id);
CREATE INDEX idx_blockchain_credentials_token_id ON blockchain_credentials(token_id);
CREATE INDEX idx_blockchain_credentials_skill ON blockchain_credentials(skill_id);

-- Create token_transactions table for tracking SyncToken economy
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount VARCHAR(78) NOT NULL,  -- U256 as string
    transaction_type VARCHAR(50) NOT NULL,  -- 'mint', 'transfer', 'burn', 'redeem'
    metadata JSONB DEFAULT '{}',
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_transactions_from ON token_transactions(from_address);
CREATE INDEX idx_token_transactions_to ON token_transactions(to_address);
CREATE INDEX idx_token_transactions_type ON token_transactions(transaction_type);

-- Create ipfs_content table for tracking IPFS uploads
CREATE TABLE IF NOT EXISTS ipfs_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cid VARCHAR(255) NOT NULL UNIQUE,
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pinned BOOLEAN DEFAULT FALSE,
    pinning_service VARCHAR(50),  -- 'pinata', 'infura', 'local'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ipfs_content_cid ON ipfs_content(cid);
CREATE INDEX idx_ipfs_content_uploader ON ipfs_content(uploaded_by);

-- Create on_chain_approvals table for tracking approval records on blockchain
CREATE TABLE IF NOT EXISTS on_chain_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id VARCHAR(66) NOT NULL UNIQUE,  -- bytes32 as hex string
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    applicant_address VARCHAR(42) NOT NULL,
    approver_address VARCHAR(42) NOT NULL,
    role VARCHAR(50) NOT NULL,
    approved BOOLEAN NOT NULL,
    blockchain_tx_hash VARCHAR(66) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_on_chain_approvals_request ON on_chain_approvals(approval_request_id);
CREATE INDEX idx_on_chain_approvals_tx ON on_chain_approvals(blockchain_tx_hash);

-- Add comments for documentation
COMMENT ON COLUMN users.did IS 'W3C Decentralized Identifier (e.g., did:key:z6Mk...)';
COMMENT ON COLUMN users.wallet_address IS 'Ethereum/Polygon wallet address for token economy';
COMMENT ON COLUMN users.vc_store IS 'Storage for Verifiable Credentials (W3C VC standard)';
COMMENT ON COLUMN users.blockchain_tx_hash IS 'Transaction hash of on-chain approval record';

COMMENT ON TABLE blockchain_credentials IS 'Tracks blockchain credentials (ERC-721 NFTs) minted on Polygon';
COMMENT ON TABLE token_transactions IS 'Tracks SyncToken (ERC-20) transactions for learn-to-earn economy';
COMMENT ON TABLE ipfs_content IS 'Tracks content uploaded to IPFS with CIDs and pinning status';
COMMENT ON TABLE on_chain_approvals IS 'Tracks approval decisions recorded on blockchain';
