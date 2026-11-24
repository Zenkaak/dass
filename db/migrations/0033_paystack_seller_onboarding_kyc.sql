-- Paystack seller onboarding, card-payment KYC and central-account subaccounts.
-- Seller documents are stored as private object keys; never as public URLs.
ALTER TABLE public.auth_otp_challenges
  DROP CONSTRAINT IF EXISTS auth_otp_challenges_purpose_check;
ALTER TABLE public.auth_otp_challenges
  ADD CONSTRAINT auth_otp_challenges_purpose_check
  CHECK (purpose IN ('signup','password_reset','card_kyc'));

CREATE TABLE IF NOT EXISTS public.tenant_paystack_configs (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_mode text NOT NULL DEFAULT 'central_subaccount'
    CHECK (account_mode IN ('central_subaccount','own_paystack')),
  encrypted_credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  account_email text,
  connection_status text NOT NULL DEFAULT 'not_connected'
    CHECK (connection_status IN ('not_connected','pending_verification','connected','failed')),
  paystack_subaccount_code text,
  subaccount_status text NOT NULL DEFAULT 'not_created'
    CHECK (subaccount_status IN ('not_created','pending','active','failed')),
  connected_at timestamptz,
  last_verified_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_card_kyc (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  encrypted_identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  id_front_object_key text,
  id_back_object_key text,
  business_document_object_key text,
  phone text,
  phone_verified_at timestamptz,
  status text NOT NULL DEFAULT 'not_submitted'
    CHECK (status IN ('not_submitted','pending_review','approved','rejected','more_information_required')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_card_kyc_review_idx
  ON public.tenant_card_kyc(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS tenant_paystack_subaccount_idx
  ON public.tenant_paystack_configs(paystack_subaccount_code)
  WHERE paystack_subaccount_code IS NOT NULL;

-- Explicitly record the payment route selected at checkout so later account-mode
-- changes cannot silently redirect an existing order's payment.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_route text,
  ADD COLUMN IF NOT EXISTS provider_reference text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_unique
  ON public.payments(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
