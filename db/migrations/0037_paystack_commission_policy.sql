-- Configurable DASMARKET commission for central Paystack seller subaccounts.
-- 5% is the approved launch default; 0-20% is allowed for future policy changes.
ALTER TABLE public.platform_paystack_config
  ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NOT NULL DEFAULT 5
    CHECK (commission_percent >= 0 AND commission_percent <= 20);
