-- Buyer report tracking, time-bound moderation, and durable buyer notifications.
ALTER TABLE public.store_customers
  ADD COLUMN IF NOT EXISTS banned_until timestamptz;
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ban_expires_at timestamptz;
ALTER TABLE public.shop_complaints
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.buyer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  buyer_phone text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  complaint_id uuid REFERENCES public.shop_complaints(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS buyer_notifications_inbox_idx
  ON public.buyer_notifications(tenant_id,buyer_phone,created_at DESC);

ALTER TABLE public.buyer_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.buyer_notifications;
CREATE POLICY tenant_isolation ON public.buyer_notifications
USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
