-- Keep platform-provided Daraja credentials independent for Till and PayBill.
-- Seller payout destinations remain Party B; platform config stores API credentials only.
CREATE TABLE IF NOT EXISTS public.platform_payment_methods (
  method text PRIMARY KEY CHECK (method IN ('till','paybill')),
  shortcode text NOT NULL,
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox','production')),
  encrypted_credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_payment_methods(method,shortcode,environment,encrypted_credentials)
SELECT CASE WHEN account_type='CustomerPayBillOnline' THEN 'paybill' ELSE 'till' END,
       shortcode,environment,encrypted_credentials
FROM public.platform_payment_config
WHERE id=1 AND shortcode IS NOT NULL AND encrypted_credentials <> '{}'::jsonb
ON CONFLICT(method) DO NOTHING;
