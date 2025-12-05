-- Create enums for task status and priority
create type task_status as enum ('todo', 'in_progress', 'completed');
create type task_priority as enum ('low', 'medium', 'high');

-- Create the tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  duration_minutes integer default 15,
  priority task_priority default 'medium',
  status task_status default 'todo',
  scheduled_at timestamp with time zone, -- If null, it's on the "bench"
  user_id uuid references auth.users default auth.uid()
);

-- Enable Row Level Security (RLS)
alter table tasks enable row level security;

-- Create policies to ensure users can only access their own tasks
create policy "Users can view their own tasks" on tasks
  for select using (auth.uid() = user_id);

create policy "Users can insert their own tasks" on tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks" on tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks" on tasks
  for delete using (auth.uid() = user_id);
