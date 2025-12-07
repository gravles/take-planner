ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS external_id text;

-- Add an index on external_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_external_id ON categories(external_id);

-- Add a unique constraint to prevent duplicate external categories for the same user
ALTER TABLE categories 
DROP CONSTRAINT IF EXISTS unique_external_category_per_user;

ALTER TABLE categories
ADD CONSTRAINT unique_external_category_per_user UNIQUE (user_id, external_id);
