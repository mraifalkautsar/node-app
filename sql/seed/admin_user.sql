-- Add admin user for testing
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO users (email, password, role, name, address, balance)
VALUES (
    'admin@nimonspedia.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.Ojisw2', -- Admin@123
    'ADMIN',
    'Admin Nimonspedia',
    'Admin Office',
    0
)
ON CONFLICT (email) DO NOTHING;
