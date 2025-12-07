ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order FLOAT;

-- Initialize sort_order for existing categories if null
WITH indexed_categories AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM categories
  WHERE sort_order IS NULL
)
UPDATE categories
SET sort_order = ic.rn * 1000
FROM indexed_categories ic
WHERE categories.id = ic.id;
