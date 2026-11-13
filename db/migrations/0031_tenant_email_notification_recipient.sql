ALTER TABLE public.tenant_email_configs
  ADD COLUMN IF NOT EXISTS notification_email text;
