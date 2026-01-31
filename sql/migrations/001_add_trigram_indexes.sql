-- Migration: Add trigram indexes for user search optimization
-- Run this if database already exists without trigram support

-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes on users table
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);

-- Optionally, set similarity threshold (default is 0.3)
-- Lower values = more fuzzy matches, higher values = stricter matches
-- Uncomment to set custom threshold:
-- SELECT set_limit(0.3);

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
    AND indexname LIKE '%trgm%';
