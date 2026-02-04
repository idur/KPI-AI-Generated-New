CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text,
  external_id text,
  customer_id text,
  customer_email text,
  user_id uuid,
  signature_present boolean,
  signature_valid boolean,
  http_status integer,
  error_message text,
  payload jsonb,
  headers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_external_id_uidx
  ON public.webhook_events (provider, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events
  FOR SELECT
  USING (public.is_admin());
