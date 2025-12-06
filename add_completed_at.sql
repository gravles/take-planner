ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update existing completed tasks to have a timestamp (using current time as fallback)
UPDATE tasks 
SET completed_at = NOW() 
WHERE status = 'completed' AND completed_at IS NULL;
