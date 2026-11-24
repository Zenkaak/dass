ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billing_email text;

CREATE INDEX IF NOT EXISTS tenants_billing_email_idx
  ON public.tenants (billing_email)
  WHERE billing_email IS NOT NULL;
