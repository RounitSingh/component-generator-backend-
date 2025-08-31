-- Add performance indexes for authentication tables
-- Index for user email lookups (most critical for login/signup)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for user tokens by user_id and type for faster token operations
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id_type ON user_tokens(user_id, type);

-- Index for user tokens by token value for faster token validation
CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);

-- Index for expired tokens cleanup
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_revoked ON user_tokens(expires_at, is_revoked) WHERE is_revoked = false;

-- Index for sessions by user_id
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Composite index for active sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active) WHERE is_active = true;
