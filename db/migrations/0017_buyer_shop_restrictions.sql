-- Tenant-local buyer restrictions controlled by platform administrators.
ALTER TABLE public.store_customers
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text;
