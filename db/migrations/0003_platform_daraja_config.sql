-- Central platform Daraja credentials, managed from the platform admin dashboard.
CREATE TABLE IF NOT EXISTS public.platform_payment_config (
  id integer PRIMARY KEY CHECK (id = 1),
  shortcode text,
  party_b text,
  account_type text NOT NULL DEFAULT 'CustomerPayBillOnline' CHECK (account_type IN ('CustomerPayBillOnline','CustomerBuyGoodsOnline')),
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
  encrypted_credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
