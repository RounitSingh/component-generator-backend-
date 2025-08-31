-- Add performance indexes for chat messages and components tables
-- Index for chat messages by session_id (most common query)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- Index for chat messages by conversation_id for grouping
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);

-- Composite index for chat messages by session and order
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_order ON chat_messages(session_id, message_order);

-- Index for chat messages by role (user/assistant)
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- Index for components by session_id
CREATE INDEX IF NOT EXISTS idx_components_session_id ON components(session_id);

-- Index for current components per session
CREATE INDEX IF NOT EXISTS idx_components_current ON components(session_id, is_current) WHERE is_current = true;

-- Index for components by type
CREATE INDEX IF NOT EXISTS idx_components_type ON components(component_type);

-- Index for ai_interactions by session_id
CREATE INDEX IF NOT EXISTS idx_ai_interactions_session_id ON ai_interactions(session_id);

-- Index for ai_interactions by conversation_id
CREATE INDEX IF NOT EXISTS idx_ai_interactions_conversation_id ON ai_interactions(conversation_id);

-- Index for ai_responses by session_id
CREATE INDEX IF NOT EXISTS idx_ai_responses_session_id ON ai_responses(session_id);

-- Index for ai_responses by conversation_id
CREATE INDEX IF NOT EXISTS idx_ai_responses_conversation_id ON ai_responses(conversation_id);

-- Index for conversation_sessions by session_id
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_id ON conversation_sessions(session_id);

-- Index for conversation_sessions by conversation_id
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_conversation_id ON conversation_sessions(conversation_id);
