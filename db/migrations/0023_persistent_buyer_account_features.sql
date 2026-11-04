-- Persistent buyer account features: follows, wishlist, marketing consent and closure requests.
CREATE TABLE IF NOT EXISTS public.buyer_shop_follows (
  buyer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  followed_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_user_id, followed_tenant_id)
);
CREATE INDEX IF NOT EXISTS buyer_shop_follows_tenant_idx ON public.buyer_shop_follows(followed_tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.buyer_wishlist_items (
  buyer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_user_id, tenant_id, product_id)
);
CREATE INDEX IF NOT EXISTS buyer_wishlist_tenant_idx ON public.buyer_wishlist_items(tenant_id, buyer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.buyer_newsletter_subscriptions (
  buyer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_user_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS buyer_newsletter_active_idx ON public.buyer_newsletter_subscriptions(tenant_id, consented_at DESC) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.buyer_account_closure_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_from_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','completed','rejected','cancelled')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_user_id)
);
CREATE INDEX IF NOT EXISTS buyer_account_closure_status_idx ON public.buyer_account_closure_requests(status, created_at DESC);
