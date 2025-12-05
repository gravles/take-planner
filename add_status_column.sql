-- Add status column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN 
        ALTER TABLE tasks ADD COLUMN status text DEFAULT 'todo'; 
    END IF; 
END $$;
