ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS cash_on_delivery_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cash_on_pickup_enabled boolean NOT NULL DEFAULT false;
