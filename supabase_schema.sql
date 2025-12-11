-- Create the token_transactions table
create table if not exists token_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  amount int not null,
  type text not null check (type in ('DAILY_RESET', 'PURCHASE', 'SPEND')),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table token_transactions enable row level security;

-- Create policies
create policy "Users can view their own transactions"
  on token_transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on token_transactions for insert
  with check (auth.uid() = user_id);

-- Optional: Create an index on user_id for faster queries
create index if not exists token_transactions_user_id_idx on token_transactions (user_id);
