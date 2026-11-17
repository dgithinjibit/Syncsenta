-- Task 2.1: MeTTa Core Engine — atomspace persistence
--
-- Stores symbolic facts/rules asserted by the MeTTa knowledge base so that
-- reasoning state survives backend restarts and can be replayed across the
-- distributed cluster. Large or shareable atom payloads are stored on IPFS;
-- the `ipfs_cid` column points at them when present.

CREATE TABLE IF NOT EXISTS metta_atoms (
    id          BIGSERIAL PRIMARY KEY,
    domain      TEXT NOT NULL,
    expression  TEXT NOT NULL,
    ipfs_cid    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (domain, expression)
);

CREATE INDEX IF NOT EXISTS metta_atoms_domain_idx
    ON metta_atoms (domain);

CREATE INDEX IF NOT EXISTS metta_atoms_created_at_idx
    ON metta_atoms (created_at DESC);
