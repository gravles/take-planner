ALTER TABLE tasks 
ADD COLUMN recurrence text CHECK (recurrence IN ('daily', 'weekly', 'monthly', 'yearly'));
