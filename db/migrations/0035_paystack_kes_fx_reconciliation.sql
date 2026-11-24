-- KES-only Paystack billing reconciliation and cached FX snapshots.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS original_usd_amount numeric(18,6),
  ADD COLUMN IF NOT EXISTS fx_rate_used numeric(18,8),
  ADD COLUMN IF NOT EXISTS charged_kes_amount numeric(18,2);

CREATE TABLE IF NOT EXISTS public.fx_rate_cache (
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  rate numeric(18,8) NOT NULL CHECK (rate > 0),
  source text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base_currency, quote_currency)
);
