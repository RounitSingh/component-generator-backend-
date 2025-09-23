-- Create components table
CREATE TABLE IF NOT EXISTS components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id uuid NULL REFERENCES messages(id) ON DELETE SET NULL,
  type text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS components_conversation_id_idx ON components(conversation_id);
CREATE INDEX IF NOT EXISTS components_convo_created_idx ON components(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS components_type_idx ON components(type);
CREATE INDEX IF NOT EXISTS components_data_idx ON components USING GIN (data);









