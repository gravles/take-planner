-- FORCE PUBLIC ACCESS (Development Mode)
-- Drop all existing policies on tasks to start fresh
drop policy if exists "Users can view their own tasks" on tasks;
drop policy if exists "Users can insert their own tasks" on tasks;
drop policy if exists "Users can update their own tasks" on tasks;
drop policy if exists "Users can delete their own tasks" on tasks;
drop policy if exists "Enable public access" on tasks;

-- Disable and re-enable RLS to ensure clean state
alter table tasks disable row level security;
alter table tasks enable row level security;

-- Create a single, permissive policy for ALL operations
create policy "Allow all operations for everyone" on tasks
  for all
  using (true)
  with check (true);

-- Grant usage on sequence if it exists (usually for serial ids, but we use uuid)
-- Grant access to public role just in case
grant all on table tasks to anon;
grant all on table tasks to authenticated;
grant all on table tasks to service_role;
