-- Seller-managed storefront content, coupons and buyer shop/order complaints.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS privacy_policy text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS return_policy text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_policy text NOT NULL DEFAULT '';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0);

CREATE TABLE IF NOT EXISTS public.store_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
  minimum_order_minor bigint NOT NULL DEFAULT 0 CHECK (minimum_order_minor >= 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS store_coupons_public_idx ON public.store_coupons(tenant_id,is_active,expires_at);

CREATE TABLE IF NOT EXISTS public.shop_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid,
  buyer_phone text NOT NULL,
  buyer_name text NOT NULL,
  issue_type text NOT NULL CHECK (issue_type IN ('payment','delivery','product_quality','wrong_item','seller_communication','refund_return','shop_listing','other')),
  details text NOT NULL,
  payment_made boolean NOT NULL DEFAULT false,
  payment_amount_minor bigint,
  payment_reference text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_complaints_created_idx ON public.shop_complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS shop_complaints_tenant_idx ON public.shop_complaints(tenant_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.shop_complaint_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  complaint_id uuid REFERENCES public.shop_complaints(id) ON DELETE CASCADE,
  buyer_phone text NOT NULL,
  object_key text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  upload_status text NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending','ready')),
  scan_status text NOT NULL DEFAULT 'unscanned' CHECK (scan_status IN ('unscanned','clean','infected','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_complaint_attachments_tenant_idx ON public.shop_complaint_attachments(tenant_id,complaint_id);

ALTER TABLE public.store_coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.store_coupons;
CREATE POLICY tenant_isolation ON public.store_coupons USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
ALTER TABLE public.shop_complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.shop_complaints;
CREATE POLICY tenant_isolation ON public.shop_complaints USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
ALTER TABLE public.shop_complaint_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.shop_complaint_attachments;
CREATE POLICY tenant_isolation ON public.shop_complaint_attachments USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
