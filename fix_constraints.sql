-- Make sure we are starting fresh with the specific constraints we need
ALTER TABLE user_integrations DROP CONSTRAINT IF EXISTS user_integrations_user_id_provider_key;
ALTER TABLE user_integrations DROP CONSTRAINT IF EXISTS user_integrations_user_id_provider_account_email_key;

-- Ensure account_email is there
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS account_email TEXT;
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Add the correct composite unique constraint
-- This allows (user1, google, bob@gmail.com) AND (user1, google, alice@gmail.com)
ALTER TABLE user_integrations 
ADD CONSTRAINT user_integrations_user_id_provider_account_email_key 
UNIQUE (user_id, provider, account_email);

-- Optional: Clean up any rows that might be missing email if possible, or we just rely on the app to fill them
-- We don't want to delete data if we can avoid it.
