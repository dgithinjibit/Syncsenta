-- Migration: Auth improvements
-- Adds user_profiles view alias, fixes audit_logs column names,
-- and adds approval workflow indexes

-- Create user_profiles as a view alias for users table
-- (our Rust code queries user_profiles for clarity)
CREATE OR REPLACE VIEW user_profiles AS
    SELECT * FROM users;

-- Fix audit_logs to use entity_type column name (our handlers use entity_type)
ALTER TABLE audit_logs
    RENAME COLUMN entity TO entity_type;

-- Add entity_id index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Add index for approval workflow queries
CREATE INDEX IF NOT EXISTS idx_users_approval_role
    ON users(approval_status, role);

-- Add index for school-scoped approval queries
CREATE INDEX IF NOT EXISTS idx_users_school_approval
    ON users(school_id, approval_status);
