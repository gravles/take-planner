-- Allow public access to tasks (fixes "task not showing" issue for local dev)
drop policy if exists "Users can view their own tasks" on tasks;
drop policy if exists "Users can insert their own tasks" on tasks;
drop policy if exists "Users can update their own tasks" on tasks;
drop policy if exists "Users can delete their own tasks" on tasks;

create policy "Enable public access" on tasks
  for all using (true) with check (true);
