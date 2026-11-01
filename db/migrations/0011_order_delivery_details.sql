-- Persist buyer-selected fulfilment method and the complete delivery destination on each order.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS delivery_county text,
  ADD COLUMN IF NOT EXISTS delivery_sub_county text,
  ADD COLUMN IF NOT EXISTS delivery_estate text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_directions text,
  ADD COLUMN IF NOT EXISTS pickup_station text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_delivery_method_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_method_check
      CHECK (delivery_method IN ('home', 'pickup'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_tenant_delivery_method_idx
  ON public.orders (tenant_id, delivery_method, created_at DESC);
