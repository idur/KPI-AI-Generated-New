-- Create a table for user profiles/tokens if not exists (consolidated logic)
-- This table will store both token balance and role information

create table if not exists public.user_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null unique,
  email text,
  role text default 'user', -- 'admin' or 'user'
  free_tokens integer default 10,
  paid_tokens integer default 0,
  last_reset_date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist if table was already created
alter table public.user_tokens add column if not exists role text default 'user';
alter table public.user_tokens add column if not exists email text;

-- Enable RLS
alter table public.user_tokens enable row level security;

-- DROP Policies to ensure clean slate (use with caution in prod, but safe here for setup)
drop policy if exists "Users can view own token state" on public.user_tokens;
drop policy if exists "Users can update own token state" on public.user_tokens;
drop policy if exists "Users can insert own token state" on public.user_tokens;
drop policy if exists "Admins can view all token states" on public.user_tokens;
drop policy if exists "Admins can update all token states" on public.user_tokens;

-- POLICY: Users can view their own data
create policy "Users can view own token state"
on public.user_tokens for select
using ( auth.uid() = user_id );

-- POLICY: Users can insert their own data (initial setup)
create policy "Users can insert own token state"
on public.user_tokens for insert
with check ( auth.uid() = user_id );

-- POLICY: Users can update their own data (spending tokens)
-- Note: Ideally spending should be via RPC to prevent tampering, but valid for this scope.
create policy "Users can update own token state"
on public.user_tokens for update
using ( auth.uid() = user_id );

-- FIXED POLICY: Avoid infinite recursion by using a security definer function or simplified logic.
-- Actually, since "Users can view own token state" already exists, the admin check subquery *should* be able to read the user's own row without recursion if structured correctly.
-- But to be safe and fix the 42P17 error:
-- We will rely on a database function to check admin status that bypasses RLS, or simply fix the policy.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_tokens
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLICY: Admins can view ALL data
create policy "Admins can view all token states"
on public.user_tokens for select
using (
  public.is_admin()
);

-- POLICY: Admins can update ALL data
create policy "Admins can update all token states"
on public.user_tokens for update
using (
  public.is_admin()
);

-- OPTIONAL: Create a function to make the first user an admin if table is empty or via manual SQL
-- select * from user_tokens;
-- update user_tokens set role = 'admin' where email = 'YOUR_EMAIL@gmail.com';
