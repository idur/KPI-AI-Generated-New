create table if not exists public.email_logs (
    id uuid default gen_random_uuid() primary key,
    recipient varchar not null,
    subject varchar not null,
    template_type varchar,
    status varchar default 'pending', -- pending, sent, failed
    error_message text,
    metadata jsonb,
    created_at timestamptz default now()
);

-- Add RLS policies
alter table public.email_logs enable row level security;

create policy "Admins can view all email logs"
    on public.email_logs for select
    using ( exists (select 1 from public.user_tokens where user_id = auth.uid() and role = 'admin') );

create policy "System can insert email logs"
    on public.email_logs for insert
    with check ( true ); -- Usually restricted to service role in Edge Functions
