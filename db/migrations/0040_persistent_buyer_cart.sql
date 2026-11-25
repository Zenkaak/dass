-- Persistent server-side buyer shopping cart across devices and sessions.
CREATE TABLE IF NOT EXISTS public.buyer_cart_items (
  buyer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_user_id, tenant_id, product_id)
);
CREATE INDEX IF NOT EXISTS buyer_cart_tenant_user_idx ON public.buyer_cart_items(tenant_id, buyer_user_id, updated_at DESC);
