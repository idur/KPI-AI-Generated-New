CREATE TABLE IF NOT EXISTS public.token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own token transactions" ON public.token_transactions;
CREATE POLICY "Users can view own token transactions"
  ON public.token_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own token transactions" ON public.token_transactions;
CREATE POLICY "Users can insert own token transactions"
  ON public.token_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_tokens
  ADD COLUMN IF NOT EXISTS mayar_last_balance integer DEFAULT 0;
