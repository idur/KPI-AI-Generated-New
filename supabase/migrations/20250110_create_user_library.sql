-- Create table for storing User Library Items
create table if not exists public.user_library (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    job_title text not null,
    kpi_data jsonb not null default '[]'::jsonb,
    created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.user_library enable row level security;

-- Policies
create policy "Users can view their own library items"
on public.user_library for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own library items"
on public.user_library for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own library items"
on public.user_library for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own library items"
on public.user_library for delete
to authenticated
using (auth.uid() = user_id);
