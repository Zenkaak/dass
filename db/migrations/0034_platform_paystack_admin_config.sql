CREATE TABLE IF NOT EXISTS public.platform_paystack_config (
  id text PRIMARY KEY DEFAULT 'central',
  environment text NOT NULL DEFAULT 'test' CHECK (environment IN ('test','live')),
  encrypted_credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_paystack_config_singleton CHECK (id='central')
);
