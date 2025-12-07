ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS external_id text;

-- Add an index on external_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON tasks(external_id);

-- Add a unique constraint to prevent duplicate external tasks for the same user
-- This supports the ON CONFLICT upsert logic
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS unique_external_task_per_user;

ALTER TABLE tasks
ADD CONSTRAINT unique_external_task_per_user UNIQUE (user_id, external_id);
