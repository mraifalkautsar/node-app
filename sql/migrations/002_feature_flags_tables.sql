-- Migration: Add feature flags tables for Milestone 2
-- Created: 2025-12-07

-- Create feature_flags table if not exists
CREATE TABLE IF NOT EXISTS feature_flags (
    flag_name VARCHAR(50) PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    disabled_reason TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL
);

-- Create user_feature_access table if not exists
CREATE TABLE IF NOT EXISTS user_feature_access (
    access_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    flag_name VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    disabled_reason TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE (user_id, flag_name)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_feature_access_user_id ON user_feature_access(user_id);

-- Create feature_flag_audit table for audit trail
CREATE TABLE IF NOT EXISTS feature_flag_audit (
    audit_id SERIAL PRIMARY KEY,
    flag_name VARCHAR(50) NOT NULL,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL, -- 'enable', 'disable'
    level VARCHAR(20) NOT NULL, -- 'global', 'user'
    reason TEXT,
    changed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on flag_name for faster audit queries
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_name ON feature_flag_audit(flag_name);

-- Insert default feature flags
INSERT INTO feature_flags (flag_name, is_enabled, disabled_reason)
VALUES 
    ('checkout_enabled', TRUE, NULL),
    ('auction_enabled', FALSE, 'Feature under development')
ON CONFLICT (flag_name) DO NOTHING;

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Feature flags tables created successfully';
END $$;
