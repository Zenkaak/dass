ALTER TABLE public.tenant_paystack_configs
  ADD COLUMN IF NOT EXISTS encrypted_bank_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (settlement_status IN ('not_submitted','pending','verified','failed'));
