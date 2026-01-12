-- Add columns for tracking invitation resends
alter table public.user_tokens add column if not exists resend_count int default 0;
alter table public.user_tokens add column if not exists last_resend_at timestamptz;
