-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for user integrations (storing tokens for secondary apps)
create table user_integrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  provider text not null, -- 'google', 'azure', etc.
  access_token text, -- Note: In a real prod app, encrypt this!
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, provider)
);

-- Set up RLS for integrations
alter table user_integrations enable row level security;

create policy "Users can view own integrations."
  on user_integrations for select
  using ( auth.uid() = user_id );

create policy "Users can insert own integrations."
  on user_integrations for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own integrations."
  on user_integrations for update
  using ( auth.uid() = user_id );

create policy "Users can delete own integrations."
  on user_integrations for delete
  using ( auth.uid() = user_id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
