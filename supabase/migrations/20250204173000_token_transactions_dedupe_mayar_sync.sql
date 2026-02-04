WITH ranked AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY user_id, type, description
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.token_transactions
  WHERE type = 'PURCHASE'
    AND description LIKE 'Mayar TopUp (sync):%'
)
DELETE FROM public.token_transactions t
USING ranked r
WHERE t.ctid = r.ctid
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS token_transactions_mayar_sync_unique
ON public.token_transactions (user_id, description)
WHERE type = 'PURCHASE' AND description LIKE 'Mayar TopUp (sync):%';
