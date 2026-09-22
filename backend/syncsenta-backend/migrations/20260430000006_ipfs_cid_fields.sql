-- Migration: Add IPFS CID fields to all content tables
-- Ensures all educational content can be stored on IPFS

-- Add ipfs_cid to schemes
ALTER TABLE schemes
ADD COLUMN IF NOT EXISTS ipfs_cid VARCHAR(255),
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);

CREATE INDEX IF NOT EXISTS idx_schemes_ipfs_cid ON schemes(ipfs_cid);

-- Add ipfs_cid to assessments
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS ipfs_cid VARCHAR(255),
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);

CREATE INDEX IF NOT EXISTS idx_assessments_ipfs_cid ON assessments(ipfs_cid);

-- Add ipfs_cid to virtual_classrooms (for recordings)
ALTER TABLE virtual_classrooms
ADD COLUMN IF NOT EXISTS ipfs_cid VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_virtual_classrooms_ipfs_cid ON virtual_classrooms(ipfs_cid);

-- Add ipfs_cid to lessons
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS ipfs_cid VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_lessons_ipfs_cid ON lessons(ipfs_cid);

-- Comments
COMMENT ON COLUMN schemes.ipfs_cid IS 'IPFS CID of the scheme content';
COMMENT ON COLUMN assessments.ipfs_cid IS 'IPFS CID of the assessment content';
COMMENT ON COLUMN virtual_classrooms.ipfs_cid IS 'IPFS CID of the session recording';
COMMENT ON COLUMN lessons.ipfs_cid IS 'IPFS CID of the lesson content';
