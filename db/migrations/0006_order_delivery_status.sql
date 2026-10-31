-- Persist buyer-visible delivery progress independently from order/payment status.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending_delivery';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_updated_at timestamptz;

UPDATE public.orders
SET delivery_updated_at = COALESCE(delivery_updated_at, updated_at, created_at)
WHERE delivery_updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_delivery_status_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_status_check
      CHECK (delivery_status IN ('pending_delivery', 'in_transit', 'delivered'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_tenant_delivery_status_idx
  ON public.orders (tenant_id, delivery_status, updated_at DESC);
