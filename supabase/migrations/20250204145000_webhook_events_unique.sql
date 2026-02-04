DROP INDEX IF EXISTS public.webhook_events_provider_external_id_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_external_event_uidx
  ON public.webhook_events (provider, external_id, event_type)
  WHERE external_id IS NOT NULL;
