alter table public.user_library add column if not exists original_job_title text;

create table if not exists public.library_logs (
    id uuid default gen_random_uuid() primary key,
    library_id uuid references public.user_library(id) on delete cascade,
    user_id uuid references auth.users(id),
    action varchar not null, -- 'create', 'update_title', 'update_kpis', 'delete'
    old_value jsonb,
    new_value jsonb,
    created_at timestamptz default now()
);

alter table public.library_logs enable row level security;

drop policy if exists "Users can view own logs" on public.library_logs;
create policy "Users can view own logs"
    on public.library_logs for select
    using ( auth.uid() = user_id );

drop policy if exists "Users can insert own logs" on public.library_logs;
create policy "Users can insert own logs"
    on public.library_logs for insert
    with check ( auth.uid() = user_id );
