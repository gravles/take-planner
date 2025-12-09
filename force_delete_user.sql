-- REPLACE THIS WITH THE EMAIL YOU WANT TO DELETE
-- This is the "secondary" email that is currently blocking you.
DO $$
DECLARE
  target_email TEXT := 'REPLACE_WITH_YOUR_SECOND_EMAIL@gmail.com'; 
  target_user_id UUID;
BEGIN
  -- 1. Find the User ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NOT NULL THEN
    -- 2. Delete related data from PUBLIC tables first (to fix the "Database error")
    -- Tables must be deleted in order of dependency (usually child first)
    DELETE FROM public.tasks WHERE user_id = target_user_id;
    DELETE FROM public.categories WHERE user_id = target_user_id;
    DELETE FROM public.user_integrations WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    -- 3. Now delete the user from AUTH
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RAISE NOTICE 'Successfully deleted user % and all related data.', target_email;
  ELSE
    RAISE NOTICE 'User % not found in auth.users.', target_email;
  END IF;
END $$;
