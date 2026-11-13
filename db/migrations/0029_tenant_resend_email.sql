-- Per-shop Resend transactional email configuration.
-- API keys are encrypted with AES-256-GCM before they are written to this table.
CREATE TABLE IF NOT EXISTS public.tenant_email_configs (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  encrypted_config jsonb NOT NULL,
  from_email text NOT NULL,
  reply_to_email text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
