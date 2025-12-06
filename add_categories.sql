-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- Hex code or CSS color name
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' -- Default for anonymous/local dev
);

-- Add category_id to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Enable RLS (if not already enabled, though we are using public access for now)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (matching our current dev setup)
DROP POLICY IF EXISTS "Allow public access to categories" ON categories;
CREATE POLICY "Allow public access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);
